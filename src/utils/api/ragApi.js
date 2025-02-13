// API functions for RAG related operations.
import { handleApiRequest } from "../helpers/apiHelpers";

export const ragApi = {
    fetchCollections: () => {
        return handleApiRequest({
            apiCall: () => fetch("/api/rag/files"),
            errorMessage: "Failed to fetch collections",
        });
    },

    fetchCollectionFiles: (collectionName) => {
        return handleApiRequest({
            apiCall: () => fetch(`/api/rag/collection_files/${collectionName}`),
            errorMessage: `Error loading files for ${collectionName}`,
        });
    },

    renameCollection: (oldName, newName) => {
        return handleApiRequest({
            apiCall: () =>
                fetch("/api/rag/modify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        old_name: oldName,
                        new_name: newName,
                    }),
                }),
            successMessage: `Successfully renamed to ${newName}`,
            errorMessage: "Failed to rename collection",
        });
    },

    deleteCollection: (collectionName) => {
        return handleApiRequest({
            apiCall: () =>
                fetch(`/api/rag/delete-collection/${collectionName}`, {
                    method: "DELETE",
                }),
            successMessage: `Successfully deleted ${collectionName}`,
            errorMessage: "Failed to delete collection",
        });
    },

    deleteFile: (collectionName, fileName) => {
        return handleApiRequest({
            apiCall: () =>
                fetch("/api/rag/delete-file", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        collection_name: collectionName,
                        file_name: fileName,
                    }),
                }),
            successMessage: `Successfully deleted ${fileName}`,
            errorMessage: "Failed to delete file",
        });
    },

    extractPdfInfo: (formData) => {
        return handleApiRequest({
            apiCall: () =>
                fetch("/api/rag/extract-pdf-info", {
                    method: "POST",
                    body: formData,
                }),
            errorMessage: "Failed to extract PDF information",
        });
    },

    commitToDatabase: (data) => {
        return handleApiRequest({
            apiCall: () =>
                fetch("/api/rag/commit-to-vectordb", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                }),
            successMessage: "Successfully committed to database",
            errorMessage: "Failed to commit data to database",
        });
    },
};
