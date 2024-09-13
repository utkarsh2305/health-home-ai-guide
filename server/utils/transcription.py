import aiohttp
import asyncio
import time
import logging
from ollama import AsyncClient as AsyncOllamaClient
from server.database.config import config_manager
from server.utils.helpers import calculate_age


async def transcribe_audio(audio_buffer):
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
        async with aiohttp.ClientSession() as session:
            form_data = aiohttp.FormData()
            form_data.add_field(
                "file",
                audio_buffer,
                filename="recording.wav",
                content_type="audio/wav",
            )
            form_data.add_field("model", config["WHISPER_MODEL"])
            form_data.add_field("language", "en")
            print("Sending audio buffer for transcription")

            transcription_start = time.perf_counter()

            async with session.post(
                f"{config['WHISPER_BASE_URL']}audio/transcriptions",
                data=form_data,
            ) as response:
                transcription_end = time.perf_counter()
                transcription_duration = transcription_end - transcription_start

                if response.status != 200:
                    raise ValueError(
                        "Transcription failed, no text in response"
                    )

                data = await response.json()

                if "text" not in data:
                    raise ValueError(
                        "Transcription failed, no text in response"
                    )

                return {
                    "text": data["text"],
                    "transcriptionDuration": transcription_duration,
                }
    except Exception as error:
        print("Error in transcribe_audio function:", error)
        raise


async def process_transcription(transcript_text, name, dob, gender):
    """
    Process the transcribed text to generate clinical history and plan summaries.

    Args:
        transcript_text (str): The transcribed text to process.
        name (str): The patient's name.
        dob (str): The patient's date of birth.
        gender (str): The patient's gender.

    Returns:
        tuple: A tuple containing:
            - refined_clinical_history_text (str): The refined clinical history summary.
            - refined_plan_text (str): The refined plan summary.
            - process_duration (float): The time taken for processing.

    Raises:
        Exception: If an error occurs during processing.
    """
    process_start = time.perf_counter()

    async def summarize_and_refine(prompt_type):
        try:
            summary = await _summarize_transcript(
                transcript_text, prompt_type, name, dob, gender
            )
            refined = await _refine_summary(summary, prompt_type)
            return summary, refined
        except Exception as e:
            logging.error(
                f"Error in summarize_and_refine for {prompt_type}: {str(e)}"
            )
            raise

    try:
        (clinical_history_text, refined_clinical_history_text), (
            plan_text,
            refined_plan_text,
        ) = await asyncio.gather(
            summarize_and_refine("clinicalHistory"),
            summarize_and_refine("plan"),
        )
    except Exception as e:
        logging.error(f"Error in process_transcription: {str(e)}")
        raise

    process_end = time.perf_counter()
    process_duration = process_end - process_start

    return refined_clinical_history_text, refined_plan_text, process_duration


async def _summarize_transcript(
    transcript_text, prompt_type, name=None, dob=None, gender=None
):
    """
    Summarize the transcript using Ollama based on the specified prompt type.

    Args:
        transcript_text (str): The text to summarize.
        prompt_type (str): The type of summary to generate ('clinicalHistory' or 'plan').
        name (str, optional): The patient's name.
        dob (str, optional): The patient's date of birth.
        gender (str, optional): The patient's gender.

    Returns:
        str: The generated summary.
    """
    config = config_manager.get_config()
    prompts = config_manager.get_prompts_and_options()

    client = AsyncOllamaClient(host=config["OLLAMA_BASE_URL"])
    ollama_model = config["PRIMARY_MODEL"]
    system_prompt = prompts["prompts"][prompt_type]["system"]
    initial_assistant_content = prompts["prompts"][prompt_type]["initial"]
    options = prompts["options"]["general"]

    age_string = ""
    gender_string = ""
    if dob:
        try:
            age = calculate_age(dob)
            age_string = f"The patient is {age} years old."
        except Exception as error:
            print("Error calculating age:", error)

    if gender:
        gender_string = (
            "The patient is male."
            if gender == "M"
            else "The patient is female."
        )

    patient_details = ""
    if name:
        patient_details += f"The patient's name is {name}. "
    if age_string:
        patient_details += f"{age_string} "
    if gender_string:
        patient_details += f"{gender_string} "

    extended_system_prompt = f"{system_prompt} {patient_details}"

    request_body = [
        {
            "role": "system",
            "content": extended_system_prompt,
        },
        {
            "role": "user",
            "content": transcript_text,
        },
        {
            "role": "assistant",
            "content": initial_assistant_content,
        },
    ]

    response = await client.chat(
        model=ollama_model, messages=request_body, options=options
    )
    combined_content = response["message"]["content"]

    return combined_content


async def _refine_summary(summary_text, prompt_type):
    """
    Refine and condense the given summary using Ollama.

    Args:
        summary_text (str): The summary text to refine.
        prompt_type (str): The type of summary ('clinicalHistory' or 'plan').

    Returns:
        str: The refined and condensed summary.
    """
    config = config_manager.get_config()
    prompts = config_manager.get_prompts_and_options()
    client = AsyncOllamaClient(host=config["OLLAMA_BASE_URL"])
    ollama_model = config["PRIMARY_MODEL"]
    system_prompt = prompts["prompts"]["refinement"]["system"]

    initial_assistant_content = prompts["prompts"]["refinement"][
        f"{prompt_type}Initial"
    ]

    options = prompts["options"]["general"]

    request_body = [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "assistant",
            "content": "Please provide the summary that needs editing, and I'll refine and condense the text while maintaining its original meaning and format, and remove phrases like 'the doctor'. Please go ahead and send the summary!",
        },
        {
            "role": "user",
            "content": summary_text,
        },
        {
            "role": "assistant",
            "content": "Here is the edited summary:\n"
            + initial_assistant_content,
        },
    ]

    response = await client.chat(
        model=ollama_model, messages=request_body, options=options
    )
    refined_content = response["message"]["content"]

    # Truncate at the first empty line
    # This is kept as an additional safeguard, even with \n as a stop token
    refined_content = "\n".join(
        line for line in refined_content.split("\n") if line.strip()
    )

    # Extract the prefix (first line) from initial_assistant_content
    initial_lines = initial_assistant_content.split("\n")
    prefix = initial_lines[0] if initial_lines else ""

    # Combine the initial assistant content with the refined content
    combined_content = initial_assistant_content + refined_content

    # Remove the prefix from the combined content, if it exists
    if prefix and combined_content.startswith(prefix):
        combined_content = combined_content[len(prefix) :].lstrip("\n")

    return combined_content
