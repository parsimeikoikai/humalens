

import os
import uuid
from datetime import datetime,timezone
import logging
from typing import List, Dict
import pypdf
from docx import Document 



logger = logging.getLogger(__name__)


class DocsProcessor:
    """
    Document processor responsible for:
    - Loading documents(PDF, Txt, Docx)
    - Extracting text  
    - Chunking
    - Attaching metadata
    """

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    # --------------------------------------------------
    # PDF Loader
    # --------------------------------------------------

    def load_pdf(self, file_path: str) -> List[Dict]:
        pages = []

        try:
            with open(file_path, "rb") as file:
                reader = pypdf.PdfReader(file)

                for page_num, page in enumerate(reader.pages):
                    text = page.extract_text()

                    if text:
                        pages.append({
                            "text": text,
                            "page": page_num + 1
                        })

        except Exception as e:
            logger.error(f"PDF load error: {file_path} | {str(e)}")

        return pages

    # --------------------------------------------------
    # TXT Loader
    # --------------------------------------------------

    def load_txt(self, file_path: str) -> List[Dict]:

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()

            return [{"text": text, "page": 1}]

        except Exception as e:
            logger.error(f"TXT load error: {file_path} | {str(e)}")
            return []

    # --------------------------------------------------
    # DOCX Loader
    # --------------------------------------------------

    def load_docx(self, file_path: str) -> List[Dict]:

        try:
            document = Document(file_path)

            full_text = []
            for paragraph in document.paragraphs:
                full_text.append(paragraph.text)

            text = "\n".join(full_text)

            return [{"text": text, "page": 1}]

        except Exception as e:
            logger.error(f"DOCX load error: {file_path} | {str(e)}")
            return []
        
        #Limitation: This loader treats the entire DOCX as a single page. 
        # For more complex documents with multiple sections, further parsing may be needed.
        #Also skips tables, images, and other non-text elements. Future enhancements could include handling these components.

    # --------------------------------------------------
    # Text Cleaning
    # --------------------------------------------------

    def clean_text(self, text: str) -> str:

        text = text.replace("\n\n", "\n")
        text = text.replace("\t", " ")
        text = " ".join(text.split())

        return text
    # One trade of to be aware of is that y the end, the text is one long clean string with no newlines at all. That's fine for embedding and retrieval, 
    # but it's worth knowing the text loses its original structure by this point.

    # --------------------------------------------------
    # Chunking
    # --------------------------------------------------

    def chunk_text(self, text: str) -> List[str]:
        chunks = []
        text_length = len(text)
        start = 0

        while start < text_length:
            end = start + self.chunk_size
            chunk = text[start:end]

            if end < text_length:
                break_point = max(
                    chunk.rfind("."),
                    chunk.rfind("\n"),
                )

                if break_point > self.chunk_size * 0.4:
                    end = start + break_point + 1
                    chunk = text[start:end]

            if chunk.strip():
                chunks.append(chunk.strip())
            start += self.chunk_size - self.chunk_overlap

        return chunks
    
    # --------------------------------------------------
    # Load Documents
    # --------------------------------------------------

    def load_documents(self, directory: str) -> List[Dict]:

        documents = []

        if not os.path.exists(directory):
            logger.warning(f"Directory does not exist: {directory}")
            return documents

        for filename in os.listdir(directory):

            path = os.path.join(directory, filename)

            if filename.endswith(".pdf"):
                pages = self.load_pdf(path)

            elif filename.endswith(".txt"):
                pages = self.load_txt(path)

            elif filename.endswith(".docx"):
                pages = self.load_docx(path)

            else:
                continue

            for page in pages:
                documents.append({
                    "text": self.clean_text(page["text"]),
                    "page": page["page"],
                    "source": filename
                })

            logger.info(f"Loaded document: {filename}")

        return documents

    # --------------------------------------------------
    # Process Documents
    # --------------------------------------------------

    def process_documents(self, documents: List[Dict]) -> List[Dict]:

        processed_chunks = []

        for doc in documents:

            doc_id = str(uuid.uuid4())

            chunks = self.chunk_text(doc["text"])

            for i, chunk in enumerate(chunks):

                processed_chunks.append({

                    "content": chunk,

                    "source": doc["source"],

                    "metadata": {
                        "doc_id": doc_id,
                        "chunk_id": i,
                        "page": doc["page"],
                         "timestamp": datetime.now(timezone.utc).isoformat() 
                    }

                })

        logger.info(
            f"Created {len(processed_chunks)} chunks from {len(documents)} pages"
        )

        return processed_chunks