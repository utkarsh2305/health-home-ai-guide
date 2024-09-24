import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import {
  Box,
  Flex,
  IconButton,
  Text,
  Collapse,
  VStack,
  Textarea,
  Button,
  Spinner,
  useClipboard,
} from "@chakra-ui/react";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
  RepeatIcon,
} from "@chakra-ui/icons";
import { FaSave } from "react-icons/fa";

const Letter = forwardRef(
  (
    {
      isLetterCollapsed,
      toggleLetterCollapse,
      finalCorrespondence,
      setFinalCorrespondence,
      handleSaveLetter,
      loading,
      handleGenerateLetterClick,
      setIsModified,
      toast,
    },
    ref,
  ) => {
    const textareasRefs = useRef({});
    const [recentlyCopied, setRecentlyCopied] = useState(false);
    const [saveState, setSaveState] = useState("idle"); // 'idle', 'saving', 'saved'
    const { onCopy } = useClipboard(
      finalCorrespondence || "No letter attached to encounter",
    );
    const saveTimerRef = useRef(null);

    const handleCopy = () => {
      onCopy();
      setRecentlyCopied(true);
      setTimeout(() => setRecentlyCopied(false), 2000);
    };

    const handleSave = async () => {
      setSaveState("saving");
      const startTime = Date.now();

      try {
        await handleSaveLetter();
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 500 - elapsedTime);

        saveTimerRef.current = setTimeout(() => {
          setSaveState("saved");
          // Show toast notification here
          toast({
            title: "Success",
            description: "Letter saved successfully.",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          saveTimerRef.current = setTimeout(() => setSaveState("idle"), 2000);
        }, remainingTime);
      } catch (error) {
        console.error("Error saving letter:", error);
        setSaveState("idle");
        // Show error toast
        toast({
          title: "Error",
          description: "Failed to save the letter. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    };
    useEffect(() => {
      return () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
      };
    }, []);

    const getSaveButtonProps = () => {
      switch (saveState) {
        case "saving":
          return {
            leftIcon: <Spinner size="sm" />,
            children: "Saving...",
          };
        case "saved":
          return {
            leftIcon: <CheckIcon />,
            children: "Saved!",
          };
        default:
          return {
            leftIcon: <FaSave />,
            children: "Save Letter",
          };
      }
    };
    useImperativeHandle(ref, () => ({
      autoResizeTextarea: () => {
        autoResizeTextarea();
      },
    }));

    const autoResizeTextarea = () => {
      const textarea = textareasRefs.current.letter;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }
    };

    useEffect(() => {
      if (!isLetterCollapsed) {
        setTimeout(() => {
          autoResizeTextarea();
        }, 100);
      }
    }, [isLetterCollapsed]);

    useEffect(() => {
      if (finalCorrespondence) autoResizeTextarea();
    }, [finalCorrespondence]);

    return (
      <Box p="4" borderRadius="md" className="panels-bg">
        <Flex align="center" justify="space-between">
          <Flex align="center">
            <IconButton
              icon={
                isLetterCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />
              }
              onClick={toggleLetterCollapse}
              aria-label="Toggle collapse"
              variant="outline"
              size="sm"
              mr="2"
              className="collapse-toggle"
            />
            <Text>Letter</Text>
          </Flex>
        </Flex>
        <Collapse in={!isLetterCollapsed} animateOpacity>
          <Box mt="4" borderRadius="md">
            <VStack spacing="5">
              <Box width="100%">
                {loading ? (
                  <Flex justify="center" align="center" height="100px">
                    <Spinner size="xl" />
                  </Flex>
                ) : (
                  <Textarea
                    placeholder="Write your letter here..."
                    value={
                      finalCorrespondence || "No letter attached to encounter"
                    }
                    onChange={(e) => {
                      setFinalCorrespondence(e.target.value);
                      setIsModified(true);
                      autoResizeTextarea();
                    }}
                    rows={10}
                    style={{
                      minHeight: "150px",
                      overflowY: "hidden",
                      resize: "none",
                    }}
                    className="textarea-style"
                    ref={(el) => (textareasRefs.current.letter = el)}
                  />
                )}
              </Box>
            </VStack>
          </Box>
          <Flex mt="4" justifyContent="space-between">
            <Button
              onClick={handleGenerateLetterClick}
              className="red-button"
              leftIcon={<RepeatIcon />}
              isDisabled={loading || saveState !== "idle"}
            >
              Regenerate Letter
            </Button>
            <Flex>
              <Button
                onClick={handleCopy}
                className="blue-button"
                leftIcon={recentlyCopied ? <CheckIcon /> : <CopyIcon />}
                mr="2"
                width="150px"
                isDisabled={loading} // Remove the saveState condition
              >
                {recentlyCopied ? "Copied!" : "Copy Letter"}
              </Button>
              <Button
                onClick={handleSave}
                className="green-button"
                width="150px"
                isDisabled={loading || saveState !== "idle"}
                {...getSaveButtonProps()}
              />
            </Flex>
          </Flex>
        </Collapse>
      </Box>
    );
  },
);

export default Letter;
