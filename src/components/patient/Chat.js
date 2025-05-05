import {
    Box,
    Flex,
    IconButton,
    Text,
    Tooltip,
    Input,
    Spinner,
    Button,
    HStack,
    Collapse,
    VStack,
} from "@chakra-ui/react";
import {
    CloseIcon,
    ArrowUpIcon,
    QuestionIcon,
    ChatIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from "@chakra-ui/icons";
import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const loadingGradient = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

// Updated animation that emerges from button position
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

const slideUp = keyframes`
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const LoadingBox = styled(Box)`
    position: relative;
    overflow: hidden;

    &::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
        );
        animation: ${loadingGradient} 1.5s ease-in-out infinite;
        background-size: 200% 100%;
    }
`;

const AnimatedHStack = styled(HStack)`
    animation: ${slideUp} 0.5s ease-out forwards;
`;

const AnimatedChatPanel = styled(Box)`
    animation: ${emergeFromButton} 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)
        forwards;
    transform-origin: bottom right;
`;

// Function to parse message content with <think> tags
const parseMessageContent = (content) => {
    const thinkRegex = /<think>(.*?)<\/think>/s; // 's' flag allows '.' to match newlines
    const match = content.match(thinkRegex);

    // If we have a complete <think></think> tag, parse it normally
    if (match) {
        const thinkContent = match[1].trim();
        const parts = content.split(match[0]); // Split by the full <think>...</think> block
        const beforeContent = parts[0].trim();
        const afterContent = parts.slice(1).join(match[0]).trim(); // Join back in case of multiple (though we handle first)

        return {
            hasThinkTag: true,
            beforeContent,
            thinkContent,
            afterContent,
        };
    }

    // Check for an unclosed <think> tag during streaming
    const openThinkMatch = content.match(/<think>(.*?)$/s);
    if (openThinkMatch) {
        // We have an opening <think> tag without a closing one yet (during streaming)
        const beforeContent = content.split("<think>")[0].trim();
        const partialThinkContent = openThinkMatch[1].trim();

        return {
            hasThinkTag: true,
            beforeContent,
            thinkContent: partialThinkContent,
            afterContent: "", // No after content yet as the tag isn't closed
            isPartialThinking: true, // Flag to indicate streaming status
        };
    }

    return {
        hasThinkTag: false,
        content, // Return original content if no tag
    };
};

const Chat = ({
    chatExpanded,
    setChatExpanded,
    chatLoading,
    messages,
    setMessages,
    userInput,
    setUserInput,
    handleChat,
    showSuggestions,
    setShowSuggestions,
    rawTranscription,
    currentTemplate,
    patientData,
    patientId,
    onChatToggle,
}) => {
    const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
    const messagesEndRef = useRef(null);
    const resizerRef = useRef(null);
    const chatButtonRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(null);
    const [userSettings, setUserSettings] = useState(null);
    const isTemplateLoaded = currentTemplate?.fields !== undefined;

    const filteredMessages = messages.filter(
        (message) => message.role !== "system",
    );

    const toggleChat = () => {
        const newState = !chatExpanded;
        setChatExpanded(newState); // This only updates local state

        // Call parent toggle handler to ensure proper coordination
        if (onChatToggle) onChatToggle(newState);
    };

    // Function to toggle thinking visibility for a specific message
    const toggleThinkingVisibility = (messageIndex) => {
        setMessages((prevMessages) =>
            prevMessages.map((msg, idx) => {
                // Find the correct message in the full messages array
                if (idx === messageIndex) {
                    return {
                        ...msg,
                        // Toggle the state, default to false if undefined
                        isThinkingExpanded: !(msg.isThinkingExpanded ?? false),
                    };
                }
                return msg;
            }),
        );
    };

    useEffect(() => {
        const fetchUserSettings = async () => {
            try {
                const response = await fetch("/api/config/user");
                if (!response.ok)
                    throw new Error("Failed to fetch user settings");
                const data = await response.json();
                setUserSettings(data);
            } catch (error) {
                console.error("Error fetching user settings:", error);
            }
        };
        fetchUserSettings();
    }, []);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    useEffect(() => {
        setMessages([]);
        setUserInput("");
        setShowSuggestions(true); // Reset suggestions flag
    }, [patientId, setMessages, setUserInput, setShowSuggestions]);

    const handleSendMessage = async (message) => {
        if (message.trim()) {
            handleChat(
                message,
                messages,
                patientData,
                currentTemplate,
                rawTranscription,
            );
            setUserInput("");
            setShowSuggestions(false);
        }
    };

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

    // Show quick chat buttons only when we have messages and not showing suggestions in main area
    const shouldShowQuickChatButtons =
        filteredMessages.length > 0 &&
        userSettings &&
        (!showSuggestions || filteredMessages.length > 0);

    return (
        <Box
            position="fixed"
            bottom="20px"
            right="20px"
            zIndex="1000"
            className="hover-chat-box"
        >
            {/* Always render the button for toggling */}
            <IconButton
                icon={<ChatIcon boxSize="1.5em" />}
                colorScheme="purple"
                onClick={toggleChat}
                aria-label={chatExpanded ? "Close Chat" : "Open Chat"}
                borderRadius="full"
                size="lg"
                bg={chatExpanded ? "#b096d3" : "#c4a7e7"} // Darker when active
                className={`chat-icon ${chatExpanded ? "chat-icon-active" : ""}`}
                boxShadow={
                    chatExpanded ? "0 0 10px rgba(196, 167, 231, 0.6)" : "md"
                }
                width="3em"
                height="3em"
                fontSize="2xl"
                ref={chatButtonRef}
                _hover={{
                    bg: chatExpanded ? "#a085c2" : "#b096d3",
                    transform: "scale(1.05)",
                }}
                transition="all 0.2s ease-in-out"
            />

            {chatExpanded && (
                <AnimatedChatPanel
                    position="absolute"
                    bottom="80px" // Position above the button
                    right="0px"
                    width={`${dimensions.width}px`}
                    height={`${dimensions.height - 24}px`}
                    borderRadius="xl"
                    boxShadow="md"
                    overflow="hidden"
                    className="floating-panel"
                    display="flex"
                    flexDirection="column"
                >
                    {/* Header */}
                    <Flex
                        align="center"
                        justify="space-between"
                        p="3"
                        borderBottomWidth="1px"
                        borderColor="inherit"
                        className="panel-header"
                    >
                        <Text fontWeight="bold">Chat With Phlox</Text>
                        <IconButton
                            icon={<CloseIcon />}
                            onClick={toggleChat}
                            aria-label="Close chat"
                            variant="ghost"
                            size="sm"
                            className="collapse-toggle"
                        />
                    </Flex>

                    {/* Messages Area */}
                    <Box
                        flex="1"
                        overflowY="auto"
                        p="4"
                        className="floating-main"
                    >
                        {messages.map((message, index) => {
                            // Skip system messages for rendering
                            if (message.role === "system") return null;

                            // Parse the content for <think> tags
                            const parsed = parseMessageContent(
                                message.content || "",
                            );
                            // Determine if the 'Thinking' section is expanded for this message
                            const isThinkingExpanded =
                                message.isThinkingExpanded ?? false;

                            return (
                                <Flex
                                    key={`${index}-${message.role}-${parsed.hasThinkTag}`}
                                    justify={
                                        message.role === "assistant"
                                            ? "flex-start"
                                            : "flex-end"
                                    }
                                    mb="3"
                                >
                                    <Box
                                        className={`message-box ${message.role}`}
                                        px="3"
                                        py="2"
                                        maxWidth="85%"
                                        fontSize="sm"
                                        position="relative"
                                    >
                                        {message.loading ? (
                                            <Spinner size="sm" mt="1" />
                                        ) : (
                                            <VStack
                                                align="start"
                                                spacing={1}
                                                width="100%"
                                            >
                                                {/* Render content before <think> tag */}
                                                {parsed.hasThinkTag &&
                                                    parsed.beforeContent && (
                                                        <Text whiteSpace="pre-wrap">
                                                            {
                                                                parsed.beforeContent
                                                            }
                                                        </Text>
                                                    )}

                                                {/* Handle Thinking block */}
                                                {parsed.hasThinkTag && (
                                                    <Box width="100%" my={1}>
                                                        <Flex
                                                            align="center"
                                                            onClick={() =>
                                                                toggleThinkingVisibility(
                                                                    index,
                                                                )
                                                            }
                                                            cursor="pointer"
                                                            className="thinking-toggle"
                                                            p={1}
                                                            borderRadius="sm"
                                                        >
                                                            <Text mr="2">
                                                                Thinking{" "}
                                                                {parsed.isPartialThinking
                                                                    ? "..."
                                                                    : ""}
                                                            </Text>
                                                            <IconButton
                                                                aria-label={
                                                                    isThinkingExpanded
                                                                        ? "Collapse thinking"
                                                                        : "Expand thinking"
                                                                }
                                                                icon={
                                                                    isThinkingExpanded ? (
                                                                        <ChevronUpIcon />
                                                                    ) : (
                                                                        <ChevronDownIcon />
                                                                    )
                                                                }
                                                                variant="outline"
                                                                size="10"
                                                                mr="2"
                                                                className="collapse-toggle"
                                                            />
                                                        </Flex>
                                                        <Collapse
                                                            in={
                                                                isThinkingExpanded
                                                            }
                                                            animateOpacity
                                                        >
                                                            <Box
                                                                className="thinking-block"
                                                                mt={2}
                                                                p={3}
                                                                borderLeftWidth="3px"
                                                                borderColor="blue.300"
                                                            >
                                                                <Text whiteSpace="pre-wrap">
                                                                    {
                                                                        parsed.thinkContent
                                                                    }
                                                                </Text>
                                                            </Box>
                                                        </Collapse>
                                                    </Box>
                                                )}

                                                {/* Render content after <think> tag or full content if no tag */}
                                                <Text whiteSpace="pre-wrap">
                                                    {parsed.hasThinkTag
                                                        ? parsed.afterContent
                                                        : parsed.content}
                                                </Text>

                                                {/* Render context links */}
                                                {message.role === "assistant" &&
                                                    message.context && (
                                                        <HStack
                                                            wrap="wrap"
                                                            spacing={1}
                                                            mt={1}
                                                        >
                                                            {Object.keys(
                                                                message.context,
                                                            ).map((key) => (
                                                                <Tooltip
                                                                    key={`${index}-context-${key}`}
                                                                    label={
                                                                        message
                                                                            .context[
                                                                            key
                                                                        ]
                                                                    }
                                                                    placement="top"
                                                                    hasArrow
                                                                    fontSize="xs"
                                                                    maxWidth="400px"
                                                                    shouldWrapChildren
                                                                    bg="gray.700"
                                                                    color="white"
                                                                >
                                                                    <Text
                                                                        as="span"
                                                                        color="blue.500"
                                                                        cursor="pointer"
                                                                        fontSize="xs"
                                                                        _hover={{
                                                                            textDecoration:
                                                                                "underline",
                                                                        }}
                                                                    >
                                                                        [{key}]
                                                                    </Text>
                                                                </Tooltip>
                                                            ))}
                                                        </HStack>
                                                    )}
                                            </VStack>
                                        )}
                                    </Box>
                                </Flex>
                            );
                        })}

                        {/* Chat suggestions - only show when no non-system messages exist */}
                        {showSuggestions &&
                            filteredMessages.length === 0 &&
                            userSettings && (
                                <Flex
                                    justify="center"
                                    align="center"
                                    flexWrap="wrap"
                                    h="80%"
                                    flexDirection="column"
                                >
                                    <Flex wrap="wrap" justify="center">
                                        {[1, 2, 3].map((num) => {
                                            const title =
                                                userSettings[
                                                    `quick_chat_${num}_title`
                                                ];
                                            const prompt =
                                                userSettings[
                                                    `quick_chat_${num}_prompt`
                                                ];
                                            if (!title || !prompt) return null;
                                            return (
                                                <Button
                                                    key={num}
                                                    leftIcon={<QuestionIcon />}
                                                    m="1.5"
                                                    size="md"
                                                    onClick={() =>
                                                        handleSendMessage(
                                                            prompt,
                                                        )
                                                    }
                                                    className="chat-suggestions"
                                                    variant="outline"
                                                >
                                                    {title}
                                                </Button>
                                            );
                                        })}
                                    </Flex>
                                </Flex>
                            )}

                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input Area */}
                    <Box p="3" borderTopWidth="1px" borderColor="inherit">
                        {/* Quick chat buttons row - only show after messages have been sent */}
                        {shouldShowQuickChatButtons && (
                            <AnimatedHStack
                                spacing="2"
                                mb="2"
                                justifyContent="space-between"
                                width="100%"
                            >
                                {[1, 2, 3].map((num) => {
                                    const title =
                                        userSettings[`quick_chat_${num}_title`];
                                    const prompt =
                                        userSettings[
                                            `quick_chat_${num}_prompt`
                                        ];
                                    if (!title || !prompt) return null;
                                    const showButtonTooltip = title.length > 25;

                                    return (
                                        <Tooltip
                                            key={num}
                                            label={title}
                                            placement="top"
                                            isDisabled={!showButtonTooltip}
                                            hasArrow
                                            fontSize="xs"
                                        >
                                            <Button
                                                leftIcon={<QuestionIcon />}
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    handleSendMessage(prompt)
                                                }
                                                className="quick-chat-buttons-collapsed"
                                                flex="1"
                                                minWidth="0"
                                            >
                                                <Box
                                                    className="quick-chat-buttons-text"
                                                    as="span"
                                                    overflow="hidden"
                                                    textOverflow="ellipsis"
                                                    whiteSpace="nowrap"
                                                    display="block"
                                                    textAlign="left"
                                                >
                                                    {title}
                                                </Box>
                                            </Button>
                                        </Tooltip>
                                    );
                                })}
                            </AnimatedHStack>
                        )}

                        <Flex mb="2">
                            <Input
                                placeholder="Ask Phlox anything..."
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyPress={(e) =>
                                    e.key === "Enter" &&
                                    !e.shiftKey &&
                                    (e.preventDefault(),
                                    handleSendMessage(userInput))
                                }
                                mr="2"
                                size="sm"
                            />
                            <IconButton
                                icon={<ArrowUpIcon />}
                                onClick={() => handleSendMessage(userInput)}
                                isDisabled={!userInput.trim() || chatLoading}
                                isLoading={chatLoading}
                                colorScheme="purple"
                                borderRadius="full"
                                size="sm"
                                aria-label="Send Message"
                            />
                        </Flex>

                        {/* Disclaimer */}
                        <Text textAlign="center" fontSize="xs" color="gray.500">
                            Phlox may make mistakes. Always verify critical
                            information.
                        </Text>
                    </Box>

                    {/* Resizer */}
                    <Box
                        ref={resizerRef}
                        position="absolute"
                        top="0"
                        left="0"
                        width="15px"
                        height="15px"
                        cursor="nwse-resize"
                        onMouseDown={handleMouseDown}
                        zIndex={1}
                    />
                </AnimatedChatPanel>
            )}
        </Box>
    );
};

export default Chat;
