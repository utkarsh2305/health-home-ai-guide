import {
  Box,
  Flex,
  IconButton,
  Text,
  Collapse,
  Button,
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronDownIcon } from "@chakra-ui/icons";
import RecordingWidget from "./RecordingWidget";

const Transcription = ({
  isTranscriptionCollapsed,
  toggleTranscriptionCollapse,
  mode,
  toggleMode,
  handleTranscriptionComplete,
  transcriptionDuration,
  processDuration,
  name,
  dob,
  gender,
  config,
  prompts,
}) => {
  return (
    <Box p="4" borderRadius="md" className="panels-bg">
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
          <Text>Transcription</Text>
        </Flex>
        <Button size="sm" onClick={toggleMode} className="switch-mode">
          {mode === "record"
            ? "Switch to Upload Mode"
            : "Switch to Record Mode"}
        </Button>
      </Flex>
      <Collapse in={!isTranscriptionCollapsed} animateOpacity>
        <Box mt="4" borderRadius="md">
          <RecordingWidget
            mode={mode}
            toggleMode={toggleMode}
            onTranscriptionComplete={handleTranscriptionComplete}
            name={name}
            dob={dob}
            gender={gender}
            config={config}
            prompts={prompts}
          />
          {transcriptionDuration && processDuration && (
            <Text fontSize="xs" mt="2">
              {`Transcription Duration: ${transcriptionDuration}s, Processing Duration: ${processDuration}s`}
            </Text>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default Transcription;
