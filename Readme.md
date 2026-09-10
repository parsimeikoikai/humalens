# Humalens

A multi-tenant document Q&A platform. Users upload files (PDF, DOCX, TXT)
into private knowledge bases, ask questions in plain language, and get
streamed answers grounded in — and cited from — their own documents.

---

## Features

- **Private, multi-tenant knowledge bases** — every chunk is tagged with its
  owner, and retrieval is always scoped to the caller. One user can never
  see, query or modify another's documents.
- **Document ingestion** — upload PDF, DOCX and TXT files (up to 50MB), or
  push raw text straight in over the API.
- **Hybrid retrieval** — dense embedding search and BM25 keyword search,
  merged with reciprocal rank fusion, so both paraphrases and exact terms
  (IDs, acronyms, proper nouns) are found.
- **HyDE query expansion** — the question is expanded into a hypothetical
  answer passage before the embedding search, which tends to match real
  document text more closely than a short question does. Falls back to the
  raw question if generation fails.
- **Streaming, cited answers** — responses stream over Server-Sent Events,
  with the source documents and page numbers delivered before the first
  token.
- **Filtering** — narrow a search to one knowledge base, or to document
  categories you set at upload time.
- **Knowledge base management** — create, rename, tag, and delete knowledge
  bases and the documents inside them.

---

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 16, React 18, Redux Toolkit (RTK Query), Tailwind CSS |
| Backend | FastAPI |
| Metadata database | PostgreSQL (SQLAlchemy + Alembic) |
| Vector database | ChromaDB |
| Keyword search | BM25 (`rank_bm25`) |
| Embeddings | fastembed — `BAAI/bge-small-en-v1.5` (ONNX, no PyTorch) |
| LLM | OpenRouter or any OpenAI-compatible API, or a local Ollama model |
| Auth | JWT bearer tokens, PBKDF2-SHA256 password hashing |
| Infrastructure | Docker Compose |

---

## Quick start (Docker)

**1. Configure the LLM.** Create a `.env` file in the project root —
docker-compose reads it to fill in the backend's LLM settings:

```bash
# OpenRouter / OpenAI-compatible
LLM_PROVIDER=openrouter
LLM_API_KEY=sk-...
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=gpt-4o-mini

# ...or a local Ollama model instead
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
# OLLAMA_MODEL=qwen3:8b
```

**2. Start the stack:**

```bash
docker compose up --build
```

**3. Create the database tables.** This isn't run automatically, so do it
once on a fresh database (and again after pulling new migrations):

```bash
docker compose exec backend alembic upgrade head
```

