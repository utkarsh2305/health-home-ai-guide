import {
    Box,
    VStack,
    Flex,
    Button,
    HStack,
    Text,
    Spinner,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    Textarea,
    Tooltip,
} from "@chakra-ui/react";
import { AttachmentIcon, CloseIcon } from "@chakra-ui/icons";
import { MdTextFields } from "react-icons/md";
import { useState, useRef, useEffect } from "react";
import { processDocument } from "../../../utils/helpers/processingHelpers";

const DocumentUploadTab = ({
    handleDocumentComplete,
    name,
    dob,
    gender,
    setLoading,
}) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isTextModalOpen, setIsTextModalOpen] = useState(false);
    const [textInput, setTextInput] = useState("");
    const [isProcessingDocument, setIsProcessingDocument] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showConfirmUpload, setShowConfirmUpload] = useState(false);
    const fileInputRef = useRef(null);
    const toast = useToast();

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setShowConfirmUpload(true);
            toast({
                title: "File selected",
                description: `${file.name} has been selected`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleConfirmDocumentUpload = async () => {
        setIsProcessingDocument(true);
        setLoading(true);

        try {
            await processDocument(
                selectedFile,
                { name, dob, gender },
                (data) => {
                    // Create a wrapper function that handles the data and passes it to handleDocumentComplete
                    const processedData = {
                        primaryHistory: data.primaryHistory,
                        additionalHistory: data.additionalHistory,
                        investigations: data.investigations,
                        processDuration: data.processDuration,
                    };

                    // Call handleDocumentComplete with the processed data
                    handleDocumentComplete(processedData);

                    setSelectedFile(null);
                    setShowConfirmUpload(false);

                    toast({
                        title: "Success",
                        description: "Document processed successfully",
                        status: "success",
                        duration: null,
                        isClosable: true,
                    });
                },
                (error) => {
                    toast({
                        title: "Error",
                        description: error.message,
                        status: "error",
                        duration: 3000,
                        isClosable: true,
                    });
                },
            );
        } catch (error) {
            console.error("Error processing document:", error);
            toast({
                title: "Error",
                description: "Failed to process document",
                status: "error",
                duration: null,
                isClosable: true,
            });
        } finally {
            setIsProcessingDocument(false);
            setLoading(false);
        }
    };

    const handleClearDocument = () => {
        if (!showClearConfirm) {
            setShowClearConfirm(true);
            return;
        }
        setSelectedFile(null);
        setTextInput("");
        setShowConfirmUpload(false);
        setShowClearConfirm(false);
    };

    const handleTextSubmit = () => {
        if (!textInput.trim()) {
            toast({
                title: "No text entered",
                description: "Please enter some text to process",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        const textFile = new File([textInput], "uploaded-text.txt", {
            type: "text/plain",
        });
        setSelectedFile(textFile);
        setShowConfirmUpload(true);
        setIsTextModalOpen(false);
    };

    useEffect(() => {
        let timeoutId;
        if (showClearConfirm) {
            timeoutId = setTimeout(() => {
                setShowClearConfirm(false);
            }, 3000); // Reset after 3 seconds
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [showClearConfirm]);

    return (
        <Box className="tab-panel-container">
            <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center" direction="column">
                    {selectedFile && !isProcessingDocument && (
                        <Text fontSize="sm" color="gray.500" mb={2}>
                            Selected: {selectedFile.name}
                        </Text>
                    )}
                    {showConfirmUpload && isProcessingDocument && (
                        <VStack>
                            <Spinner />
                            <Text fontSize="sm" color="gray.500">
                                Processing document...
                            </Text>
                        </VStack>
                    )}
                    {showConfirmUpload && !isProcessingDocument && (
                        <Text fontSize="sm" color="gray.500">
                            Ready to Upload?
                        </Text>
                    )}
                </Flex>

                {!showConfirmUpload && (
                    <HStack spacing={4} justify="center">
                        <VStack>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                                style={{ display: "none" }}
                            />
                            <Tooltip label="Upload Document (PDF, Word, Images)">
                                <Button
                                    leftIcon={<AttachmentIcon />}
                                    className="blue-button"
                                    size="lg"
                                    height="35px !important"
                                    width="150px"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    <VStack spacing={1}>
                                        <Text>Upload File</Text>
                                    </VStack>
                                </Button>
                            </Tooltip>
                        </VStack>
                        <Text fontSize="lg" color="gray.500">
                            or
                        </Text>
                        <Tooltip label="Paste Text Content">
                            <Button
                                leftIcon={<MdTextFields />}
                                className="switch-mode"
                                size="lg"
                                height="35px"
                                width="150px"
                                onClick={() => setIsTextModalOpen(true)}
                            >
                                <VStack spacing={1}>
                                    <Text>Paste Text</Text>
                                </VStack>
                            </Button>
                        </Tooltip>
                    </HStack>
                )}
                {showConfirmUpload && !isProcessingDocument && (
                    <Flex
                        align="center"
                        justify="center"
                        direction="column"
                        gap={2}
                    >
                        <Flex justify="center" gap={4}>
                            {selectedFile && (
                                <Button
                                    onClick={handleConfirmDocumentUpload}
                                    className="green-button"
                                >
                                    Submit Document
                                </Button>
                            )}
                            <Button
                                onClick={handleClearDocument}
                                leftIcon={<CloseIcon />}
                                className="red-button"
                            >
                                {showClearConfirm ? "Are you sure?" : "Clear"}
                            </Button>
                        </Flex>
                    </Flex>
                )}

                {/* Text Input Modal */}
                <Modal
                    isOpen={isTextModalOpen}
                    onClose={() => setIsTextModalOpen(false)}
                    size="xl"
                >
                    <ModalOverlay />
                    <ModalContent className="modal-style">
                        <ModalHeader>Upload Text</ModalHeader>
                        <ModalBody>
                            <Textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Paste your text here..."
                                size="lg"
                                minHeight="400px"
                                className="textarea-style"
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                className="red-button"
                                mr={3}
                                onClick={() => setIsTextModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="green-button"
                                onClick={handleTextSubmit}
                            >
                                Submit
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </VStack>
        </Box>
    );
};

export default DocumentUploadTab;
