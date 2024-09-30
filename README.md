# Scribe

Welcome to Scribe, an open source patient management/AI transcription solution that I've developed over the past few months with heavy input from various LLMs. There are a few really excellent and mature commercial solutions available for AI medical transcription, but I'm a cheapskate so I thought I'd try rolling my own.

![Bloodworks Scribe Logo](/public/readme_logo.webp)

## What is it?

Essentially, it's a mix of:

- Basic patient record database
- "AI-powered" Medical transcriptionist (or at least, my attempt at building one)
- Task manager/todo list for clinics
- Simple RSS reader with LLM generated summaries for quick review
- Some cool AI stuff with RAG which was mostly just to see if it could be done.

Most importantly, it all runs locally on commodity hardware! I use Ollama for inference and Whisper for transcription. To keep things local and easy I suggest spinning up a [Faster Whisper Server](https://github.com/fedirz/faster-whisper-server) instance for transcription. To record from the browser, you'll need a secure context (HTTPS). For local tinkering, most browsers allow exceptions for localhost.

It's worth mentioning that the format of the notes it produces is based on my personal note-taking style and it's mostly hardcoded in. However, you can adjust the LLM prompts and generation options in the UI to tailor the output somewhat.

## Features

### Medical Transcription and note summarisation

Essentially, the browser sends an audio blob to a Whisper backend of your choice for processing. The raw transcript is then fed through an Ollama backend several times in a quasi-CoT fashion to deliver a bullet point summarisation of the clinical encounter, and a numbered list of the items from the plan. I make heavy use of stop tokens and guided generation. It's not very sophisticated but it gets the job done well enough that it's become my daily driver in the clinic. Simply copy the final note into your EMR and then save it into the local SQLite database.

The patient's demographics, "Primary history" (what you see them for), and additional history can be autofilled from the database by searching the URN in subsequent encounters.

### Task manager

The plan from the clinic note is parsed into a JSON list which can then be manipulated from a few different pages. I've found this really useful for keeping on top of jobs from clinic. As a nice little touch here I utilize a smaller model (configurable in the setting page) to generate a 1 sentence summary of the encounter.

### Correspondence generation

I've implemented a 1-click solution to generate a letter intended for GPs based on the clinical note. It can be a bit verbose and definitely needs to be checked and refined before sending off.

### Decision-support/RAG

You can discuss each case with your primary model and upload relevant documents to the Chroma-powered RAG backend for it to peruse. Simply click the chat button on a patient encounter of interest. This is a bit janky/slow at present and any output here should absolutely be verified using primary sources as hallucinations abound (particularly with smaller models).

### Dashboard with simple RSS reader using LLM summaries

The landing page allows you to subscribe to RSS feeds of your choice. The primary model will then be used to generate quick summaries of each article for your reading pleasure. Useful for trying to keep on top of the latest PubMed trending articles in your field.

## Stack

- Frontend: React/Chakra UI
- Backend: FastAPI
- Database: SQLite
- Containerization: Docker/Podman
- LLM Backend/Inference Engine: [Ollama](https://github.com/ollama/ollama)
- Transcription: Any Whisper compatible endpoint
- RAG: [Chroma](https://github.com/chroma-core/chroma)
- Color palette: [Rosé Pine](https://github.com/rose-pine/rose-pine-theme)

## Quick start

If you're familiar with Python, React, and working with LLMs, you'll might find the project interesting. Feel free to clone the repo and examine the code:

```
git clone https://github.com/jfgonsalves/scribe.git
cd scribe
```

For those of you who are comfortable with Docker/Podman and understand the risks, you can build the image:

```
podman build -t scribe:latest .
```

## Usage warning

This project is a real mess. The code is sloppy, the paradigms are half-arsed, and I've mixed concerns like I'm tossing a salad. There's probably more duplicated boilerplate than actual functioning code, thanks to my liberal use of LLMs as coding assistants.

This is very much a personal project and learning experience. If you're not sure how to run this or don't fully understand the limitations of current LLM technology in medicine, please don't use it in a clinical setting. The chat and RAG features, while cool, are unreliable and prone to hallucination. Especially if you use smaller models you will likely get awful treatment suggestions.

The smaller models do an okay job at summarizing transcripts, but output is better with larger models (I like Llama 3.1 70B; Q4 is fine). ALWAYS verify the output. Even with large models you will encounter inconsistencies.

Finally, expose this to the open internet at your own risk. There is no user authentication or backend encryption; you should definitely run this behind some kind of reverse proxy and auth solution. You've been warned!

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
