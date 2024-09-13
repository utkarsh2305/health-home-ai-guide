import fitz  # PyMuPDF
from .semantic_chunker import ClusterSemanticChunker
import chromadb
from chromadb.config import Settings
from chromadb.utils.embedding_functions import OllamaEmbeddingFunction
import re
import os
from ollama import Client as ollamaClient
from server.database.config import config_manager

# Initialize ConfigManager
config = config_manager.get_config()
prompts = config_manager.get_prompts_and_options()


# Function to process all PDFs in a given directory
def process_pdfs_in_directory(directory_path):
    for filename in os.listdir(directory_path):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(directory_path, filename)
            process_single_pdf(pdf_path)


def extract_pdf_information(pdf_path):
    global extracted_text_store
    extracted_text_store = None
    filename = os.path.basename(pdf_path)
    extracted_text = extract_text_from_pdf(pdf_path)
    extracted_text_store = extracted_text

    collections = chroma_client.list_collections()
    collection_names = [collection.name for collection in collections]
    collection_names_string = ", ".join(collection_names)

    words = extracted_text.split()
    sample_text = " ".join(words[:500])

    disease_question_options = {
        "temperature": 0,
        "num_ctx": 2048,
        "stop": [".", "(", "\n", "/"],
    }

    disease_question = client.chat(
        model=config["SECONDARY_MODEL"],
        messages=[
            {
                "role": "system",
                "content": prompts["prompts"]["chat"]["system"],
            },
            {
                "role": "user",
                "content": f"{sample_text}\n\nIs the above block of specifically addressing any of the following list of diseases? {collection_names_string}\nAnswer Yes or No.",
            },
        ],
        options=disease_question_options,
    )

    disease_answer = disease_question["message"]["content"].strip()
    sanitized_disease_answer = disease_answer.lower().replace(" ", "_")
    print(sanitized_disease_answer)
    if sanitized_disease_answer == "yes":
        disease_choice = client.chat(
            model=config["SECONDARY_MODEL"],
            messages=[
                {
                    "role": "system",
                    "content": prompts["prompts"]["chat"]["system"],
                },
                {
                    "role": "user",
                    "content": f"{sample_text}\n\nIs the above block of text *primaryily* related to any of the following list of diseases? {collection_names_string}\nAnswer Yes or No.",
                },
                {
                    "role": "assistant",
                    "content": "Yes",
                },
                {
                    "role": "user",
                    "content": f"Here is the list again:\n{collection_names_string}\nRespond only with the disease name as it appears in that list.",
                },
                {"role": "assistant", "content": "The disease is:"},
            ],
            options=disease_question_options,
        )
        disease_choice_response = disease_choice["message"]["content"].strip()

        disease_name = disease_choice_response.lower().replace(" ", "_")
    else:
        disease_choice = client.chat(
            model=config["SECONDARY_MODEL"],
            messages=[
                {
                    "role": "system",
                    "content": prompts["prompts"]["chat"]["system"],
                },
                {
                    "role": "user",
                    "content": f"{sample_text}\n\nIs the above block of text related to any of the following list of diseases? {collection_names_string}\nAnswer Yes or No.",
                },
                {
                    "role": "assistant",
                    "content": "No",
                },
                {
                    "role": "user",
                    "content": f"{sample_text}\n\nWhat is the disease that the above block of text is referring to? Answer only with the name of the disease in American English, do not use acronyms. If there is more than one disease, then respond with only the name of the main disease of the text.",
                },
                {"role": "assistant", "content": "The disease is:"},
            ],
            options=disease_question_options,
        )
        disease_choice_response = disease_choice["message"]["content"].strip()
        disease_name = disease_choice_response.lower().replace(" ", "_")

    focus_area_response = client.chat(
        model=config["SECONDARY_MODEL"],
        messages=[
            {
                "role": "system",
                "content": prompts["prompts"]["chat"]["system"],
            },
            {
                "role": "user",
                "content": f"{sample_text}\n\nIs the block of text focused on diagnosis, treatment, epidemiology, pathophysiology, prognosis, clinical features, prevention, or miscellaneous? (answer only with one word)",
            },
        ],
        options=disease_question_options,
    )
    focus_area = (
        focus_area_response["message"]["content"]
        .strip()
        .lower()
        .replace(" ", "_")
    )

    # Document source selection (modified)
    existing_sources = list_sources_from_all_collections()
    existing_sources_string = ", ".join(existing_sources)

    document_source_question = client.chat(
        model=config["SECONDARY_MODEL"],
        messages=[
            {
                "role": "system",
                "content": prompts["prompts"]["chat"]["system"],
            },
            {
                "role": "user",
                "content": f"{sample_text}\n\nIs the source of this document one of the following? {existing_sources_string}\nAnswer Yes or No.",
            },
        ],
        options=disease_question_options,
    )
    source_answer = (
        document_source_question["message"]["content"].strip().lower()
    )

    if source_answer == "yes":
        document_source_choice = client.chat(
            model=config["SECONDARY_MODEL"],
            messages=[
                {
                    "role": "system",
                    "content": prompts["prompts"]["chat"]["system"],
                },
                {
                    "role": "user",
                    "content": f"{sample_text}\n\nWhich of the following sources is this document from? {existing_sources_string}\nRespond only with the source name as it appears in that list.",
                },
                {"role": "assistant", "content": "The source is:"},
            ],
            options=disease_question_options,
        )
        document_source = (
            document_source_choice["message"]["content"]
            .strip()
            .lower()
            .replace(" ", "_")
        )
    else:
        document_source_response = client.chat(
            model=config["SECONDARY_MODEL"],
            messages=[
                {
                    "role": "system",
                    "content": prompts["prompts"]["chat"]["system"],
                },
                {
                    "role": "user",
                    "content": f"{sample_text}\n\nWhat is the source of this document? Only give the name, no other commentary.",
                },
            ],
            options=disease_question_options,
        )
        document_source = (
            document_source_response["message"]["content"]
            .strip()
            .lower()
            .replace(" ", "_")
        )

    return disease_name, focus_area, document_source, filename


def extract_text_from_pdf(pdf_path):
    text = ""
    document = fitz.open(pdf_path)
    for page_num in range(len(document)):
        page = document.load_page(page_num)
        text += page.get_text()
    return text
