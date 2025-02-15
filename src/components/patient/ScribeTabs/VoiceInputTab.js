import { Button } from "@chakra-ui/react";
import { Box, Flex, VStack, HStack, Text } from "@chakra-ui/react";
import { FaMicrophone, FaUpload } from "react-icons/fa";
import RecordingWidget from "../RecordingWidget";

const VoiceInputTab = ({
    mode,
    setMode,
    recordingProps,
    transcriptionDuration,
    processDuration,
}) => {
    return (
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
                    <Flex className="mode-selector" alignItems="center" p={1}>
                        <Box
                            className="mode-selector-indicator"
                            left={mode === "record" ? "2px" : "calc(50% - 2px)"}
                        />
                        <Flex width="full" position="relative" zIndex={1}>
                            <Button
                                className={`mode-selector-button ${mode === "record" ? "active" : ""}`}
                                leftIcon={<FaMicrophone />}
                                onClick={() => setMode("record")}
                            >
                                Live Recording
                            </Button>
                            <Button
                                className={`mode-selector-button ${mode === "upload" ? "active" : ""}`}
                                leftIcon={<FaUpload />}
                                onClick={() => setMode("upload")}
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
                        <Text>Transcription: {transcriptionDuration}s</Text>
                        <Text>|</Text>
                        <Text>Processing: {processDuration}s</Text>
                    </HStack>
                )}
            </VStack>
        </Box>
    );
};

export default VoiceInputTab;
