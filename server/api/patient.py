from fastapi import APIRouter
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse
from server.database.patient import (
    delete_patient_by_id,
    search_patient_by_ur_number,
    save_patient,
    update_patient,
    get_patients_by_date,
    get_patient_by_id,
    update_patient_letter,
    fetch_patient_letter,
)
from server.database.jobs import (
    update_patient_jobs_list,
    get_patients_with_outstanding_jobs,
    count_incomplete_jobs,
)
from server.schemas.patient import (
    SavePatientRequest,
    LetterRequest,
    LetterSave,
    JobsListUpdate,
)
from server.utils.helpers import summarize_encounter
from server.utils.letter import generate_letter_content
import logging


router = APIRouter()


@router.post("/save-patient")
async def save_patient_data(request: SavePatientRequest):
    patient = request.patientData

    try:
        # Pass the entire patient object to summarize_encounter
        encounter_summary = await summarize_encounter(patient=patient)

        patient.encounter_summary = encounter_summary

        if patient.id:
            update_patient(patient)
            logging.info(f"Patient updated with ID: {patient.id}")
            return {"id": patient.id}
        else:
            new_patient_id = save_patient(patient)
            logging.info(f"Patient saved with ID: {new_patient_id}")
            return {"id": new_patient_id}
    except Exception as e:
        logging.error(f"Error processing patient data: {e}")
        logging.error(
            f"Patient data: {patient}"
        )  # Log the patient data for debugging
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-jobs-list")
async def update_jobs_list(update: JobsListUpdate):

    try:
        # Perform the database update
        update_patient_jobs_list(update.patientId, update.jobsList)

        return {"id": update.patientId}
    except Exception as e:
        logging.error(f"Error processing to-do list update: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patients")
async def get_patients(date: str, detailed: str = "false"):
    try:
        patients = get_patients_by_date(date)
        if detailed.lower() == "true":
            return JSONResponse(
                content=[
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "ur_number": row["ur_number"],
                        "jobs_list": row["jobs_list"],
                        "encounter_summary": row["encounter_summary"],
                        "dob": row["dob"],
                    }
                    for row in patients
                ]
            )
        else:
            return JSONResponse(
                content=[
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "ur_number": row["ur_number"],
                    }
                    for row in patients
                ]
            )
    except Exception as e:
        logging.error(f"Error fetching patients: {e}")
        raise HTTPException(status_code=500, detail=e)


@router.get("/patient/{id}")
async def get_patient(id: int):
    try:
        patient = get_patient_by_id(id)
        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        return JSONResponse(content=patient)
    except Exception as e:
        logging.error(f"Error fetching patient: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/patients-with-jobs")
async def get_patients_with_jobs():
    try:
        patients = get_patients_with_outstanding_jobs()
        return JSONResponse(
            content=[
                {
                    "id": row["id"],
                    "name": row["name"],
                    "ur_number": row["ur_number"],
                    "jobs_list": row["jobs_list"],
                    "encounter_summary": row["encounter_summary"],
                    "dob": row["dob"],
                    "encounter_date": row["encounter_date"],
                }
                for row in patients
            ]
        )
    except Exception as e:
        logging.error(f"Error fetching patients with jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incomplete-jobs-count")
async def get_incomplete_jobs_count():
    try:
        incomplete_jobs_count = count_incomplete_jobs()
        return JSONResponse(
            content={"incomplete_jobs_count": incomplete_jobs_count}
        )
    except Exception as e:
        logging.error(f"Error counting incomplete jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search-patient")
async def search_patient(ur_number: str):
    try:
        patients = search_patient_by_ur_number(ur_number)
        return JSONResponse(content=patients)
    except Exception as e:
        logging.error(f"Error searching patients: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/patients/{id}")
async def delete_patient(id: int):
    try:
        # Call the function to delete the patient
        success = delete_patient_by_id(id)
        if success:
            logging.info(f"Deleted patient with ID: {id}")
            return {"message": "Patient deleted"}
        else:
            raise Exception("Failed to delete patient")
    except Exception as e:
        logging.error(f"Error deleting patient: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-letter")
async def generate_letter(request: LetterRequest):
    try:
        letter_content = await generate_letter_content(
            request.patientName,
            request.primaryHistory,
            request.summary_text,
        )
        return JSONResponse(content={"letter": letter_content})
    except HTTPException as he:
        # If generate_letter_content raises an HTTPException, re-raise it
        raise he
    except Exception as e:
        logging.error(f"Unexpected error in generate_letter endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


@router.post("/save-letter")
async def save_letter(request: LetterSave):
    try:
        update_patient_letter(request.patientId, request.letter)
        logging.info(f"Patient letter updated for ID: {request.patientId}")
        return {"message": "Letter saved successfully"}
    except Exception as e:
        logging.error(f"Error updating patient letter: {e}")
        raise HTTPException(status_code=500, detail=e)


@router.get("/fetch-letter")
async def fetch_letter(patientId: int):
    try:
        letter = await fetch_patient_letter(patientId)
        return JSONResponse(
            content={"letter": letter or "No letter attached to encounter"}
        )
    except Exception as e:
        logging.error(f"Error fetching letter: {e}")
        raise HTTPException(status_code=500, detail=e)
