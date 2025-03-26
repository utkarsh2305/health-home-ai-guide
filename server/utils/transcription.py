import aiohttp
import asyncio
import time
import re
import logging
from typing import Dict, List, Union
from ollama import AsyncClient as AsyncOllamaClient
from server.database.config import config_manager
from server.schemas.templates import TemplateField, TemplateResponse
from server.schemas.grammars import FieldResponse, RefinedResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def transcribe_audio(audio_buffer: bytes) -> Dict[str, Union[str, float]]:
    """
    Transcribe an audio buffer using a Whisper endpoint.

    Args:
        audio_buffer (bytes): The audio data to be transcribed.

    Returns:
        dict: A dictionary containing:
            - 'text' (str): The transcribed text.
            - 'transcriptionDuration' (float): The time taken for transcription.

    Raises:
        ValueError: If the transcription fails or no text is returned.
    """
    try:
        config = config_manager.get_config()
        filename, content_type = _detect_audio_format(audio_buffer)
        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            form_data.add_field(
                "file",
                audio_buffer,
                filename=filename,
                content_type=content_type,
            )
            form_data.add_field("model", config["WHISPER_MODEL"])
            form_data.add_field("language", "en")
            form_data.add_field("temperature", "0.1")
            form_data.add_field("vad_filter", "true")
            form_data.add_field("response_format", "verbose_json")
            form_data.add_field("timestamp_granularities[]", "segment")

            transcription_start = time.perf_counter()

            headers = {
                "Authorization": f"Bearer {config['WHISPER_KEY']}"
            }

            async with session.post(
                f"{config['WHISPER_BASE_URL']}/v1/audio/transcriptions",
                data=form_data,
                headers=headers
            ) as response:
                transcription_end = time.perf_counter()
                transcription_duration = transcription_end - transcription_start

                if response.status != 200:
                    error_text = await response.text()
                    raise ValueError(f"Transcription failed: {error_text}")

                try:
                    data = await response.json()
                except Exception as e:
                    raise ValueError(f"Failed to parse response: {e}")

                if "text" not in data:
                    raise ValueError(
                        "Transcription failed, no text in response"
                    )

                if "segments" in data:
                    # Extract text from each segment and join with newlines
                    transcript_text = '\n'.join(
                        segment["text"].strip()
                        for segment in data["segments"]
                    )
                else:
                    transcript_text = data["text"]

                return {
                    "text": transcript_text,
                    "transcriptionDuration": float(f"{transcription_duration:.2f}"),
                }
    except Exception as error:
        logger.error(f"Error in transcribe_audio function: {error}")
        raise

async def process_transcription(
    transcript_text: str,
    template_fields: List[TemplateField],
    patient_context: Dict[str, str]
) -> Dict[str, Union[str, float]]:
    """
    Process the transcribed text to generate summaries for non-persistent template fields.

    Args:
        transcript_text (str): The transcribed text to process.
        template_fields (List[TemplateField]): The fields to process.
        patient_context (Dict[str, str]): Patient context (name, dob, gender, etc.).

    Returns:
        dict: A dictionary containing:
            - 'fields' (Dict[str, str]): Processed field data.
            - 'process_duration' (float): The time taken for processing.
    """
    process_start = time.perf_counter()

    try:
        # Filter for non-persistent fields only
        non_persistent_fields = [field for field in template_fields if not field.persistent]

        # Process only non-persistent fields concurrently
        raw_results = await asyncio.gather(*[
            process_template_field(
                transcript_text,
                field,
                patient_context
            )
            for field in non_persistent_fields
        ])
        print(raw_results)
        # Refine all results concurrently
        refined_results = await asyncio.gather(*[
            refine_field_content(
                result.content,
                field
            )
            for result, field in zip(raw_results, non_persistent_fields)
        ])

        # Combine results into a dictionary
        processed_fields = {
            field.field_key: refined_content
            for field, refined_content in zip(non_persistent_fields, refined_results)
        }

        process_duration = time.perf_counter() - process_start

        return {
            "fields": processed_fields,
            "process_duration": float(f"{process_duration:.2f}")
        }

    except Exception as e:
        logger.error(f"Error in process_transcription: {e}")
        raise

