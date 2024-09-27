import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import TextareaAutosize from "react-textarea-autosize";
import {
  Box,
  Flex,
  IconButton,
  Text,
  Collapse,
  VStack,
  Textarea,
  Button,
} from "@chakra-ui/react";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  EditIcon,
  CopyIcon,
  CheckIcon,
} from "@chakra-ui/icons";
import { FaMicrophone, FaStop, FaSave } from "react-icons/fa";

const Summary = forwardRef(
  (
    {
      isSummaryCollapsed,
      toggleSummaryCollapse,
      primaryHistory,
      setPrimaryHistory,
      additionalHistory,
      setAdditionalHistory,
      investigations,
      setInvestigations,
      encounterDetail,
      setEncounterDetail,
      impression,
      setImpression,
      encounterPlan,
      setEncounterPlan,
      handleGenerateLetter,
      handleSavePatientData,
      saveLoading,
      setIsModified,
      onCopy,
      recentlyCopied,
      customHeadings,
    },
    ref,
  ) => {
    const textareasRefs = useRef({});
    const [focusedTextarea, setFocusedTextarea] = useState(null);
    const [recordingStates, setRecordingStates] = useState({});
    const [loading, setLoading] = useState(false);
    const [cursorPositions, setCursorPositions] = useState({});
    const [recentlyRecordedTextarea, setRecentlyRecordedTextarea] =
      useState(null);
    const mediaRecorderRef = useRef({});
    const audioChunksRef = useRef({});

    const startRecording = async (key) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia is not supported in this browser.");
        alert("Your browser does not support audio recording.");
        return;
      }

      try {
        console.log(`Starting recording for ${key}`);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current[key] = new MediaRecorder(stream);
        audioChunksRef.current[key] = [];

        mediaRecorderRef.current[key].ondataavailable = (event) => {
          console.log(`Received audio data for ${key}`);
          audioChunksRef.current[key].push(event.data);
        };

        mediaRecorderRef.current[key].start();
        console.log(`Recording started for ${key}`);
        setRecordingStates((prev) => ({ ...prev, [key]: true }));
      } catch (error) {
        console.error("Error starting recording:", error);
        alert(
          "Failed to start recording. Please check your microphone permissions.",
        );
      }
      setRecordingStates((prev) => ({ ...prev, [key]: true }));
      setRecentlyRecordedTextarea(key);
    };

    const stopRecording = async (key) => {
      console.log(`Stopping recording for ${key}`);
      if (recordingStates[key] && mediaRecorderRef.current[key]) {
        mediaRecorderRef.current[key].stop();
        setRecordingStates((prev) => ({ ...prev, [key]: false }));
        setLoading(true);

        try {
          await new Promise((resolve) => {
            mediaRecorderRef.current[key].onstop = () => {
              console.log(`Recording stopped for ${key}`);
              resolve();
            };
          });
          setRecordingStates((prev) => ({ ...prev, [key]: false }));
          const audioBlob = new Blob(audioChunksRef.current[key], {
            type: "audio/wav",
          });
          console.log(
            `Audio blob created for ${key}, size: ${audioBlob.size} bytes`,
          );
          await sendRecording(key, audioBlob);
        } catch (error) {
          console.error("Error stopping recording:", error);
          alert("An error occurred while processing the recording.");
        } finally {
          setLoading(false);
        }
      } else {
        console.warn(
          `Attempted to stop recording for ${key}, but it wasn't active`,
        );
      }
    };
    const sendRecording = async (key, audioBlob) => {
      console.log(`Sending recording for ${key}`);
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.wav");
      formData.append("fieldKey", key);

      try {
        const response = await fetch("/api/dictate", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Received transcription for ${key}:`, data.transcription);

        const transcription = data.transcription || "";

        const setter = {
          primaryHistory: setPrimaryHistory,
          additionalHistory: setAdditionalHistory,
          investigations: setInvestigations,
          encounterDetail: setEncounterDetail,
          impression: setImpression,
          encounterPlan: setEncounterPlan,
        }[key];

        const currentValue = {
          primaryHistory: primaryHistory,
          additionalHistory: additionalHistory,
          investigations: investigations,
          encounterDetail: encounterDetail,
          impression: impression,
          encounterPlan: encounterPlan,
        }[key];

        const cursorPosition = cursorPositions[key] || currentValue.length;
        const newValue =
          currentValue.slice(0, cursorPosition) +
          " " +
          transcription +
          currentValue.slice(cursorPosition);
        console.log(`Updating ${key} with value:`, newValue);
        setter(newValue.trim());

        setIsModified(true);

        // Update cursor position after inserting transcription
        const newCursorPosition = cursorPosition + transcription.length + 1; // +1 for the space
        setCursorPositions((prev) => ({ ...prev, [key]: newCursorPosition }));

        // Set focus and cursor position after state update
        setTimeout(() => {
          const textarea = textareasRefs.current[key];
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            setFocusedTextarea(key); // Keep the textarea focused
          }
        }, 0);
      } catch (error) {
        console.error("Error transcribing audio:", error);
        alert("Failed to transcribe audio. Please try again.");
      }
    };
    const handleTextareaChange = (key, setter) => (e) => {
      const newValue = e.target.value;
      setter(newValue);
      setIsModified(true);

      // Update cursor position
      const cursorPosition = e.target.selectionStart;
      setCursorPositions((prev) => ({ ...prev, [key]: cursorPosition }));
    };

    const renderTextArea = (key, label, value, setter) => {
      return (
        <Box width="100%" position="relative">
          <Flex justify="space-between" align="center" mb="1">
            <Text fontSize="sm">{customHeadings[key] || label}:</Text>
          </Flex>
          <Box position="relative">
            <TextareaAutosize
              placeholder={label}
              value={value || ""}
              onChange={handleTextareaChange(key, setter)}
              onFocus={() => {
                setFocusedTextarea(key);
                setRecentlyRecordedTextarea(key);
              }}
              onBlur={(e) => handleBlur(e, key)}
              onSelect={(e) => {
                const cursorPosition = e.target.selectionStart;
                setCursorPositions((prev) => ({
                  ...prev,
                  [key]: cursorPosition,
                }));
              }}
              minRows={2}
              className="textarea-style"
              ref={(el) => (textareasRefs.current[key] = el)}
              style={{
                width: "100%",
                resize: "none",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                fontSize: "14px",
                lineHeight: "1.5",
                // Add any other styles to match your current textarea
              }}
            />
            {(focusedTextarea === key || recentlyRecordedTextarea === key) &&
              !recordingStates[key] && (
                <IconButton
                  icon={<FaMicrophone />}
                  size="sm"
                  position="absolute"
                  bottom="2"
                  right="2"
                  zIndex="1"
                  className="switch-mode"
                  aria-label="Start recording"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => startRecording(key)}
                />
              )}
            {recordingStates[key] && (
              <IconButton
                icon={<FaStop />}
                size="sm"
                position="absolute"
                bottom="2"
                right="2"
                zIndex="1"
                colorScheme="red"
                aria-label="Stop recording"
                onClick={() => stopRecording(key)}
              />
            )}
          </Box>
        </Box>
      );
    };

    const handleBlur = (e, key) => {
      // Check if the blur event was triggered by clicking the recording button
      if (
        e.relatedTarget &&
        (e.relatedTarget.getAttribute("aria-label") === "Start recording" ||
          e.relatedTarget.getAttribute("aria-label") === "Stop recording")
      ) {
        e.preventDefault(); // Prevent blur effect
        return;
      }
      setFocusedTextarea(null);
    };

    useImperativeHandle(ref, () => ({}));

    useEffect(() => {}, [
      primaryHistory,
      additionalHistory,
      investigations,
      encounterDetail,
      impression,
      encounterPlan,
    ]);

    return (
      <Box p="4" borderRadius="md" className="panels-bg">
        <Flex align="center" justify="space-between">
          <Flex align="center">
            <IconButton
              icon={
                isSummaryCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />
              }
              onClick={toggleSummaryCollapse}
              aria-label="Toggle collapse"
              variant="outline"
              size="sm"
              mr="2"
              className="collapse-toggle"
            />
            <Text>Summary</Text>
          </Flex>
        </Flex>
        <Collapse in={!isSummaryCollapsed} animateOpacity>
          <Box mt="4" borderRadius="md">
            <VStack spacing="5">
              {renderTextArea(
                "primaryHistory",
                "Primary History",
                primaryHistory,
                setPrimaryHistory,
              )}
              {renderTextArea(
                "additionalHistory",
                "Additional History",
                additionalHistory,
                setAdditionalHistory,
              )}
              {renderTextArea(
                "investigations",
                "Investigations",
                investigations,
                setInvestigations,
              )}
              {renderTextArea(
                "encounterDetail",
                "Encounter Detail",
                encounterDetail,
                setEncounterDetail,
              )}
              {renderTextArea(
                "impression",
                "Impression",
                impression,
                setImpression,
              )}
              {renderTextArea(
                "encounterPlan",
                "Encounter Plan",
                encounterPlan,
                setEncounterPlan,
              )}
            </VStack>
          </Box>
          <Flex mt="4" justifyContent="space-between">
            <Flex>
              <Button
                onClick={handleGenerateLetter}
                className="red-button"
                leftIcon={<EditIcon />}
                mr="2"
                isDisabled={saveLoading}
              >
                Generate Letter
              </Button>
            </Flex>
            <Flex>
              <Button
                onClick={onCopy}
                width="190px"
                className="blue-button"
                leftIcon={recentlyCopied ? <CheckIcon /> : <CopyIcon />}
                mr="2"
              >
                {recentlyCopied ? "Copied!" : "Copy to Clipboard"}
              </Button>
              <Button
                onClick={handleSavePatientData}
                className="green-button"
                isLoading={saveLoading}
                loadingText="Saving"
                width="190px"
                leftIcon={saveLoading ? null : <FaSave />}
              >
                {saveLoading ? "Saving..." : "Save Encounter"}
              </Button>
            </Flex>
          </Flex>
        </Collapse>
      </Box>
    );
  },
);

export default Summary;
