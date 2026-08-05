# Humalens

A multi-tenant AI-powered retrieval system that lets users ask questions over documents and get real-time, context-aware answers.

Users can query across ingested data sources or upload their own files (PDF, DOCX, TXT) to build private knowledge bases.

---

## What it does

- **Multi-tenant document search** — each user has an isolated knowledge base
- **Natural language Q&A** — ask questions over uploaded or ingested documents
- **Flexible ingestion**
  - Upload your own files (PDF, DOCX, TXT)
  - API-based ingestion pipelines
- **Streaming responses** — real-time answer generation via SSE
- **Persistent vector storage** — embeddings stored in ChromaDB
- **Source-aware retrieval** — responses grounded in retrieved documents
- **Scalable architecture** — separation of metadata (PostgreSQL) and embeddings (ChromaDB)

---

## Tech stack

| Layer | Tool |
|------|------|
| Frontend | Next.js |
| Backend | FastAPI |
| Database (metadata) | PostgreSQL |
| Vector Database | ChromaDB |
| Embeddings | sentence-transformers |
| LLM | Anthropic / OpenAI |
| Infrastructure | Docker + Docker Compose |
| Migrations | SQLAlchemy + Alembic |

---

## Architecture

```bash
docker-compose up --build
```

Then open: [http://localhost:3000](http://localhost:3000)

---

## Live demo

Open the deployed UI: https://relieflens-dev-ui.vercel.app/

---

## Backend (local run)

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## API endpoints

All endpoints below except `/auth/register` and `/auth/login` require a
`Authorization: Bearer <token>` header. A user can only ever see, query or
modify their own knowledge bases.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create an account (returns a JWT) |
| POST | `/auth/login` | Sign in (returns a JWT) |
| GET | `/auth/me` | Current user — used to restore a session from a stored token |
| GET | `/knowledge-bases` | List your knowledge bases with document stats |
| POST | `/knowledge-bases` | Create a knowledge base |
| GET | `/knowledge-bases/{id}` | Fetch a single knowledge base |
| PATCH | `/knowledge-bases/{id}` | Rename, re-tag or change visibility |
| DELETE | `/knowledge-bases/{id}` | Delete it, its documents, files and embeddings |
| GET | `/knowledge-bases/{id}/documents` | List documents in a knowledge base |
| POST | `/knowledge-bases/{id}/documents` | Upload and index a document (PDF/DOCX/TXT, ≤50MB) |
| DELETE | `/knowledge-bases/{id}/documents/{doc_id}` | Delete a document and its chunks |
| POST | `/ingest/api?knowledge_base_id=` | Ingest raw text into a knowledge base |
| POST | `/query/stream` | Ask a question (streaming RAG response) |
| POST | `/query/results` | Retrieve matching chunks without generating an answer |

Retrieval is scoped by `owner_id` on every chunk, so queries only ever reach
the caller's own documents. Pass `knowledge_base_id` in the query body to
narrow a search to a single collection.

---

## Project structure

```text
humalens/
├── frontend/              # Next.js UI
├── backend/
│   ├── app/
│   │   ├── models/       # User, Document, etc.
│   │   ├── routers/
│   │   ├── services/     # ingestion, embeddings, retrieval
│   │   ├── database.py   # PostgreSQL setup
│   │   └── auth/         # JWT auth (next step)
│   ├── migrations/       # Alembic migrations
├── docker-compose.yml
└── .env
```


