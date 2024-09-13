from pydantic import BaseModel
from typing import Optional


class Patient(BaseModel):
    """
    Represents a patient's medical record.

    Attributes:
        id (Optional[int]): Patient's unique identifier.
        name (str): Patient's full name.
        ur_number (str): Unique record number for the patient.
        final_primary_history (str): Final version of the patient's haematological history.
        initial_primary_history (Optional[str]): Initial draft of the haematological history.
        initial_oahp (Optional[str]): Initial other active health problems.
        final_oahp (str): Final version of other active health problems.
        initial_investigations (Optional[str]): Initial draft of investigations.
        final_investigations (str): Final version of investigations.
        final_clinical_history (str): Final version of the patient's clinical history.
        initial_impression (Optional[str]): Initial clinical impression.
        final_impression (str): Final clinical impression.
        initial_plan (Optional[str]): Initial treatment plan.
        final_plan (str): Final treatment plan.
        dob (str): Date of birth.
        encounter_date (str): Date of the medical encounter.
        gender (str): Patient's gender.
        encounter_summary (Optional[str]): Summary of the medical encounter.
        initial_clinical_history (str): Initial draft of the clinical history.
        process_duration (Optional[float]): Time taken to process the patient's data.
        raw_transcription (str): Raw transcription of the medical encounter.
        transcription_duration (Optional[float]): Time taken for transcription.
        jobs_list (Optional[str]): List of tasks related to the patient.
        finalLetter (Optional[str]): Final letter summarizing the patient's case.
    """

    id: Optional[int] = None
    name: str
    dob: str
    ur_number: str
    gender: str
    encounter_date: str
    primary_history: str
    additional_history: str
    investigations: str
    encounter_detail: str
    impression: str
    encounter_plan: str
    raw_transcription: Optional[str] = None
    transcription_duration: Optional[float] = None
    process_duration: Optional[float] = None
    encounter_summary: Optional[str] = None
    jobs_list: Optional[str] = None
    all_jobs_completed: Optional[bool] = False
    final_letter: Optional[str] = None


class LetterRequest(BaseModel):
    """
    Represents a request to generate a letter.

    Attributes:
        summary_text (str): Summary text for the letter.
        patientName (str): Name of the patient.
        primaryHistory (str): Haematological history of the patient.
    """

    summary_text: str
    patientName: str
    primaryHistory: str


class LetterSave(BaseModel):
    """
    Represents a request to save a generated letter.

    Attributes:
        patientId (int): Unique identifier of the patient.
        letter (str): Content of the letter to be saved.
    """

    patientId: int
    letter: str


class SavePatientRequest(BaseModel):
    """
    Represents a request to save patient data.

    Attributes:
        patientData (Patient): Patient data to be saved.
    """

    patientData: Patient


class TranscribeResponse(BaseModel):
    """
    Represents the response from a transcription process.

    Attributes:
        clinicalHistory (str): Transcribed clinical history.
        plan (str): Transcribed treatment plan.
        rawTranscription (str): Raw transcription text.
        transcriptionDuration (float): Time taken for transcription.
        processDuration (float): Total time taken for processing.
    """

    clinicalHistory: str
    plan: str
    rawTranscription: str
    transcriptionDuration: float
    processDuration: float


class Job(BaseModel):
    id: int
    job: str
    completed: bool


class JobsListUpdate(BaseModel):
    """
    Represents an update to a patient's jobs list.

    Attributes:
        patientId (int): Unique identifier of the patient.
        toDoList (List[TodoItem]): List of job items for the patient.
    """

    patientId: int
    jobsList: list[Job]
