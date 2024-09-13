// Fetch the list of collections
export const fetchCollections = async (
  setCollections,
  setLoading,
  setError,
  toast,
) => {
  if (typeof setLoading !== "function") {
    console.error("setLoading is not a function");
    return;
  }

  setLoading(true);
  try {
    const response = await fetch("/api/rag/files");
    if (!response.ok) throw new Error("Failed to fetch collections");
    const data = await response.json();
    setCollections(
      data.files.map((name) => ({ name, files: [], loaded: false })),
    );
  } catch (error) {
    setError(error.message);
    toast({
      title: "Error loading collections",
      description: error.message,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  } finally {
    setLoading(false);
  }
};

// Fetch files for a specific collection
export const fetchFilesForCollection = async (
  collectionName,
  setCollections,
  toast,
) => {
  try {
    const response = await fetch(`/api/rag/collection_files/${collectionName}`);
    if (!response.ok) throw new Error("Failed to fetch files for collection");
    const data = await response.json();
    setCollections((prevCollections) =>
      prevCollections.map((collection) =>
        collection.name === collectionName
          ? { ...collection, files: data.files, loaded: true }
          : collection,
      ),
    );
  } catch (error) {
    toast({
      title: `Error loading files for ${collectionName}`,
      description: error.message,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
};

// Rename a collection
export const handleRename = async (
  oldName,
  newName,
  fetchCollections,
  toast,
) => {
  try {
    const response = await fetch("/api/rag/modify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ old_name: oldName, new_name: newName }),
    });

    if (!response.ok) throw new Error("Failed to rename collection");

    toast({
      title: "Collection renamed",
      description: `Successfully renamed to ${newName}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    fetchCollections(); // Refresh collections after renaming
  } catch (error) {
    toast({
      title: "Error renaming collection",
      description: error.message,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
};

// Delete a collection
export const handleDelete = async (collectionName, fetchCollections, toast) => {
  try {
    const response = await fetch(
      `/api/rag/delete-collection/${collectionName}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) throw new Error("Failed to delete collection");

    toast({
      title: "Collection deleted",
      description: `Successfully deleted ${collectionName}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    fetchCollections(); // Refresh collections after deletion
  } catch (error) {
    toast({
      title: "Error deleting collection",
      description: error.message,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
};

// Delete a file from a collection
export const deleteFile = async (
  collectionName,
  fileName,
  fetchCollections,
  toast,
) => {
  try {
    const response = await fetch("/api/rag/delete-file", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collection_name: collectionName,
        file_name: fileName,
      }),
    });

    if (!response.ok) throw new Error("Failed to delete file");

    toast({
      title: "File deleted",
      description: `Successfully deleted ${fileName} from ${collectionName}`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });

    fetchCollections(); // Refresh collections after deletion
  } catch (error) {
    toast({
      title: "Error deleting file",
      description: error.message,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
};

// Extract PDF information
export const extractPdfInfo = async (
  pdfFile,
  setPdfData,
  setSuggestedCollection,
  setCustomCollectionName,
  setDocumentSource,
  setFocusArea,
  toast,
) => {
  if (!pdfFile) {
    toast({
      title: "No file selected",
      description: "Please select a PDF file to upload",
      status: "warning",
      duration: 3000,
      isClosable: true,
    });
    return;
  }

  const formData = new FormData();
  formData.append("file", pdfFile);

  try {
    const response = await fetch("/api/rag/extract-pdf-info", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Failed to extract PDF information");

    const data = await response.json();
    setSuggestedCollection(data.disease_name);
    setCustomCollectionName(data.disease_name); // Set initial custom collection name to suggested name
    setDocumentSource(data.document_source);
    setFocusArea(data.focus_area);
    setPdfData(data);
  } catch (error) {
    toast({
      title: "Error processing PDF",
      description: error.message,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
};

// Commit data to database
export const commitToDatabase = async (
  pdfData,
  customCollectionName,
  focusArea,
  documentSource,
  filename,
  setPdfFile,
  setSuggestedCollection,
  setCustomCollectionName,
  setDocumentSource,
  setFocusArea,
  setFilename,
  setPdfData,
  toast,
) => {
  if (!pdfData) {
    toast({
      title: "No data to commit",
      description: "Please process a PDF file first",
      status: "warning",
      duration: 3000,
      isClosable: true,
    });
    return;
  }

  try {
    const response = await fetch("/api/rag/commit-to-vectordb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        disease_name: customCollectionName,
        focus_area: focusArea,
        document_source: documentSource,
        filename: filename, // Pass the filename here
      }),
    });

    if (!response.ok) throw new Error("Failed to commit data to database");

    // Optionally clear state or reset UI here
    setPdfFile(null);
    setSuggestedCollection("");
    setCustomCollectionName("");
    setDocumentSource("");
    setFocusArea("");
    setFilename("");
    setPdfData(null);
  } catch (error) {
    toast({
      title: "Error committing data",
      description: error.message,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
};

// Format collection name
export const formatCollectionName = (name) => {
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};
