import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  VStack,
  IconButton,
  useToast,
  Flex,
  List,
  ListItem,
  Collapse,
  Button,
  Input,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Spinner,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  DeleteIcon,
  AddIcon,
} from "@chakra-ui/icons";
import { FaFolder, FaFolderOpen, FaFile } from "react-icons/fa";
import {
  fetchCollections,
  fetchFilesForCollection,
  handleRename,
  handleDelete,
  extractPdfInfo,
  commitToDatabase,
  formatCollectionName,
  deleteFile,
} from "./ragUtils";
import RagChat from "./RagChat";

const Rag = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isDocumentExplorerCollapsed, setIsDocumentExplorerCollapsed] =
    useState(true);
  const [isUploaderCollapsed, setIsUploaderCollapsed] = useState(true);
  const [expandedCollections, setExpandedCollections] = useState({});
  const [expandedFiles, setExpandedFiles] = useState({});
  const [pdfFile, setPdfFile] = useState(null);
  const [suggestedCollection, setSuggestedCollection] = useState("");
  const [customCollectionName, setCustomCollectionName] = useState("");
  const [documentSource, setDocumentSource] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [filename, setFilename] = useState(""); // State to store the filename
  const [pdfData, setPdfData] = useState(null);
  const [isOpen, setIsOpen] = useState(false); // Modal state
  const [collectionToDelete, setCollectionToDelete] = useState(null); // Track collection to delete
  const [isExtracting, setIsExtracting] = useState(false); // Loading state for PDF extraction
  const [isCommitting, setIsCommitting] = useState(false); // Loading state for database commit
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'collection' | 'file', name: string, collectionName?: string }
  const [isDeleting, setIsDeleting] = useState(false);

  const toast = useToast();

  // Chat component states
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [rawTranscription, setRawTranscription] = useState(""); // You may initialize it with relevant data

  useEffect(() => {
    fetchCollections(setCollections, setLoading, setError, toast);
  }, []);

  const toggleCollection = (collectionName) => {
    setExpandedCollections((prev) => ({
      ...prev,
      [collectionName]: !prev[collectionName],
    }));

    const collection = collections.find((c) => c.name === collectionName);
    if (collection && !collection.loaded) {
      fetchFilesForCollection(collectionName, setCollections, toast);
    }
  };

  const toggleFiles = (collectionName) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [collectionName]: !prev[collectionName],
    }));
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    setPdfFile(file);
    setFilename(file.name); // Store the filename
  };

  const handleExtractPdfInfo = async () => {
    setIsExtracting(true);
    try {
      await extractPdfInfo(
        pdfFile,
        setPdfData,
        setSuggestedCollection,
        setCustomCollectionName,
        setDocumentSource,
        setFocusArea,
        toast,
      );

      toast({
        title: "Extraction Successful",
        description: "PDF information extracted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error extracting PDF info:", error);
      toast({
        title: "Extraction Failed",
        description: "Failed to extract PDF information",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCommitToDatabase = async () => {
    if (!pdfData) {
      toast({
        title: "No Data to Commit",
        description: "Please extract PDF information first",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsCommitting(true);
    try {
      await commitToDatabase(
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
      );

      toast({
        title: "Commit Successful",
        description: "Data successfully committed to the database",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Refresh collections after committing to update the state
      fetchCollections(setCollections, setLoading, setError, toast);
    } catch (error) {
      console.error("Error committing to database:", error);
      toast({
        title: "Commit Failed",
        description: "Failed to commit data to the database",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsCommitting(false);
    }
  };

  // Open modal and set collection to delete
  const onOpen = (collectionName) => {
    setCollectionToDelete(collectionName);
    setIsOpen(true);
  };

  // Close modal
  const onClose = () => {
    setIsOpen(false);
    setCollectionToDelete(null);
  };

  const handleDeleteFile = async (collectionName, fileName) => {
    setIsDeleting(true);
    try {
      await deleteFile(
        collectionName,
        fileName,
        () => fetchCollections(setCollections, setLoading, setError, toast),
        toast,
      );

      // Update local state to reflect the deletion
      setCollections((prevCollections) =>
        prevCollections.map((collection) =>
          collection.name === collectionName
            ? {
                ...collection,
                files: collection.files.filter((file) => file !== fileName),
              }
            : collection,
        ),
      );
    } catch (error) {
      console.error("Error deleting file:", error);
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  const handleDeleteCollection = async (collectionName) => {
    setIsDeleting(true);
    try {
      await handleDelete(
        collectionName,
        () => fetchCollections(setCollections, setLoading, setError, toast),
        toast,
      );

      // Update local state to reflect the deletion
      setCollections((prevCollections) =>
        prevCollections.filter(
          (collection) => collection.name !== collectionName,
        ),
      );
    } catch (error) {
      console.error("Error deleting collection:", error);
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  const openDeleteModal = (type, name, collectionName = null) => {
    setItemToDelete({ type, name, collectionName });
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const confirmDelete = () => {
    if (itemToDelete.type === "file") {
      handleDeleteFile(itemToDelete.collectionName, itemToDelete.name);
    } else {
      handleDeleteCollection(itemToDelete.name);
    }
  };

  return (
    <Box p="5" borderRadius="md" w="100%">
      <Text fontSize="2xl" mb="4" className="headings">
        Documents
      </Text>
      <VStack spacing="5" align="stretch">
        {/* Chat Section */}
        <Box
          border="1px solid"
          borderColor="gray.300"
          p="4"
          borderRadius="md"
          className="panels-bg"
        >
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isChatCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />
                }
                onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                aria-label="Toggle chat"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>Chat With Documents</Text>
            </Flex>
          </Flex>
          <Collapse in={!isChatCollapsed}>
            <RagChat
              chatLoading={chatLoading}
              setChatLoading={setChatLoading}
              messages={messages}
              setMessages={setMessages}
              userInput={userInput}
              setUserInput={setUserInput}
              setChatExpanded={() => {}}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              rawTranscription={rawTranscription}
            />
          </Collapse>
        </Box>

        {/* Document Explorer Section */}
        <Box
          border="1px solid"
          borderColor="gray.300"
          p="4"
          borderRadius="md"
          className="panels-bg"
        >
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isDocumentExplorerCollapsed ? (
                    <ChevronRightIcon />
                  ) : (
                    <ChevronDownIcon />
                  )
                }
                onClick={() =>
                  setIsDocumentExplorerCollapsed(!isDocumentExplorerCollapsed)
                }
                aria-label="Toggle document explorer"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>Document Explorer</Text>
            </Flex>
          </Flex>
          <Collapse in={!isDocumentExplorerCollapsed}>
            <Box mt="4">
              <List spacing={3}>
                {collections.map((collection) => (
                  <ListItem
                    key={collection.name}
                    borderRadius="md"
                    overflow="hidden"
                  >
                    <Flex
                      alignItems="center"
                      p="2"
                      className="documentExplorer-style"
                      _hover={{ bg: "gray.100" }}
                    >
                      <IconButton
                        icon={
                          expandedCollections[collection.name] ? (
                            <ChevronDownIcon />
                          ) : (
                            <ChevronRightIcon />
                          )
                        }
                        onClick={() => toggleCollection(collection.name)}
                        aria-label="Toggle collection"
                        variant="ghost"
                        size="sm"
                        mr="2"
                        className="documentExplorer-button"
                      />
                      <Box
                        as={
                          expandedCollections[collection.name]
                            ? FaFolderOpen
                            : FaFolder
                        }
                        mr="2"
                        color="yellow.500"
                      />
                      <Text fontSize="md" fontWeight="medium">
                        {formatCollectionName(collection.name)}
                      </Text>
                      <Flex ml="auto">
                        <IconButton
                          icon={<EditIcon />}
                          aria-label="Rename collection"
                          onClick={() => {
                            const newName = prompt(
                              "Enter new name:",
                              collection.name,
                            );
                            if (newName)
                              handleRename(
                                collection.name,
                                newName,
                                fetchCollections,
                                toast,
                              );
                          }}
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                        />
                        <IconButton
                          icon={<DeleteIcon />}
                          aria-label="Delete collection"
                          onClick={() =>
                            openDeleteModal("collection", collection.name)
                          }
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                        />
                      </Flex>
                    </Flex>
                    <Collapse in={expandedCollections[collection.name]}>
                      <List pl="8" py="2" className="filelist-style">
                        {collection.files.length === 0 && !collection.loaded ? (
                          <ListItem>
                            <Spinner size="sm" mr="2" />
                            Loading files...
                          </ListItem>
                        ) : collection.files.length > 0 ? (
                          collection.files.map((file, index) => (
                            <ListItem
                              key={index}
                              display="flex"
                              alignItems="center"
                              py="1"
                            >
                              <Box as={FaFile} mr="2" color="blue.500" />
                              <Text fontSize="sm">{file}</Text>
                              <IconButton
                                icon={<DeleteIcon />}
                                aria-label="Delete file"
                                onClick={() =>
                                  openDeleteModal("file", file, collection.name)
                                }
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                ml="auto"
                              />
                            </ListItem>
                          ))
                        ) : (
                          <ListItem fontSize="sm" color="gray.500">
                            No files found.
                          </ListItem>
                        )}
                      </List>
                    </Collapse>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Collapse>
        </Box>

        {/* Uploader Section */}
        <Box
          border="1px solid"
          borderColor="gray.300"
          p="4"
          borderRadius="md"
          className="panels-bg"
        >
          <Flex align="center" justify="space-between">
            <Flex align="center">
              <IconButton
                icon={
                  isUploaderCollapsed ? (
                    <ChevronRightIcon />
                  ) : (
                    <ChevronDownIcon />
                  )
                }
                onClick={() => setIsUploaderCollapsed(!isUploaderCollapsed)}
                aria-label="Toggle uploader"
                variant="outline"
                size="sm"
                mr="2"
                className="collapse-toggle"
              />
              <Text>Uploader</Text>
            </Flex>
          </Flex>
          <Collapse in={!isUploaderCollapsed}>
            <VStack spacing={4} align="stretch" mt={4}>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="input-style"
              />
              <Button
                leftIcon={<AddIcon />}
                onClick={handleExtractPdfInfo}
                width="220px"
                isLoading={isExtracting}
                loadingText="Extracting..."
                className="blue-button"
                alignSelf="flex-start"
              >
                Extract PDF Info
              </Button>
              {suggestedCollection && (
                <VStack spacing={3} align="stretch" mt={2}>
                  <Text fontWeight="bold">Extracted Information</Text>
                  <FormLabel htmlFor="custom-collection">
                    Collection Name:
                  </FormLabel>
                  <Input
                    id="custom-collection"
                    placeholder="Custom Collection Name"
                    className="input-style"
                    value={customCollectionName}
                    onChange={(e) => setCustomCollectionName(e.target.value)}
                  />
                  <FormLabel htmlFor="document-source">
                    Document Source:
                  </FormLabel>
                  <Input
                    id="document-source"
                    placeholder="Document Source"
                    className="input-style"
                    value={documentSource}
                    onChange={(e) => setDocumentSource(e.target.value)}
                  />
                  <FormLabel htmlFor="focus-area">Focus Area:</FormLabel>
                  <Input
                    id="focus-area"
                    placeholder="Focus Area"
                    className="input-style"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                  />
                  <Button
                    leftIcon={<AddIcon />}
                    onClick={handleCommitToDatabase}
                    isLoading={isCommitting}
                    loadingText="Committing..."
                    className="green-button"
                    width="220px"
                    alignSelf="flex-start"
                  >
                    Commit to Database
                  </Button>
                </VStack>
              )}
            </VStack>
          </Collapse>
        </Box>
      </VStack>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {itemToDelete?.type === "file"
              ? "Delete File"
              : "Delete Collection"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isDeleting ? (
              <Spinner size="md" />
            ) : itemToDelete?.type === "file" ? (
              `Are you sure you want to delete the file "${itemToDelete.name}" from the collection "${itemToDelete.collectionName}"?`
            ) : (
              `Are you sure you want to delete the collection "${itemToDelete?.name}"?`
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              onClick={closeDeleteModal}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Rag;
