from fastapi import APIRouter, Body
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse
import traceback
import json
from typing import Optional, List
from server.database.patient import (
    delete_patient_by_id,
    search_patient_by_ur_number,
    save_patient,
    update_patient,
    update_patient_reasoning,
    get_patients_by_date,
    get_patient_by_id,
    get_patient_history
)
from server.schemas.patient import (
    SavePatientRequest,
    Patient,
    JobsListUpdate,
)

from server.database.jobs import (
    update_patient_jobs_list,
    get_patients_with_outstanding_jobs,
    count_incomplete_jobs,
)

from server.utils.helpers import summarize_encounter, run_clinical_reasoning
from server.database.analysis import generate_previous_visit_summary
import logging

router = APIRouter()

@router.post("/save")
async def save_patient_data(request: SavePatientRequest):
    """Saves patient data."""
    patient = request.patientData

    try:
        # Summarize the encounter
        encounter_summary, primary_condition = await summarize_encounter(
            patient=patient
        )

        # Add summary data to patient
        patient.encounter_summary = encounter_summary
        patient.primary_condition = primary_condition

        # Save or update the patient, depending on whether a patient ID was provide by the frontend
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
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def get_patients(
    date: str,
    template_key: Optional[str] = None,
    detailed: Optional[str] = None,
) -> List[Patient]:
    """Get patients for a specific date."""
    try:
        include_data = detailed and detailed.lower() == "true"
        patients = get_patients_by_date(date, template_key, include_data)

        if include_data:
            return JSONResponse(content=[
                {
                    "id": patient["id"],
                    "name": patient["name"],
                    "ur_number": patient["ur_number"],
                    "jobs_list": (
                        json.dumps(patient["jobs_list"])
                        if isinstance(patient.get("jobs_list"), list)
                        else patient.get("jobs_list", "[]")
                    ),
                    "encounter_summary": patient.get("encounter_summary", ""),
                    "dob": patient["dob"],
                    "reasoning": patient.get("reasoning_output"),  # Add this line
                }
                for patient in patients
            ])

        # Basic response
        return JSONResponse(content=[
            {
                "id": patient["id"],
                "name": patient["name"],
                "ur_number": patient["ur_number"],
            }
            for patient in patients
        ])

    except Exception as e:
        logging.error(f"Error fetching patients: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/id/{id}")
async def get_patient(
    id: int,
    include_history: bool = False
) -> Patient:
    """Get patient by ID with option to include history."""
    try:
        patient = get_patient_by_id(id)

        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        if include_history:
            history = get_patient_history(patient["ur_number"])
            patient["history"] = history

        return JSONResponse(content=patient)
    except HTTPException:
            raise
    except Exception as e:
        logging.error(f"Error fetching patient: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/id/{id}/history")
async def get_patient_history_endpoint(id: int) -> List[Patient]:
    """Get patient's historical encounters with persistent fields."""
    try:
        patient = get_patient_by_id(id)
        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        history = get_patient_history(patient["ur_number"])
        return JSONResponse(content=history)
    except Exception as e:
        logging.error(f"Error fetching patient history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_patient(ur_number: str) -> List[Patient]:
    """Search for patients by UR number."""
    try:
        patients = search_patient_by_ur_number(ur_number)

        return JSONResponse(content=patients)
    except Exception as e:
        logging.error(f"Error searching patients: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary/{id}")
async def get_patient_summary(id: int):
    """Get patient summary."""
    try:
        patient = get_patient_by_id(id)

        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")

        summary = await generate_previous_visit_summary(patient)
        return JSONResponse(content={"summary": summary})
    except Exception as e:
        logging.error(f"Error getting patient summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/id/{id}")
async def delete_patient(id: int):
    """Delete a patient record."""
    try:
        success = delete_patient_by_id(id)
        if success:
            return {"message": "Patient deleted"}
        raise HTTPException(status_code=404, detail="Patient not found")
    except Exception as e:
        logging.error(f"Error deleting patient: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-jobs-list")
async def update_jobs_list(update: JobsListUpdate):
    """Update a patient's job list."""

    try:
        update_patient_jobs_list(update.patientId, update.jobsList)

        return {"id": update.patientId}
    except Exception as e:
        logging.error(f"Error processing to-do list update: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-jobs")
async def update_jobs(
    patient_id: int,
    jobs_list: List[dict] = Body(..., description="Updated jobs list")
):
    """Update a patient's jobs list."""
    try:
        update_patient_jobs_list(patient_id, jobs_list)
        return JSONResponse(content={"message": "Jobs list updated successfully"})
    except Exception as e:
        logging.error(f"Error updating jobs list: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-jobs/{patient_id}")
async def update_patient_jobs(
    patient_id: int,
    jobs_list: List[dict] = Body(...),
):
    """Update a patient's jobs list."""
    try:
        update_patient_jobs_list(patient_id, jobs_list)
        return JSONResponse(content={"message": "Jobs updated successfully"})
    except Exception as e:
        logging.error(f"Error updating patient jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/outstanding-jobs")
async def get_patients_with_jobs():
    """Get all patients with outstanding jobs."""
    try:
        patients = get_patients_with_outstanding_jobs()
        return JSONResponse(content=[
            {
                "id": patient["id"],
                "name": patient["name"],
                "ur_number": patient["ur_number"],
                "jobs_list": json.dumps(patient.get("jobs_list", [])),
                "encounter_summary": patient.get("encounter_summary", ""),
                "dob": patient["dob"],
                "encounter_date": patient["encounter_date"],
                "reasoning": patient.get("reasoning_output"),  # Add this line
            }
            for patient in patients
        ])
    except Exception as e:
        logging.error(f"Error fetching patients with jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incomplete-jobs-count")
async def get_incomplete_jobs_count():
    """Get the count of incomplete jobs."""
    try:
        incomplete_jobs_count = count_incomplete_jobs()
        return JSONResponse(
            content={"incomplete_jobs_count": incomplete_jobs_count}
        )
    except Exception as e:
        logging.error(f"Error counting incomplete jobs: {e}")
        print("TRACEBACK:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{patient_id}/reasoning")
async def generate_reasoning(patient_id: int):
    """Run reasoning analysis on a completed patient note."""
    try:
        patient = get_patient_by_id(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        reasoning_output = await run_clinical_reasoning(
            patient["template_data"],
            patient["dob"],
            patient["encounter_date"],
            patient["gender"]
        )

        update_patient_reasoning(patient_id, reasoning_output.dict())

        return JSONResponse(content=reasoning_output.dict())
    except Exception as e:
        logging.error(f"Reasoning error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
