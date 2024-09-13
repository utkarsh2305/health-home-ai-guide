from fastapi import APIRouter, Query, Path, Body
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse
import httpx
from server.database.config import config_manager
import logging

router = APIRouter()


@router.get("/prompts")
async def get_prompts():
    return JSONResponse(content=config_manager.get_prompts())


@router.post("/prompts")
async def update_prompts(data: dict):
    config_manager.update_prompts(data)
    return {"message": "prompts.js updated successfully"}


@router.get("/config")
async def get_config():
    return JSONResponse(content=config_manager.get_config())


@router.post("/config")
async def update_config(data: dict):
    config_manager.update_config(data)
    return {"message": "config.js updated successfully"}


@router.get("/models")
async def get_models(
    ollamaEndpoint: str = Query(..., description="The endpoint for Ollama")
):
    print(ollamaEndpoint)
    try:
        # Use httpx to make an asynchronous HTTP GET request
        async with httpx.AsyncClient() as client:
            url = f"{ollamaEndpoint}/api/tags"
            print(url)
            response = await client.get(url)

            # Check if the request was successfunl
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch models",
                )

    except Exception as e:
        logging.error(f"Error fetching models: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/custom-headings")
async def get_custom_headings():
    return JSONResponse(content=config_manager.get_custom_headings())


@router.post("/custom-headings")
async def update_custom_headings(data: dict):
    config_manager.update_custom_headings(data)
    return {"message": "Custom headings updated successfully"}


@router.get("/options")
async def get_all_options():
    return JSONResponse(content=config_manager.get_all_options())


@router.get("/options/{category}")
async def get_options_by_category(
    category: str = Path(..., description="The category of options to retrieve")
):
    options = config_manager.get_options(category)
    if options:
        return JSONResponse(content=options)
    else:
        raise HTTPException(
            status_code=404, detail=f"No options found for category: {category}"
        )


@router.post("/options/{category}")
async def update_options(
    category: str = Path(..., description="The category of options to update"),
    data: dict = Body(...),
):
    config_manager.update_options(category, data)
    return {
        "message": f"Options for category '{category}' updated successfully"
    }


@router.post("/reset-to-defaults")
async def reset_to_defaults():
    config_manager.reset_to_defaults()
    return {"message": "All configurations reset to defaults"}
