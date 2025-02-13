// Component for managing audio transcription and document upload options.
import {
    Box,
    Flex,
    IconButton,
    Text,
    Collapse,
    Button,
    VStack,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    Textarea,
    HStack,
    Tabs,
    TabList,
    TabPanels,
    TabPanel,
    Tab,
    Tooltip,
    Spinner,
} from "@chakra-ui/react";
import {
    ChevronDownIcon,
    ChevronRightIcon,
    AttachmentIcon,
    CloseIcon,
} from "@chakra-ui/icons";
import {
    FaMicrophone,
    FaFileUpload,
    FaUpload,
    FaHistory,
} from "react-icons/fa";
import { MdTextFields } from "react-icons/md";
import RecordingWidget from "./RecordingWidget";
import { useEffect, useRef, useState } from "react";
import { processDocument } from "../../utils/helpers/processingHelpers";

const Transcription = ({
    isTranscriptionCollapsed,
    toggleTranscriptionCollapse,
    handleTranscriptionComplete,
    handleDocumentComplete,
    transcriptionDuration,
    processDuration,
    name,
    dob,
    gender,
    config,
    prompts,
    setLoading,
    previousVisitSummary,
    template,
}) => {
    const [tabIndex, setTabIndex] = useState(0);
    const [mode, setMode] = useState("record");
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

    useEffect(() => {
        setTabIndex(0); // Reset to Voice Input tab
    }, [name, dob]); // Dependencies that indicate a patient change

    const recordingProps = {
        mode,
        onTranscriptionComplete: (data) => {
            // Create a wrapper function that handles the data and passes it to handleTranscriptionComplete
            const processedData = {
                fields: data.fields,
                rawTranscription: data.rawTranscription,
                transcriptionDuration: data.transcriptionDuration,
                processDuration: data.processDuration,
            };
            handleTranscriptionComplete(processedData);

            // Call handleTranscriptionComplete with the processed data
            handleTranscriptionComplete(processedData);
        },
        name,
        dob,
        gender,
        config,
        prompts,
        setLoading,
        templateKey: template?.template_key,
    };

    return (
        <Box p="4" borderRadius="sm" className="panels-bg">
            <Flex align="center" justify="space-between">
                <Flex align="center">
                    <IconButton
                        icon={
                            isTranscriptionCollapsed ? (
                                <ChevronRightIcon />
                            ) : (
                                <ChevronDownIcon />
                            )
                        }
                        onClick={toggleTranscriptionCollapse}
                        aria-label="Toggle collapse"
                        variant="outline"
                        size="sm"
                        mr="2"
                        className="collapse-toggle"
                    />
                    <HStack spacing={2}>
                        <FaMicrophone size="1.2em" />
                        <Text as="h3">AI Scribe</Text>
                    </HStack>
                </Flex>
            </Flex>

            <Collapse in={!isTranscriptionCollapsed}>
                <Tabs
                    variant="enclosed"
                    mt="4"
                    index={tabIndex} // Use controlled index instead of defaultIndex
                    onChange={(index) => setTabIndex(index)} // Handle tab changes
                >
                    {" "}
                    {/* Add defaultIndex={0} here */}
                    <TabList>
                        <Tooltip label="Record a patient encounter.">
                            <Tab className="tab-style">
                                <HStack>
                                    <FaMicrophone />
                                    <Text>Voice Input</Text>
                                </HStack>
                            </Tab>
                        </Tooltip>
                        <Tooltip label="Upload a referral document to transcribe.">
                            <Tab className="tab-style">
                                <HStack>
                                    <FaFileUpload />
                                    <Text>Document Upload</Text>
                                </HStack>
                            </Tab>
                        </Tooltip>
                        {/* Conditionally render the Previous Visit Tab */}
                        {previousVisitSummary && (
                            <Tooltip label="View a brief summary of the previous visit.">
                                <Tab className="tab-style">
                                    <HStack>
                                        <FaHistory />
                                        <Text>Previous Visit</Text>
                                    </HStack>
                                </Tab>
                            </Tooltip>
                        )}
                    </TabList>
                    <TabPanels>
                        {/* Voice Recording Panel */}
                        <TabPanel className="chat-main">
                            <Box className="tab-panel-container">
                                <VStack spacing={4}>
                                    <Box
                                        position="relative"
                                        width="full"
                                        display="flex"
                                        justifyContent="center"
                                        mb={4}
                                        mt={2}
                                    >
                                        <Flex
                                            className="mode-selector"
                                            alignItems="center"
                                            p={1}
                                        >
                                            {/* Sliding indicator */}
                                            <Box
                                                className="mode-selector-indicator"
                                                left={
                                                    mode === "record"
                                                        ? "2px"
                                                        : "calc(50% - 2px)"
                                                }
                                            />

                                            {/* Buttons */}
                                            <Flex
                                                width="full"
                                                position="relative"
                                                zIndex={1}
                                            >
                                                <Button
                                                    className={`mode-selector-button ${
                                                        mode === "record"
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    leftIcon={<FaMicrophone />}
                                                    onClick={() =>
                                                        setMode("record")
                                                    }
                                                >
                                                    Live Recording
                                                </Button>
                                                <Button
                                                    className={`mode-selector-button ${
                                                        mode === "upload"
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                    leftIcon={<FaUpload />}
                                                    onClick={() =>
                                                        setMode("upload")
                                                    }
                                                >
                                                    Upload Audio
                                                </Button>
                                            </Flex>
                                        </Flex>
                                    </Box>
                                    <Box style={{ minHeight: "50px" }}>
                                        <RecordingWidget {...recordingProps} />
                                    </Box>
                                    {transcriptionDuration && (
                                        <HStack fontSize="xs" color="gray.500">
                                            <Text>
                                                Transcription:{" "}
                                                {transcriptionDuration}s
                                            </Text>
                                            <Text>|</Text>
                                            <Text>
                                                Processing: {processDuration}s
                                            </Text>
                                        </HStack>
                                    )}
                                </VStack>
                            </Box>
                        </TabPanel>

                        {/* Document Upload Panel */}
                        <TabPanel className="chat-main">
                            <Box className="tab-panel-container">
                                <VStack spacing={4} align="stretch">
                                    <Flex
                                        justify="space-between"
                                        align="center"
                                        direction="column"
                                    >
                                        {selectedFile &&
                                            !isProcessingDocument && (
                                                <Text
                                                    fontSize="sm"
                                                    color="gray.500"
                                                    mb={2}
                                                >
                                                    Selected:{" "}
                                                    {selectedFile.name}
                                                </Text>
                                            )}
                                        {showConfirmUpload &&
                                            isProcessingDocument && (
                                                <VStack>
                                                    <Spinner />
                                                    <Text
                                                        fontSize="sm"
                                                        color="gray.500"
                                                    >
                                                        Processing document...
                                                    </Text>
                                                </VStack>
                                            )}
                                        {showConfirmUpload &&
                                            !isProcessingDocument && (
                                                <Text
                                                    fontSize="sm"
                                                    color="gray.500"
                                                >
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
                                                        leftIcon={
                                                            <AttachmentIcon />
                                                        }
                                                        className="blue-button"
                                                        size="lg"
                                                        height="35px !important"
                                                        width="150px"
                                                        onClick={() =>
                                                            fileInputRef.current?.click()
                                                        }
                                                    >
                                                        <VStack spacing={1}>
                                                            <Text>
                                                                Upload File
                                                            </Text>
                                                        </VStack>
                                                    </Button>{" "}
                                                </Tooltip>
                                            </VStack>
                                            <Text
                                                fontSize="lg"
                                                color="gray.500"
                                            >
                                                or
                                            </Text>
                                            <Tooltip label="Paste Text Content">
                                                <Button
                                                    leftIcon={<MdTextFields />}
                                                    className="switch-mode"
                                                    size="lg"
                                                    height="35px"
                                                    width="150px"
                                                    onClick={() =>
                                                        setIsTextModalOpen(true)
                                                    }
                                                >
                                                    <VStack spacing={1}>
                                                        <Text>Paste Text</Text>
                                                    </VStack>
                                                </Button>
                                            </Tooltip>
                                        </HStack>
                                    )}
                                    {showConfirmUpload &&
                                        !isProcessingDocument && (
                                            <Flex
                                                align="center"
                                                justify="center"
                                                direction="column"
                                                gap={2}
                                            >
                                                <Flex justify="center" gap={4}>
                                                    {selectedFile && (
                                                        <Button
                                                            onClick={
                                                                handleConfirmDocumentUpload
                                                            }
                                                            className="green-button"
                                                        >
                                                            Submit Document
                                                        </Button>
                                                    )}
                                                    <Button
                                                        onClick={
                                                            handleClearDocument
                                                        }
                                                        leftIcon={<CloseIcon />}
                                                        className="red-button"
                                                    >
                                                        {showClearConfirm
                                                            ? "Are you sure?"
                                                            : "Clear"}
                                                    </Button>
                                                </Flex>
                                            </Flex>
                                        )}
                                </VStack>
                            </Box>
                        </TabPanel>

                        {/* Previous Records Panel */}
                        {previousVisitSummary && (
                            <TabPanel className="chat-main">
                                <Box className="tab-panel-container">
                                    <VStack spacing={4}>
                                        {previousVisitSummary ? (
                                            <Box>
                                                <Text mt={2}>
                                                    {previousVisitSummary}
                                                </Text>
                                            </Box>
                                        ) : (
                                            <Text>
                                                No previous visit records found.
                                            </Text>
                                        )}
                                    </VStack>
                                </Box>
                            </TabPanel>
                        )}
                    </TabPanels>
                </Tabs>
            </Collapse>

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
        </Box>
    );
};

export default Transcription;
