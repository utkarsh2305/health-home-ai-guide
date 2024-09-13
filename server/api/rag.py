from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
)
from fastapi.exceptions import HTTPException
import os
from server.rag.chroma import ChromaManager
from server.schemas.rag import (
    ModifyCollectionRequest,
    CommitRequest,
    DeleteFileRequest,
)


router = APIRouter()

# Initialize the ChromaManager
chroma_manager = ChromaManager()


@router.get("/rag/files")
async def get_files():
    """API endpoint to retrieve the list of document collections."""
    try:
        collections = chroma_manager.list_collections()
        return {"files": collections}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching collections: {str(e)}"
        )


@router.get("/rag/collection_files/{collection_name}")
async def get_collection_files(collection_name: str):
    """API endpoint to retrieve files for a specific collection."""
    try:
        files = chroma_manager.get_files_for_collection(collection_name)
        return {"files": files}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching files for collection '{collection_name}': {str(e)}",
        )


@router.post("/rag/modify")
async def modify_collection(request: ModifyCollectionRequest):
    """API endpoint to modify the name of a collection."""
    try:
        success = chroma_manager.modify_collection_name(
            request.old_name, request.new_name
        )
        if not success:
            raise HTTPException(
                status_code=500, detail="Failed to rename collection"
            )
        return {"message": "Collection renamed successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error renaming collection: {str(e)}"
        )


@router.delete("/rag/delete-collection/{name}")
async def delete_collection_endpoint(name: str):
    """API endpoint to delete a collection."""
    try:
        success = chroma_manager.delete_collection(name)
        if not success:
            raise HTTPException(
                status_code=500, detail="Failed to delete collection"
            )
        return {"message": "Collection deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error deleting collection: {str(e)}"
        )


@router.delete("/rag/delete-file")
async def delete_file_endpoint(request: DeleteFileRequest):
    """API endpoint to delete a file from a collection."""
    try:
        success = chroma_manager.delete_file_from_collection(
            request.collection_name, request.file_name
        )
        if not success:
            raise HTTPException(
                status_code=500, detail="Failed to delete file from collection"
            )
        return {"message": "File deleted from collection successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting file from collection: {str(e)}",
        )


@router.post("/rag/extract-pdf-info")
async def extract_pdf_info(file: UploadFile = File(...)):
    """API endpoint to extract information from a PDF."""
    try:
        file_location = f"/usr/src/app/temp/{file.filename}"

        with open(file_location, "wb") as f:
            f.write(await file.read())

        # Extract text from the PDF
        extracted_text = chroma_manager.extract_text_from_pdf(file_location)
        chroma_manager.set_extracted_text(extracted_text)

        # Extract information from the PDF
        disease_name = chroma_manager.get_disease_name(extracted_text)
        focus_area = chroma_manager.get_focus_area(extracted_text)
        document_source = chroma_manager.get_document_source(extracted_text)
        filename = file.filename

        # Remove the file after processing
        os.remove(file_location)

        return {
            "disease_name": disease_name,
            "focus_area": focus_area,
            "document_source": document_source,
            "filename": filename,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing PDF: {str(e)}"
        )


@router.post("/rag/commit-to-vectordb")
async def commit_to_db(request: CommitRequest):
    """API endpoint to commit data to the database."""
    try:
        chroma_manager.commit_to_vectordb(
            request.disease_name,
            request.focus_area,
            request.document_source,
            request.filename,
        )
        return {"message": "Data committed to the database successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error committing data to database: {str(e)}",
        )