async def process_template_field(
    transcript_text: str,
    field: TemplateField,
    patient_context: Dict[str, str]
) -> TemplateResponse:
    """Process a single template field by extracting key points from the transcript text using a structured JSON output.

    This function sends the transcript text and patient context to the Ollama model, instructing it to return key points in JSON format according to the FieldResponse schema. The key points are then formatted into a human-friendly string.

    Args:
        transcript_text (str): The transcribed text to be analyzed.
        field (TemplateField): The template field configuration containing prompts.
        patient_context (Dict[str, str]): Patient context details.

    Returns:
        TemplateResponse: An object containing the field key and the formatted key points.

    Raises:
        Exception: Propagates exceptions if the extraction or formatting fails.
    """
    try:
        config = config_manager.get_config()
        client = AsyncOllamaClient(host=config["OLLAMA_BASE_URL"])
        options = config_manager.get_prompts_and_options()["options"]["general"]

        response_format = FieldResponse.model_json_schema()

        request_body = [
            {"role": "system", "content": (
                f"{field.system_prompt}\n"
                "Extract and return key points as a JSON array."
            )},
            {"role": "system", "content": _build_patient_context(patient_context)},
            {"role": "user", "content": transcript_text},
        ]

        response = await client.chat(
            model=config["PRIMARY_MODEL"],
            messages=request_body,
            format=response_format,
            options={**options, "temperature": 0}
        )

        field_response = FieldResponse.model_validate_json(
            response['message']['content']
        )

        # Convert key points into a nicely formatted string
        formatted_content = "\n".join(f"• {point.strip()}" for point in field_response.key_points)

        return TemplateResponse(
            field_key=field.field_key,
            content=formatted_content
        )

    except Exception as e:
        logger.error(f"Error processing template field {field.field_key}: {e}")
        raise

# Helps to clean up double spaces
def clean_list_spacing(text: str) -> str:
    """Clean up extra spaces in list items and at line start."""
    # Fix numbered list items (e.g., "1.  text" -> "1. text")
    text = re.sub(r'(\d+\.)  +', r'\1 ', text)
    # Fix bullet points/dashes (e.g., "-  text" -> "- text")
    text = re.sub(r'([-•*])  +', r'\1 ', text)
    # Fix any double spaces at the start of lines
    text = re.sub(r'^\s{2,}', ' ', text)
    return text.strip()

async def refine_field_content(
    content: Union[str, Dict],
    field: TemplateField
) -> Union[str, Dict]:
    """
    Refine the content of a single field using style examples and format schema.

    Args:
        content (Union[str, Dict]): The raw content to refine.
        field (TemplateField): The field being processed.

    Returns:
        Union[str, Dict]: The refined content.
    """
    try:
        # If content is already structured (dict), return as is
        if isinstance(content, dict):
            return content

        # Get configuration and client
        config = config_manager.get_config()
        client = AsyncOllamaClient(host=config["OLLAMA_BASE_URL"])
        prompts = config_manager.get_prompts_and_options()
        options = prompts["options"]["general"]

        # Determine format details
        format_details = _determine_format_details(field, prompts)

        # Build system prompt with style example if available
        system_prompt = _build_system_prompt(field, format_details, prompts)

        # Execute the model call
        response = await client.chat(
            model=config["PRIMARY_MODEL"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content},
            ],
            format=format_details["response_format"],
            options=options
        )

        # Format the response appropriately
        return _format_refined_response(response, field, format_details)

    except Exception as e:
        logger.error(f"Error refining field {field.field_key}: {e}")
        raise

def _build_patient_context(context: Dict[str, str]) -> str:
    """
    Build patient context string from dictionary.

    Args:
        context (Dict[str, str]): Patient context (name, dob, gender, etc.).

    Returns:
        str: A formatted patient context string.
    """
    context_parts = []
    if context.get("name"):
        context_parts.append(f"Patient name: {context['name']}")
    if context.get("age"):
        context_parts.append(f"Age: {context['age']}")
    if context.get("gender"):
        context_parts.append(f"Gender: {context['gender']}")
    if context.get("dob"):
        context_parts.append(f"DOB: {context['dob']}")

    return " ".join(context_parts)

def _detect_audio_format(audio_buffer):
    """
    Simple audio format detection based on file signatures (magic numbers).
    """
    # Check file signatures for common audio formats
    if audio_buffer.startswith(b'ID3') or audio_buffer.startswith(b'\xFF\xFB'):
        return "recording.mp3", "audio/mpeg"
    elif audio_buffer.startswith(b'RIFF') and b'WAVE' in audio_buffer[0:12]:
        return "recording.wav", "audio/wav"
    elif audio_buffer.startswith(b'OggS'):
        return "recording.ogg", "audio/ogg"
    elif audio_buffer.startswith(b'fLaC'):
        return "recording.flac", "audio/flac"
    elif b'ftyp' in audio_buffer[0:20]:  # M4A/MP4 format
        return "recording.m4a", "audio/mp4"
    # Default to WAV if we can't determine
    return "recording.wav", "audio/wav"

