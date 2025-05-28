import logging
from posixpath import basename
from typing import List, Optional
import json

from server.utils.llm_client import get_llm_client
from server.database.config import config_manager
from server.schemas.grammars import RefinementInstructions, RefinedContent

logger = logging.getLogger(__name__)

MAX_INSTRUCTIONS = 5

async def generate_adaptive_refinement_suggestions(
    initial_content: str,
    modified_content: str,
    existing_instructions: Optional[List[str]] = None,
    model_name: Optional[str] = None
) -> List[str]:
    """
    Generates adaptive refinement suggestions by comparing initial and modified content,
    and manages a running list of unique instructions.

    Args:
        initial_content: The original text before refinement
        modified_content: The refined text after modifications
        existing_instructions: Previous refinement instructions to build upon
        model_name: Optional model name override (uses config default if not provided)

    Returns:
        List of refined instructions based on observed improvements
    """
    logger.info(
        f"Generating adaptive refinement suggestions. Initial content length: {len(initial_content)}, "
        f"Modified content length: {len(modified_content)}, "
        f"Existing instructions: {existing_instructions}"
    )

    if not modified_content.strip():
        logger.warning("Modified content is empty. Returning existing instructions.")
        return existing_instructions or []

    if initial_content == modified_content:
        logger.info("Initial and modified content are identical. Returning existing instructions.")
        return existing_instructions or []

    # Get configuration and client
    config = config_manager.get_config()
    client = get_llm_client()
    prompts = config_manager.get_prompts_and_options()
    options = prompts["options"]["general"]

    # Get default model from config if not specified
    model_name = config.get("PRIMARY_MODEL")

    # Create the prompt for analyzing differences
    system_prompt = """You are an expert writing analyst. Your task is to compare two versions of text and identify specific improvements made in the second version. Based on these improvements, generate concise, actionable writing guidelines that could be applied to future texts.

    Focus on:
    - Grammar and syntax improvements
    - Style and clarity enhancements
    - Conciseness and word choice
    - Structure and flow improvements
    - Medical/technical terminology usage (if applicable)

    Return exactly 3-5 instructions. Each instruction should be:
    - Specific and actionable
    - General enough to apply to other texts
    - Based on actual improvements observed

    Example instructions:
    - "Use active voice instead of passive voice"
    - "Replace vague terms with specific medical terminology"
    - "Combine related sentences for better flow"
    - "Eliminate redundant phrases and words"
    - "Use precise clinical language over colloquial expressions"""

    user_prompt = f"""Compare these two versions of text and identify the key improvements made:

    ORIGINAL VERSION:
    ---
    {initial_content}
    ---

    IMPROVED VERSION:
    ---
    {modified_content}
    ---

    Based on the improvements you observe, generate 3-5 concise refinement instructions that capture these enhancements."""

    base_messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    try:
        # Use the Pydantic schema for structured output
        format_schema = RefinementInstructions.model_json_schema()

         # Check if using Qwen3 model
        model_name_lower = model_name.lower()
        thinking = ""


        if "qwen3" in model_name_lower:
            logger.info(f"Qwen3 model detected: {model_name}. Getting explicit thinking step.")

            # Create a copy of base_messages for the thinking step
            thinking_messages = base_messages.copy()
            thinking_messages.append({
                "role": "assistant",
                "content": "<think>\n"
            })

            # Make initial call for thinking only
            thinking_options = options.copy()
            thinking_options["stop"] = ["</think>"]

            thinking_response = await client.chat(
                model=model_name,
                messages=thinking_messages,
                options=thinking_options
            )

            # Extract thinking content
            thinking = "<think>" + thinking_response["message"]["content"] + "</think>"

            # Add thinking to the main request
            full_messages = base_messages.copy()
            full_messages.append({
                "role": "assistant",
                "content": thinking
            })

            # Now make the structured output call with the thinking included
            response = await client.chat(
                model=model_name,
                messages=full_messages,
                format=format_schema,
                options=options
            )
        else:
            # Standard approach for other models
            response = await client.chat(
                model=model_name,
                messages=base_messages,
                format=format_schema,
                options=options
            )

        # Extract and parse the JSON response
        response_content = response["message"]["content"]
        parsed_response = json.loads(response_content)
        newly_generated_instructions = parsed_response["instructions"]

        logger.info(f"Generated instructions: {newly_generated_instructions}")

    except Exception as e:
        logger.error(f"Error during LLM call or processing: {e}", exc_info=True)
        return existing_instructions or []

    # Combine with existing instructions
    current_instructions = list(existing_instructions) if existing_instructions else []

    # Deduplicate instructions while preserving order and prioritizing newer ones
    unique_instructions = []
    seen = set()

    # First, add new instructions
    for instruction in newly_generated_instructions:
        instruction_clean = instruction.strip()
        if instruction_clean and instruction_clean.lower() not in seen:
            unique_instructions.append(instruction_clean)
            seen.add(instruction_clean.lower())

    # Then add existing instructions that aren't duplicates
    for instruction in current_instructions:
        instruction_clean = instruction.strip()
        if instruction_clean and instruction_clean.lower() not in seen:
            unique_instructions.append(instruction_clean)
            seen.add(instruction_clean.lower())

    # Truncate to MAX_INSTRUCTIONS, keeping the most recent ones
    final_instructions = unique_instructions[:MAX_INSTRUCTIONS]

    logger.info(f"Final updated instructions: {final_instructions}")
    return final_instructions
