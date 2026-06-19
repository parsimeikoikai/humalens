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

| Method | Endpoint | Description |
|---|---|---|
| POST | `/documents/upload` | Upload and index document |
| POST | `/ingest` | Generic ingestion pipeline |
| GET | `/query/stream` | Ask a question (streaming RAG response) |

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


