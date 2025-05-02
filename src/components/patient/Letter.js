import {
    useRef,
    forwardRef,
    useImperativeHandle,
    useState,
    useEffect,
} from "react";
import { useClipboard, Box } from "@chakra-ui/react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

import FloatingLetterButton from "./letter/FloatingLetterButton";
import LetterPanel from "./letter/LetterPanel";
import { useLetterTemplates } from "../../utils/hooks/useLetterTemplates";

// Animation that emerges from the button position
const emergeFromButton = keyframes`
  from {
    transform: scale(0.5) translateY(60px);
    opacity: 0;
    transform-origin: bottom right;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
    transform-origin: bottom right;
  }
`;

const AnimatedBox = styled(Box)`
    animation: ${emergeFromButton} 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)
        forwards;
    transform-origin: bottom right;
`;

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
            handleRefineLetter,
            setIsModified,
            toast,
            patient,
            setLoading: setGeneralLoading,
            onLetterToggle,
        },
        ref,
    ) => {
        // State
        const [isLetterOpen, setIsLetterOpen] = useState(false);
        const [isRefining, setIsRefining] = useState(false);
        const [refinementInput, setRefinementInput] = useState("");
        const [recentlyCopied, setRecentlyCopied] = useState(false);
        const [saveState, setSaveState] = useState("idle");
        const [dimensions, setDimensions] = useState({
            width: 650,
            height: 550,
        });

        // Refs
        const textareasRefs = useRef({});
        const saveTimerRef = useRef(null);
        const resizerRef = useRef(null);
        const buttonRef = useRef(null);

        // Hooks
        const {
            letterTemplates,
            selectedTemplate,
            additionalInstructions,
            setAdditionalInstructions,
            options,
            selectTemplate,
            getInstructions,
        } = useLetterTemplates(patient?.id);

        const { onCopy } = useClipboard(
            finalCorrespondence || "No letter attached to encounter",
        );

        // Toggle letter panel
        const toggleLetterPanel = () => {
            const newState = !isLetterOpen;
            setIsLetterOpen(newState);

            // Notify parent AND use parent's toggle function to ensure consistency
            if (onLetterToggle) onLetterToggle(newState);
            if (toggleLetterCollapse) toggleLetterCollapse(newState);
        };

        // Also add this effect to ensure local state stays in sync with parent state
        useEffect(() => {
            setIsLetterOpen(!isLetterCollapsed);
        }, [isLetterCollapsed]);

        // Clear the save timer on unmount
        useEffect(() => {
            return () => {
                if (saveTimerRef.current) {
                    clearTimeout(saveTimerRef.current);
                }
            };
        }, []);

        // Functions
        const autoResizeTextarea = () => {
            const textarea = textareasRefs.current.letter;
            if (textarea) {
                textarea.style.height = "auto";
                textarea.style.height = textarea.scrollHeight + "px";
            }
        };

        // Auto-resize when letter opens or content changes
        useEffect(() => {
            if (isLetterOpen) {
                setTimeout(() => {
                    autoResizeTextarea();
                }, 100);
            }
        }, [isLetterOpen, finalCorrespondence]);

        const handleCopy = () => {
            onCopy();
            setRecentlyCopied(true);
            setTimeout(() => setRecentlyCopied(false), 2000);
        };

        const handleSave = async () => {
            setSaveState("saving");
            try {
                await handleSaveLetter();
                setSaveState("saved");
                saveTimerRef.current = setTimeout(
                    () => setSaveState("idle"),
                    2000,
                );
            } catch (error) {
                console.error("Error saving letter:", error);
                setSaveState("idle");
            }
        };

        const handleRefinement = async () => {
            if (!patient || !refinementInput.trim()) return;

            await handleRefineLetter({
                patient,
                additionalInstructions: getInstructions(),
                refinementInput,
                options,
                onSuccess: () => {
                    setRefinementInput("");
                    setIsRefining(false);
                },
            });
        };

        // Resize functionality
        const handleMouseDown = (e) => {
            e.preventDefault();
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        };

        const handleMouseMove = (e) => {
            setDimensions((prev) => ({
                width: Math.max(
                    400,
                    prev.width -
                        (e.clientX -
                            resizerRef.current.getBoundingClientRect().left),
                ),
                height: Math.max(
                    300,
                    prev.height -
                        (e.clientY -
                            resizerRef.current.getBoundingClientRect().top),
                ),
            }));
        };

        const handleMouseUp = () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };

        // Imperative handle for parent components to call methods
        useImperativeHandle(ref, () => ({
            autoResizeTextarea,
            openLetter: () => setIsLetterOpen(true),
        }));

        return (
            <Box
                position="fixed"
                bottom="20px"
                right="20px"
                zIndex="1000"
                className="hover-letter-box"
            >
                {/* Always render the button so it stays clickable when panel is open */}
                <FloatingLetterButton
                    onClick={toggleLetterPanel}
                    isActive={isLetterOpen}
                    ref={buttonRef}
                />

                {isLetterOpen && (
                    <AnimatedBox
                        position="absolute"
                        bottom="80px" // Position above the button
                        right="0px"
                    >
                        <LetterPanel
                            dimensions={dimensions}
                            resizerRef={resizerRef}
                            handleMouseDown={handleMouseDown}
                            onClose={toggleLetterPanel}
                            finalCorrespondence={finalCorrespondence}
                            setFinalCorrespondence={setFinalCorrespondence}
                            letterLoading={loading}
                            handleGenerateLetterClick={
                                handleGenerateLetterClick
                            }
                            handleSaveLetter={handleSave}
                            setIsModified={setIsModified}
                            letterTemplates={letterTemplates}
                            selectedTemplate={selectedTemplate}
                            selectTemplate={selectTemplate}
                            additionalInstructions={additionalInstructions}
                            setAdditionalInstructions={
                                setAdditionalInstructions
                            }
                            refinementInput={refinementInput}
                            setRefinementInput={setRefinementInput}
                            handleRefinement={handleRefinement}
                            isRefining={isRefining}
                            setIsRefining={setIsRefining}
                            textareaRef={(el) =>
                                (textareasRefs.current.letter = el)
                            }
                            recentlyCopied={recentlyCopied}
                            saveState={saveState}
                            handleCopy={handleCopy}
                        />
                    </AnimatedBox>
                )}
            </Box>
        );
    },
);

export default Letter;
