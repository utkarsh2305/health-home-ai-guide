# RAG Chat System

Phlox includes two ways to chat with documents and clinical notes using LLMs:

## Document Chat
Chat with uploaded medical documents and guidelines:

1. Upload PDFs to collections in the Document Explorer
2. Ask questions about the documents
3. Get responses with citations to specific document sources

## Case Chat
Discuss patient cases with the LLM:

1. Click chat icon in patient view
2. Ask questions about the current case
3. LLM references the clinical note content in responses
4. The LLM will also make a tool call to the RAG database if required
