from pydantic import BaseModel, Field
from typing import List

# RAG Chat Items:
class ClinicalSuggestion(BaseModel):
    question: str


class ClinicalSuggestionList(BaseModel):
    suggestions: List[ClinicalSuggestion]

# Transcription Processing

class FieldResponse(BaseModel):
    """
    Structured model where each individual discussion point
    is in its own entry in the list.
    """
    key_points: List[str] = Field(
        description="Individual discussion points extracted from the transcript"
    )

# Reasoning

class ClinicalReasoning(BaseModel):
    thinking: str
    summary: str
    differentials: List[str]
    investigations: List[str]
    clinical_considerations: List[str]
