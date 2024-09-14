# Bloodworks Scribe

Hey there! 👋 Welcome to Bloodworks Scribe, my personal playground for medical transcription and basic patient management. This is a collab with Sonnet 3.5, GPT 4o, Deepseek, and whatever other LLM I could use to make a usable frontend for transcription that I can use day to day. There are a few really excellent and mature commercial solutions available, but I'm a cheapskate so I thought I'd try rolling my own.

![Bloodworks Scribe Logo](/public/logo.webp)

## What's This All About?

Essentially, it's a mix of:

- Basic patient record database (because who doesn't love a good spreadsheet?)
- "AI-powered" Medical transcriptionist (or at least, my attempt at building one)
- Task manager/todo list for clinics
- Some cool AI stuff with RAG which was mostly just to see if it could be done.

The best part? It all runs locally on commodity hardware! I use Ollama for inference and Whisper for transcription. To keep things local and easy I suggest spinning up a local [Faster Whisper Server](https://github.com/fedirz/faster-whisper-server) instance for transcription.To use the microphone feature, you'll need a secure context (HTTPS). For local tinkering, most browsers allow exceptions for localhost.

It's worth mentioning that the format of the notes it produces is based on my personal note-taking style and it's mostly hardcoded in. However, you can adjust the LLM prompts and generation options in the UI to tailor the output somewhat.

## Fair Warning ⚠️

This is very much a personal project and learning experience. If you're not sure how to run this or don't fully understand the limitations of current LLM technology in medicine, please don't use it in a clinical setting. The chat and RAG features, while cool, are unreliable and prone to hallucination. They are certainly not ready for prime time in healthcare. Especially if you use smaller models you will likely get awful treatment suggestions.

The smaller models do an okay job at summarizing transcripts, but output is better with larger models (I like Llama 3.1 70B; Q4 is fine). ALWAYS verify the output. Even with large models you will encounter inconsistencies.

## Stack

- Frontend: React/Chakra UI
- Backend: FastAPI
- Database: SQLite
- Containerization: Docker/Podman (for when I pretend to be a DevOps engineer)
- LLM Backend/Inference Engine: [Ollama](https://github.com/ollama/ollama) (an easy-to-use wrapper for llama.cpp)
- Transcription: Any Whisper compatible endpoint
- RAG: [Chroma](https://github.com/chroma-core/chroma)

## Quick start

If you're familiar with Python, React, and working with LLMs, you'll might find the project interesting. Feel free to clone the repo and examine the code:

```
git clone https://github.com/jfgonsalves/scribe.git
cd scribe
```

For those of you who are comfortable with Docker/Podman and understand the risks, you can build the image:

```
podman build -t bloodworks-scribe:latest .
```

Just remember, this is more of a "look, don't touch" kind of project when it comes to real patient data or medical decisions. If you do decide to run it, keep it strictly for personal learning or experimentation.

## A Note from the Creator

This project is a real mess. The code is sloppy, the paradigms are half-arsed, and I've mixed concerns like I'm tossing a salad. There's probably more duplicated boilerplate than actual functioning code, thanks to my liberal use of LLMs as coding assistants. It isn't remotely ready for any serious use but it's been an absolute blast to work and has been a great learning experience!
