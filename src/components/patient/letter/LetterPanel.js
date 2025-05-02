import React from "react";
import { Box, Flex, VStack, Text, IconButton } from "@chakra-ui/react";
import { FaEnvelope } from "react-icons/fa";
import { CloseIcon } from "@chakra-ui/icons";

import LetterEditor from "./LetterEditor";
import TemplateSelector from "./TemplateSelector";
import CustomInstructionsInput from "./CustomInstructionsInput";
import PanelFooterActions from "./PanelFooterActions";
import RefinementPanel from "./RefinementPanel";

const LetterPanel = ({
    dimensions,
    resizerRef,
    handleMouseDown,
    onClose,
    finalCorrespondence,
    setFinalCorrespondence,
    letterLoading,
    handleGenerateLetterClick,
    handleSaveLetter,
    setIsModified,
    letterTemplates,
    selectedTemplate,
    selectTemplate,
    additionalInstructions,
    setAdditionalInstructions,
    refinementInput,
    setRefinementInput,
    handleRefinement,
    isRefining,
    setIsRefining,
    textareaRef,
    // autoResizeTextarea, // We won't need this prop anymore
    recentlyCopied,
    saveState,
    handleCopy,
}) => {
    return (
        <Box
            width={`${dimensions.width}px`}
            height={`${dimensions.height}px`}
            borderRadius="xl"
            boxShadow="md"
            overflow="hidden" // Keep hidden on the outer container
            position="relative"
            className="floating-panel"
            bg="white"
        >
            <Box
                borderRadius="xl"
                display="flex"
                flexDirection="column"
                height="100%"
            >
                {/* Header */}
                <Flex
                    align="center"
                    justify="space-between"
                    p="4"
                    borderBottomWidth="1px"
                    borderColor="gray.200"
                    flexShrink={0} // Prevent header from shrinking
                >
                    <Flex align="center">
                        <FaEnvelope size="1em" style={{ marginRight: "8px" }} />
                        <Text>Patient Letter</Text>
                    </Flex>
                    <IconButton
                        icon={<CloseIcon />}
                        onClick={onClose}
                        aria-label="Close chat"
                        variant="outline"
                        size="sm"
                        className="collapse-toggle"
                    />
                </Flex>

                {/* Content Area - Now a Flex Column */}
                <Box
                    flex="1" // Takes remaining vertical space
                    display="flex"
                    flexDirection="column"
                    overflow="hidden" // Prevent this Box from scrolling, children will handle it
                >
                    {/* Letter Editor Wrapper - Takes flexible space */}
                    <Box flex="1" overflow="hidden" minHeight="0">
                        {" "}
                        {/* overflow="hidden" + minHeight="0" is key for flex children */}
                        <LetterEditor
                            finalCorrespondence={finalCorrespondence}
                            onLetterChange={(value) => {
                                setFinalCorrespondence(value);
                                setIsModified(true);
                            }}
                            setIsRefining={setIsRefining}
                            loading={letterLoading}
                            isRefining={isRefining}
                            textareaRef={textareaRef}
                            // autoResizeTextarea removed
                            refinementPanel={
                                <RefinementPanel
                                    refinementInput={refinementInput}
                                    setRefinementInput={setRefinementInput}
                                    handleRefinement={handleRefinement}
                                    loading={letterLoading}
                                    setIsRefining={setIsRefining}
                                />
                            }
                        />
                    </Box>

                    {/* Template Selection Area - Fixed size below editor */}
                    <Box pt={5} flexShrink={0}>
                        {" "}
                        {/* Prevent this section from shrinking */}
                        <TemplateSelector
                            letterTemplates={letterTemplates}
                            selectedTemplate={selectedTemplate}
                            onTemplateSelect={selectTemplate}
                        />
                        {selectedTemplate === "custom" && (
                            <Box pt={5}>
                                <CustomInstructionsInput
                                    additionalInstructions={
                                        additionalInstructions
                                    }
                                    setAdditionalInstructions={
                                        setAdditionalInstructions
                                    }
                                />
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Footer */}
                <Box
                    p="4"
                    borderTopWidth="1px"
                    borderColor="gray.200"
                    flexShrink={0} // Prevent footer from shrinking
                >
                    <PanelFooterActions
                        handleGenerateLetter={handleGenerateLetterClick}
                        handleCopy={handleCopy}
                        handleSave={handleSaveLetter}
                        recentlyCopied={recentlyCopied}
                        saveState={saveState}
                        letterLoading={letterLoading}
                        additionalInstructions={additionalInstructions}
                    />
                </Box>
            </Box>

            {/* Resizer */}
            <Box
                ref={resizerRef}
                position="absolute"
                top="0"
                left="0"
                width="20px"
                height="20px"
                bg="transparent"
                cursor="nwse-resize"
                onMouseDown={handleMouseDown}
            />
        </Box>
    );
};

export default LetterPanel;
