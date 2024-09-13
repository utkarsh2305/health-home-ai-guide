from pydantic import BaseModel


class Config(BaseModel):
    """
    Configuration model for the application.

    Attributes:
        OLLAMA_BASE_URL (str): The base URL for the Ollama service.
        OLLAMA_MODEL (str): The name of the Ollama model to use.
        summaryPrompt (str): The prompt template for generating summaries.
        summaryOptions (dict): Additional options for summary generation.
    """

    OLLAMA_BASE_URL: str
    OLLAMA_MODEL: str
    summaryPrompt: str
    summaryOptions: dict


class ConfigData(BaseModel):
    """
    Container for configuration data.

    This model is used to wrap configuration data in a dictionary format.

    Attributes:
        data (dict): A dictionary containing configuration key-value pairs.
    """

    data: dict


class CustomHeadings(BaseModel):
    """
    Custom headings model for the application.

    Attributes:
        primaryHistory (str): Custom heading for Primary History.
        additionalHistory (str): Custom heading for Additional History.
        investigations (str): Custom heading for Investigations.
        encounterDetail (str): Custom heading for Encounter Detail.
        impression (str): Custom heading for Impression.
        encounterPlan (str): Custom heading for Encounter Plan.
    """

    primaryHistory: str
    additionalHistory: str
    investigations: str
    encounterDetail: str
    impression: str
    encounterPlan: str
