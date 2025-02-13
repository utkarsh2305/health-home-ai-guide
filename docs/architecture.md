# Architecture Overview

```mermaid
graph LR
    %% Front-end and Back-end reside within the Phlox container
    subgraph Phlox[Phlox Application Container]
        A[Frontend Layer]
        B[Backend Layer]
        F[ChromaDB Client]
        A --- B
        B --- F
    end

    %% Both databases are persistent on the Host
    subgraph Host[Host Storage]
        direction TB
        C[(SQLite)]
        G[(Chroma)]
    end

    %% External services are aligned separately
    subgraph External[External Services]
        direction LR
        D[Ollama]
        E[Whisper]
    end

    %% Common connection point using empty node
    B --- recEmpty[ ]:::empty
    recEmpty --- E
    recEmpty --- D
    B --- C
    F --- G
    F --- D

    classDef empty width:0px
    style Phlox fill:#ddd,stroke:#333,stroke-width:4px
    style Host fill:#edd,stroke:#333,stroke-width:2px
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#fbb,stroke:#333,stroke-width:1px
    style D fill:#bfb,stroke:#333,stroke-width:2px
    style E fill:#bfb,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#333,stroke-width:2px
    style G fill:#fbb,stroke:#333,stroke-width:1px
```

## Components

- **Frontend**: React/Chakra UI
- **Backend**: FastAPI
- **Database**: SQLite (encrypted via `DB_ENCRYPTION_KEY`)
- **LLM**: Ollama
- **Transcription**: Whisper-compatible endpoint
- **RAG**: ChromaDB for document embeddings

## Data Persistence
SQLite and ChromaDB data persisted on host via volume mounts (`./data:/usr/src/app/data`)

## Deployment
Containerized using Docker/Podman

Make it a bit longer please

# Architecture Overview

```mermaid
graph LR
    subgraph Phlox[Phlox Application Container]
        A[Frontend Layer]
        B[Backend Layer]
        F[ChromaDB Client]
        A --- B
        B --- F
    end

    subgraph Host[Host Storage]
        direction TB
        C[(SQLite)]
        G[(Chroma)]
    end

    subgraph External[External Services]
        direction LR
        D[Ollama]
        E[Whisper]
    end

    B --- recEmpty[ ]:::empty
    recEmpty --- E
    recEmpty --- D
    B --- C
    F --- G
    F --- D

    classDef empty width:0px
    style Phlox fill:#ddd,stroke:#333,stroke-width:4px
    style Host fill:#edd,stroke:#333,stroke-width:2px
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#fbb,stroke:#333,stroke-width:1px
    style D fill:#bfb,stroke:#333,stroke-width:2px
    style E fill:#bfb,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#333,stroke-width:2px
    style G fill:#fbb,stroke:#333,stroke-width:1px
```

## Components

### Frontend (React/Chakra UI)
- User interface and interactions
- API calls to backend
- Audio recording and playback

### Backend (FastAPI)
- REST API endpoints
- Core application logic
- Integrates with Ollama, Whisper, and ChromaDB
- Database operations

### Database (SQLite)
- Local file-based storage
- Encrypted via `DB_ENCRYPTION_KEY`
- Stores:
  - Patient records
  - Clinical notes
  - Templates
  - Settings

### LLM (Ollama)
- Local model inference
- Handles:
  - Note generation
  - Clinical summaries
  - RSS processing
  - RAG queries

### Transcription (Whisper)
- Compatible with any Whisper endpoint
- Converts audio to text
- Configurable service selection

### RAG (ChromaDB)
- Vector database for document storage
- Requires a tool calling model to be selected.
- Enables context-aware queries
- Stores medical document embeddings

## Data Persistence
- SQLite database and ChromaDB data persisted on host
- Volume mount: `./data:/usr/src/app/data`
- Data preserved across container restarts