def _determine_format_details(field: TemplateField, prompts: dict) -> dict:
    """Determine response format and format type based on field schema."""
    format_type = None
    if field.format_schema and "type" in field.format_schema:
        format_type = field.format_schema["type"]

        if format_type == "narrative":
            return {
                "format_type": "narrative",
                "response_format": NarrativeResponse.model_json_schema(),
                "base_prompt": "Format the following content as a cohesive narrative paragraph."
            }

    # Default to RefinedResponse for non-narrative formats
    format_guidance = ""
    if format_type == "numbered":
        format_guidance = "Format the key points as a numbered list (1., 2., etc.)."
    elif format_type == "bullet":
        format_guidance = "Format the key points as a bulleted list (•) prefixes)."

    return {
        "format_type": format_type,
        "response_format": RefinedResponse.model_json_schema(),
        "base_prompt": prompts["prompts"]["refinement"]["system"],
        "format_guidance": format_guidance
    }

def _build_system_prompt(field: TemplateField, format_details: dict, prompts: dict) -> str:
    """Build the system prompt using format guidance and style examples."""
    # Check if field has style_example and prioritize it
    if hasattr(field, 'style_example') and field.style_example:
        return f"""
        You are an expert medical scribe. Your task is to reformat medical information to precisely match the style example provided, while maintaining clinical accuracy.

        STYLE EXAMPLE:
        {field.style_example}

        FORMATTING INSTRUCTIONS:
        1. Analyze the STYLE EXAMPLE and match it EXACTLY, including:
        - Format elements (bullet style, indentation, paragraph structure)
        - Sentence structure (fragments vs. complete sentences)
        - Capitalization and punctuation patterns
        - Abbreviation conventions and medical terminology style
        - Tense (past/present) and perspective (first/third person)

        2. IMPORTANT CONSTRAINTS:
        - Preserve ALL clinical details and values from the original text
        - Do not add information not present in the input
        - RETURN JSON IN THE REQUESTED FORMAT
        - If the style example uses abbreviations like "SNT" or "HSM", use similar appropriate medical abbreviations

        FORMAT THE FOLLOWING MEDICAL INFORMATION:"""

    # If no style example, start with base prompt
    system_prompt = format_details["base_prompt"]

    # Add format guidance if available
    if "format_guidance" in format_details and format_details["format_guidance"]:
        system_prompt += "\n" + format_details["format_guidance"]

    # Apply custom refinement rules if specified and no style example exists
    if field.refinement_rules:
        for rule in field.refinement_rules:
            if rule in prompts["prompts"]["refinement"]:
                system_prompt = prompts["prompts"]["refinement"][rule]
                break
    print(system_prompt)
    return system_prompt

def _format_refined_response(response: dict, field: TemplateField, format_details: dict) -> str:
    """Format the model response according to field requirements."""
    format_type = format_details["format_type"]

    if format_type == "narrative":
        narrative_response = NarrativeResponse.model_validate_json(response['message']['content'])
        return narrative_response.narrative

    # Handle non-narrative formats
    refined_response = RefinedResponse.model_validate_json(response['message']['content'])

    if format_type == "numbered":
        return _format_numbered_list(refined_response.key_points)
    elif format_type == "bullet":
        return _format_bulleted_list(refined_response.key_points, field)
    else:
        # No specific formatting required
        return "\n".join(refined_response.key_points)

def _format_numbered_list(key_points: List[str]) -> str:
    """Format key points as a numbered list."""
    formatted_key_points = []
    for i, point in enumerate(key_points):
        # Strip any existing numbering
        cleaned_point = re.sub(r'^\d+\.\s*', '', point.strip())
        formatted_key_points.append(f"{i+1}. {cleaned_point}")
    return "\n".join(formatted_key_points)

def _format_bulleted_list(key_points: List[str], field: TemplateField) -> str:
    """Format key points as a bulleted list."""
    bullet_char = "•"  # Default bullet character
    if field.format_schema and "bullet_char" in field.format_schema:
        bullet_char = field.format_schema["bullet_char"]

    formatted_key_points = []
    for point in key_points:
        # Strip any existing bullets
        cleaned_point = re.sub(r'^[•\-\*]\s*', '', point.strip())
        formatted_key_points.append(f"{bullet_char} {cleaned_point}")
    return "\n".join(formatted_key_points)
