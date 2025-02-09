import aiohttp
import asyncio
import logging
from ollama import AsyncClient as AsyncOllamaClient
from server.database.config import config_manager
from server.utils.helpers import calculate_age
import fitz  # PyMuPDF for PDF processing
import io
import pytesseract
from PIL import Image
import numpy as np


async def process_document_content(
    document_buffer, content_type, name=None, dob=None, gender=None
):
    """
    Process document content using OCR first, then pass the extracted text to the LLM.
    Handles both images and PDFs.
    """
    config = config_manager.get_config()
    prompts = config_manager.get_prompts_and_options()
    options = prompts["options"]["general"].copy()
    del options["stop"]

    # Extract text from document using OCR
    extracted_text = await extract_text_from_document(
        document_buffer, content_type
    )

    # Prepare patient context
    patient_context = _build_patient_context(name, dob, gender)

    async def process_section(section_type, system_prompt):
        client = AsyncOllamaClient(host=config["OLLAMA_BASE_URL"])
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Please analyze this medical document text and provide the {section_type} summary:\n\n{extracted_text}",
            },
            {
                "role": "assistant",
                "content": f"{section_type}:\n",
            },
        ]
        response = await client.chat(
            model=config["PRIMARY_MODEL"],
            messages=messages,
            options=options,
        )
        return response["message"]["content"]


    # Define prompts for each section
    prompts = {
        "Primary History": """You are a medical documentation assistant. Review this medical document text and extract the 'Primary History' defined as the main reason the patient has been referred to the specialist with relevant details. Format as:
        # [Condition that has been referred]
        - [Key detail]
        - [Key detail]""",
        "Additional History": """Extract any additional medical conditions not covered in the primary history. Format as:
        # [Condition]
        - [Key detail]""",
        "Medications": """Extract all medications mentioned in the document. Format as:
        - [Medication name, dose, frequency]""",
        "Social History": """Extract all social history details; include relevant family medical history, alcohol, and smoking status. Format as:
        - [Social history detail]""",
        "Investigations": """Extract any test results or investigations mentioned; focusing on the items most relevant to the primary condition in the referral. Format as:
        - [Investigation/test result]""",
    }

    # Process all sections concurrently
    try:
        results = await asyncio.gather(
            *[
                process_section(section, prompt)
                for section, prompt in prompts.items()
            ]
        )

        # Combine results
        primary_history = results[0]
        primary_history = "# " + primary_history.split("#", 1)[-1].strip()

        # Combine Additional History, Medications, and Social History
        additional_history = results[1]
        additional_history = (
            "# " + additional_history.split("#", 1)[-1].strip() + "\n\n"
        )
        additional_history += "Medications:\n" + results[2].strip() + "\n\n"
        additional_history += "Social History:\n" + results[3].strip()

        investigations = results[4]
        investigations = "- " + investigations.split("-", 1)[-1].strip()

        return primary_history, additional_history, investigations

    except Exception as e:
        logging.error(f"Error processing document sections: {str(e)}")
        raise


async def extract_text_from_document(document_buffer, content_type):
    """
    Extract text from document using OCR or return raw text.
    Handles PDFs, images, and raw text.
    """
    # If content type is text, return the text directly
    if content_type in ["text/plain", "text/html"]:
        if isinstance(document_buffer, bytes):
            return document_buffer.decode("utf-8")
        return document_buffer

    extracted_texts = []

    if content_type == "application/pdf":
        # Handle PDF
        pdf_document = fitz.open(stream=document_buffer, filetype="pdf")
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            text = pytesseract.image_to_string(img)
            extracted_texts.append(text)
    else:
        # Handle single image
        img = Image.open(io.BytesIO(document_buffer))
        text = pytesseract.image_to_string(img)
        extracted_texts.append(text)

    return "\n\n".join(extracted_texts)


def _build_patient_context(name, dob, gender):
    """Build context string from patient details"""
    context_parts = []
    if name:
        context_parts.append(f"Patient: {name}")
    if dob:
        age = calculate_age(dob)
        context_parts.append(f"Age: {age}")
    if gender:
        context_parts.append(f"Gender: {'Male' if gender == 'M' else 'Female'}")
    return " | ".join(context_parts)


def _parse_model_output(output):
    """Parse the model output into separate sections"""
    # Prepend the section headers that were removed
    full_output = f"Primary History:\n#{output}"

    sections = full_output.split("\n\n")
    primary_history = ""
    additional_history = ""
    investigations = ""

    current_section = None
    for section in sections:
        if section.startswith("Primary History:"):
            current_section = "primary"
            primary_history = section.replace("Primary History:", "").strip()
        elif section.startswith("Additional History:"):
            current_section = "additional"
            additional_history = section.replace(
                "Additional History:", ""
            ).strip()
        elif section.startswith("Investigations:"):
            current_section = "investigations"
            investigations = section.replace("Investigations:", "").strip()

    return primary_history, additional_history, investigations
