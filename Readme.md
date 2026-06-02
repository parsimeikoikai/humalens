# ReliefLens 

AI-powered search for humanitarian reports and crisis briefs. Ask questions across thousands of documents sourced from ReliefWeb or upload your own PDFs.

---

## What it does

- **Search by question** — ask natural language questions like *"How many people were displaced in DRC in 2024?"*
- **Two ingestion sources** — fetch reports directly from the ReliefWeb API or upload your own PDF
- **Streaming answers** — responses stream back in real time via SSE
- **Persistent vector storage** — embeddings stored in ChromaDB so your data survives restarts

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
git clone https://github.com/yourname/relieflens.git
cd relieflens

# 2. Add your API key
cp .env.example .env
# edit .env and add your ANTHROPIC_API_KEY

# 3. Start everything
docker-compose up --build
```

Then open [http://localhost:3000](http://localhost:3000)

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ingest/api` | Fetch and index reports from ReliefWeb |
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

---

## Data sources

Reports are sourced from [ReliefWeb](https://reliefweb.int) via their public API. No authentication required.