**4. Open the app** at [http://localhost:3050](http://localhost:3050).

| Service | URL |
|---|---|
| Frontend | http://localhost:3050 |
| API | http://localhost:9000 |
| Interactive API docs | http://localhost:9000/docs |
| ChromaDB | http://localhost:8002 |
| PostgreSQL | localhost:5432 (`postgres` / `postgres`, database `ragdb`) |

On first startup the backend downloads the embedding model (~130MB) before
it begins serving requests; it is cached in a Docker volume afterwards.

---

## Configuration

The backend reads its settings from the environment, falling back to
`backend/.env`. Copy `backend/.env.example` for a fully commented list.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET_KEY` | yes, in production | Signs session tokens — generate a random value |
| `ENVIRONMENT` | | `development` (default) or `production` |
| `CORS_ORIGINS` | | Browser origins allowed to call the API (comma-separated) |
| `ADMIN_EMAILS` | | Accounts allowed to read `/admin/*` (comma-separated) |
| `LLM_PROVIDER` | | `openrouter` (default) or `ollama` |
| `CHROMA_HOST` | | Chroma server host; leave empty to store embeddings on disk |

With `ENVIRONMENT` set to anything other than `development`/`dev`/`local`/
`test`, the app **refuses to start** while `JWT_SECRET_KEY` is still the
built-in default, rather than coming up with forgeable session tokens.
Generate one with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

The frontend has one setting, `NEXT_PUBLIC_API_URL` (default
`http://localhost:9000`).

---

## Local development (without Docker)

You need a running PostgreSQL instance. Chroma is optional — with
`CHROMA_HOST` empty, embeddings are stored on disk at `CHROMA_PATH`.

**Backend:**

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env              # then fill it in

# Alembic reads DATABASE_URL from the shell, not from .env
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ragdb
alembic upgrade head

python -m uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev                       # http://localhost:3050
```

---

## Tests

```bash
cd backend
python -m pytest
```

Covers authentication, tenant isolation, the public/authenticated endpoint
split, request validation and SSE framing. The embedding model, vector store
and LLM are stubbed, so the suite needs no database server, model download
or API key.

---

## API endpoints

Everything except `/health`, `/stats` and the `/auth/register`,
`/auth/login` and `/auth/forgot-password` endpoints requires an
`Authorization: Bearer <token>` header.

`/admin/*` reads across every tenant and is restricted to the accounts listed
in `ADMIN_EMAILS`; with that setting empty, nobody can reach it.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Liveness probe |
| GET | `/stats` | Public platform counters (counts only — no tenant data) |
| POST | `/auth/register` | Create an account (returns a JWT) |
| POST | `/auth/login` | Sign in (returns a JWT) |
| GET | `/auth/me` | Current user — used to restore a session from a stored token |
| POST | `/auth/forgot-password` | Placeholder — see [Known limitations](#known-limitations) |
| GET | `/knowledge-bases` | List your knowledge bases with document stats |
| POST | `/knowledge-bases` | Create a knowledge base |
| GET | `/knowledge-bases/{id}` | Fetch a single knowledge base |
| PATCH | `/knowledge-bases/{id}` | Rename, re-describe or re-tag it |
| DELETE | `/knowledge-bases/{id}` | Delete it, its documents, files and embeddings |
| GET | `/knowledge-bases/{id}/documents` | List documents in a knowledge base |
| POST | `/knowledge-bases/{id}/documents` | Upload and index a document (PDF/DOCX/TXT, ≤50MB) |
| DELETE | `/knowledge-bases/{id}/documents/{doc_id}` | Delete a document and its chunks |
| POST | `/ingest/api?knowledge_base_id=` | Ingest raw text into a knowledge base |
| GET | `/ingest/count` | Number of indexed chunks you own |
| POST | `/query/stream` | Ask a question — streaming answer over SSE |
| POST | `/query/results` | Retrieve matching chunks without generating an answer |
| GET | `/query/categories` | Category values you can filter a search by |
| GET | `/admin/overview` | Cross-tenant operator view — requires `ADMIN_EMAILS` |

A query body looks like:

```json
{
  "question": "What is the Q3 budget?",
  "top_k": 5,
  "knowledge_base_id": 12,
  "categories": ["Finance"]
}
```

`top_k` (1–20), `knowledge_base_id` and `categories` are optional.

`/query/stream` emits these SSE events, in order: `retrieved_documents`
(JSON array of matched chunks), `sources` (citation labels), a series of
`message` events (answer tokens), then `done` — or `error` if generation
fails partway.

---

## Project structure

```text
humalens/
├── frontend/
│   └── app/
│       ├── components/      # UI — search, results, knowledge bases, modals
│       ├── lib/             # API base URL, session/token handling
│       └── services/api/    # RTK Query API clients
├── backend/
│   ├── app/
│   │   ├── core/            # Settings and startup checks
│   │   ├── models/          # SQLAlchemy models + request/response schemas
│   │   ├── routers/         # auth, knowledge_base, ingest, query, stats, admin
│   │   ├── services/
│   │   │   ├── rag/         # Retrieval, hybrid search, HyDE, context building
│   │   │   ├── llm/         # OpenRouter and Ollama providers
│   │   │   ├── embedder.py, vectorstore.py, docs_processor.py
│   │   │   └── auth_tokens.py, password.py
│   │   ├── dependencies.py  # DI wiring, current-user and admin guards
│   │   ├── database.py      # SQLAlchemy engine and session
│   │   └── main.py          # App entry point
│   ├── migrations/          # Alembic migrations
│   └── tests/
└── docker-compose.yml
```

---

## Known limitations

- **Password reset is not implemented.** `/auth/forgot-password` returns a
  confirmation message but sends no email.
- **Knowledge base visibility is a label only.** A knowledge base can be
  marked public, but retrieval is always scoped to its owner — nothing is
  shared with other users.
- **Keyword search rebuilds its index per query.** BM25 loads all of the
  caller's chunks on every search. Fine at the scale of a single team's
  documents; a large corpus would need a persistent keyword index.
- **Uploads are indexed synchronously.** The upload request returns once the
  document is parsed, chunked and embedded, so very large files take a while.
- **Migrations aren't applied on startup** — run `alembic upgrade head`
  after deploying.
