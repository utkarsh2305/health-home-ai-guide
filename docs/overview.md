# Phlox Overview

## What is Phlox?

Phlox is an open-source, local-first clinical tool with the following features:

- **Patient Records:** Basic database for patient demographics and history
- **Medical Transcription:** Uses Whisper + Ollama to convert audio to structured notes
- **Task Management:** Extracts action items from clinical notes
- **RSS Reader:** Aggregates and summarizes medical news using LLMs
- **AI Assistant:** RAG system using ChromaDB for case discussions with reference to medical documents. Reasoning model interface.

## Design

- Runs locally on standard hardware
- Customizable templates and LLM settings
- All data stays on your machine

## Philosophy

The core idea is to use LLMs to expand clinical consideration sets by:
- Surfacing relevant information from guidelines and journals
- Automating documentation tasks
- Supporting differential diagnosis discussions

## Important Caveats

- LLMs can hallucinate plausible but incorrect information
- Verification against primary medical sources is mandatory
- Clinical judgment remains supreme
- Models can lead reasoning down convincing but incorrect paths

This is an experimental tool designed to assist, not replace, clinical decision-making.
