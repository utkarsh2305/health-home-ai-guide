from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from fastapi.exceptions import HTTPException
from server.schemas.patient import TranscribeResponse
import logging
from typing import Optional
from server.utils.transcription import transcribe_audio, process_transcription

router = APIRouter()


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    dob: Optional[str] = Form(None),
):
    try:
        # Read the audio file
        audio_buffer = await file.read()
        audio_size = len(audio_buffer)
        audio_duration = round(audio_size / (2 * 44100), 2)

        # Process the name if provided
        formatted_name = "N/A"
        if name:
            name_parts = name.split(",")
            last_name = name_parts[0].strip()
            first_name = name_parts[1].strip()
            formatted_name = f"{first_name} {last_name}"

        # Perform transcription
        transcription_result = await transcribe_audio(audio_buffer)
        transcript_text = transcription_result["text"]
        transcription_duration = transcription_result["transcriptionDuration"]

        # Process the transcription
        clinical_history, plan, process_duration = await process_transcription(
            transcript_text, formatted_name, dob, gender
        )

        # Return the response
        return TranscribeResponse(
            clinicalHistory=clinical_history,
            plan=plan,
            rawTranscription=transcript_text,
            transcriptionDuration=transcription_duration,
            processDuration=process_duration,
        )
    except Exception as e:
        logging.error(f"Error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dictate")
async def dictate(file: UploadFile = File(...)):
    try:
        # Read the audio file
        audio_buffer = await file.read()

        # Perform transcription
        transcription_result = await transcribe_audio(audio_buffer)
        transcript_text = transcription_result["text"]
        transcription_duration = transcription_result["transcriptionDuration"]

        # Return the response
        return {
            "transcription": transcript_text,
            "transcriptionDuration": transcription_duration,
        }
    except Exception as e:
        logging.error(f"Error occurred during dictation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
