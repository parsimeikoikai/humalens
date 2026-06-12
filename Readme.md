# Humalens 


AI-powered search for humanitarian reports and crisis briefs. Ask questions across thousands of documents sourced from ReliefWeb,ODP ,etc or upload your own PDFs.

---

## What it does

- **Search by question** — ask natural language questions like *"How many people were displaced in DRC in 2024?"*
- **Flexible ingestion** — fetch reports from the ReliefWeb API, upload your own PDFs, or ingest TXT and DOCX files
- **Streaming answers** — responses stream back in real time via SSE
- **Persistent vector storage** — embeddings stored in ChromaDB so your data survives restarts
- **Source agnostic** — not tied to any single data provider; bring your own documents from any humanitarian source

---

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | Next.js |
| Backend | FastAPI |
| Vector DB | ChromaDB |
| Embeddings | sentence-transformers |
| LLM | Anthropic Claude API |
| Infrastructure | Docker + Docker Compose |

---

## Getting started

### Prerequisites
- Docker + Docker Compose
- Anthropic API key

### Run the project

```bash
# 1. Clone the repo
git clone https://github.com/parsimeikoikai/humalens
cd humalens


# 2. Add your API key
cp .env.example .env
# edit .env and add your OPENAI_API_KEY

# 3. Start everything
docker-compose up --build
```

Then open [http://localhost:3000](http://localhost:3000)

---

## Live demo

Open the deployed UI: https://relieflens-dev-ui.vercel.app/



# Backend 
 python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ingest/api` | Fetch and index reports  |
| POST | `/ingest/pdf` | Upload and index a PDF |
| GET | `/query/stream` | Ask a question, stream the answer |

---

## Project structure

```
relieflens/
├── frontend/          # Next.js app
├── backend/           # FastAPI app
│   ├── routers/       # ingest + query routes
│   └── services/      # ReliefWeb, PDF loader, embedder, ChromaDB
├── docker-compose.yml
└── .env
```



