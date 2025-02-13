// Component for chatting with RAG documents
import {
    Box,
    Flex,
    IconButton,
    HStack,
    Text,
    Tooltip,
    Input,
    Spinner,
    Button,
    Collapse,
} from "@chakra-ui/react";
import {
    ArrowUpIcon,
    InfoIcon,
    SearchIcon,
    QuestionIcon,
} from "@chakra-ui/icons";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { MdChat } from "react-icons/md";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";

const RagChat = ({
    isCollapsed,
    setIsCollapsed,
    chatLoading,
    setChatLoading,
    messages,
    setMessages,
    userInput,
    setUserInput,
    showSuggestions,
    setShowSuggestions,
}) => {
    const messagesEndRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(null);
    const [ragSuggestions, setRagSuggestions] = useState([]);

    // Scroll to the bottom only when new messages are added
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSendMessage = (message) => {
        if (message.trim()) {
            setMessages((prevMessages) => [
                ...prevMessages,
                { role: "user", content: message },
            ]);
            handleChat(message, messages);
            setUserInput("");
            setShowSuggestions(false);
        }
    };
    const handleUserInputSend = () => {
        handleSendMessage(userInput);
    };

    const handleChat = async (userInput, messages) => {
        if (!userInput.trim()) return;
        setChatLoading(true);

        // Initial system message
        const initialMessage = {
            role: "system",
            content:
                "The user is a healthcare professional. They will ask you questions about medical treatment and guidelines,",
        };

        const messagesForRequest = [
            initialMessage,
            ...messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            { role: "user", content: userInput },
        ];

        try {
            const response = await fetch(`/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: messagesForRequest,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            let fullContent = "";
            let isFirstChunk = true;

            // Get the response reader
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n\n");

                for (const line of lines) {
                    if (line.trim() && line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (isFirstChunk) {
                                setChatLoading(false);
                                isFirstChunk = false;
                            }

                            if (data.type === "chunk") {
                                fullContent += data.content;
                                setMessages((prev) => {
                                    const newMessages = [...prev];
                                    if (
                                        newMessages.length === 0 ||
                                        newMessages[newMessages.length - 1]
                                            .role !== "assistant"
                                    ) {
                                        newMessages.push({
                                            role: "assistant",
                                            content: fullContent,
                                        });
                                    } else {
                                        newMessages[newMessages.length - 1] = {
                                            role: "assistant",
                                            content: fullContent,
                                        };
                                    }
                                    return newMessages;
                                });
                            } else if (
                                data.type === "end" &&
                                data.function_response
                            ) {
                                // Handle context at the end of stream
                                setMessages((prev) => {
                                    const newMessages = [...prev];
                                    const lastMessage =
                                        newMessages[newMessages.length - 1];
                                    if (
                                        lastMessage &&
                                        lastMessage.role === "assistant"
                                    ) {
                                        lastMessage.context =
                                            data.function_response.reduce(
                                                (acc, item, index) => {
                                                    acc[index + 1] = item;
                                                    return acc;
                                                },
                                                {},
                                            );
                                    }
                                    return newMessages;
                                });
                            }

                            await new Promise((resolve) =>
                                setTimeout(resolve, 0),
                            );
                        } catch (error) {
                            console.error("Error parsing chunk:", error);
                        }
                    }
                }
            }

            setUserInput("");
        } catch (error) {
            console.error("Error in chat:", error);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    role: "assistant",
                    content: `Error: ${error.message}`,
                },
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                // First get user settings to know the specialty
                const settingsResponse = await fetch("/api/config/user");
                const userSettings = await settingsResponse.json();
                if (userSettings.specialty) {
                    const response = await fetch(`/api/rag/suggestions`);
                    if (!response.ok)
                        throw new Error("Failed to fetch suggestions");
                    const data = await response.json();
                    setRagSuggestions(data.suggestions);
                }
            } catch (error) {
                console.error("Error fetching RAG suggestions:", error);
            }
        };
        fetchSuggestions();
    }, []);
    return (
        <Box className="panels-bg" p="4" borderRadius="sm">
            <Flex align="center" justify="space-between">
                <Flex align="center">
                    <IconButton
                        icon={
                            isCollapsed ? (
                                <ChevronRightIcon />
                            ) : (
                                <ChevronDownIcon />
                            )
                        }
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-label="Toggle collapse"
                        variant="outline"
                        size="sm"
                        mr="2"
                        className="collapse-toggle"
                    />
                    <HStack spacing={2}>
                        <MdChat size="1.2em" />
                        <Text as="h3">Chat With Documents</Text>
                    </HStack>
                </Flex>
            </Flex>
            <Collapse in={!isCollapsed} animateOpacity>
                <Box
                    flex="1"
                    display="flex"
                    flexDirection="column"
                    overflow="hidden"
                    css={{ width: "100%", height: "450px" }}
                >
                    <Box
                        flex="1"
                        overflowY="auto"
                        mt="4"
                        p="2"
                        borderRadius="sm"
                        className="chat-main"
                    >
                        {messages.map((message, messageIndex) => (
                            <Flex
                                key={messageIndex}
                                justify={
                                    message.role === "assistant"
                                        ? "flex-start"
                                        : "flex-end"
                                }
                                mb="2"
                            >
                                <Box
                                    className={`message-box ${message.role}`}
                                    px="4"
                                    py="2"
                                    borderRadius="sm"
                                    maxWidth="80%"
                                    fontSize="11pt"
                                >
                                    <ReactMarkdown>
                                        {message.content}
                                    </ReactMarkdown>
                                    {message.role === "assistant" &&
                                        message.context && (
                                            <>
                                                {Object.keys(
                                                    message.context,
                                                ).map((key) => {
                                                    const tooltipId = `${messageIndex}-${key}`;
                                                    return (
                                                        <Tooltip
                                                            key={tooltipId}
                                                            label={
                                                                message.context[
                                                                    key
                                                                ]
                                                            }
                                                            placement="top"
                                                            hasArrow
                                                            fontSize="13"
                                                            maxWidth="500px"
                                                            shouldWrapChildren
                                                            isOpen={
                                                                showTooltip ===
                                                                tooltipId
                                                            }
                                                            sx={{
                                                                whiteSpace:
                                                                    "pre-wrap",
                                                            }}
                                                        >
                                                            <Text
                                                                as="span"
                                                                color="blue.500"
                                                                cursor="pointer"
                                                                onMouseEnter={() =>
                                                                    setShowTooltip(
                                                                        tooltipId,
                                                                    )
                                                                }
                                                                onMouseLeave={() =>
                                                                    setShowTooltip(
                                                                        null,
                                                                    )
                                                                }
                                                            >
                                                                [{key}]
                                                            </Text>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </>
                                        )}
                                </Box>
                            </Flex>
                        ))}
                        {chatLoading && (
                            <Flex justify="flex-start" mb="2">
                                <Box
                                    className="message-box assistant"
                                    px="4"
                                    py="2"
                                    maxWidth="80%"
                                    fontSize="12pt"
                                >
                                    <Spinner size="sm" />
                                </Box>
                            </Flex>
                        )}
                        {showSuggestions && (
                            <Flex
                                justify="center"
                                align="center"
                                mt="100"
                                flexWrap="wrap"
                            >
                                {ragSuggestions.map((suggestion, index) => (
                                    <Button
                                        key={index}
                                        leftIcon={
                                            index === 0 ? (
                                                <InfoIcon />
                                            ) : index === 1 ? (
                                                <SearchIcon />
                                            ) : (
                                                <QuestionIcon />
                                            )
                                        }
                                        m="2"
                                        onClick={() =>
                                            handleSendMessage(suggestion)
                                        }
                                        className="chat-suggestions"
                                    >
                                        {suggestion}
                                    </Button>
                                ))}
                            </Flex>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
                    <Flex
                        alignItems="center"
                        justify="space-between"
                        pt="4"
                        pl="4"
                        pr="4"
                    >
                        <Input
                            placeholder="Type your message..."
                            size="sm"
                            value={userInput}
                            onChange={(e) => {
                                setUserInput(e.target.value);
                                if (showSuggestions) setShowSuggestions(false);
                            }}
                            flex="1"
                            mr="2"
                            borderRadius="10px"
                            className="chat-input"
                            onKeyPress={(e) =>
                                e.key === "Enter" && handleUserInputSend()
                            }
                        />
                        <IconButton
                            icon={<ArrowUpIcon />}
                            onClick={handleUserInputSend}
                            colorScheme="purple"
                            borderRadius="full"
                            size="md"
                            aria-label="Send"
                        />
                    </Flex>
                </Box>
            </Collapse>
        </Box>
    );
};

export default RagChat;
