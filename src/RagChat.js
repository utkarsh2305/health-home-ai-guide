// RagChat.js
import {
  Box,
  Flex,
  IconButton,
  Text,
  Tooltip,
  Input,
  Spinner,
  Button,
} from "@chakra-ui/react";
import {
  ArrowUpIcon,
  InfoIcon,
  SearchIcon,
  QuestionIcon,
} from "@chakra-ui/icons";
import ReactMarkdown from "react-markdown";
import { useState, useEffect, useRef } from "react";

const RagChat = ({
  chatLoading,
  setChatLoading,
  messages,
  setMessages,
  userInput,
  setUserInput,
  setChatExpanded,
  showSuggestions,
  setShowSuggestions,
  rawTranscription,
}) => {
  const messagesEndRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  // Scroll to the bottom only when new messages are added
  useEffect(() => {
    if (messages.length > lastMessageCount) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setLastMessageCount(messages.length);
    }
  }, [messages, lastMessageCount]);

  const handleSendMessage = (message) => {
    if (message.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: message },
      ]);
      handleChat(message, messages, rawTranscription); // Pass rawTranscription to handleChat
      setUserInput("");
      setShowSuggestions(false);
    }
  };

  const handleUserInputSend = () => {
    handleSendMessage(userInput);
  };

  const handleChat = async (
    userInput,
    messages,
    // Add other parameters if needed
  ) => {
    if (!userInput.trim()) return;
    setChatLoading(true);
    setChatExpanded(true);

    // Initial user message
    const initialMessage = {
      role: "system",
      content:
        "The user is a healthcare professional. They will ask you questions about medical treatment and guidelines,",
    };

    const messagesForRequest = [
      initialMessage,
      ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: userInput },
    ];

    // Example token count handling and truncation
    const conversationHistoryStr = messagesForRequest
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join(" ");
    let conversationHistoryTokenCount = conversationHistoryStr.length; // Placeholder for token count

    while (conversationHistoryTokenCount > 7168) {
      if (messagesForRequest.length > 2) {
        console.log("Truncating conversation history...");
        messagesForRequest.splice(1, 2);
        const conversationHistoryStr = messagesForRequest
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join(" ");
        conversationHistoryTokenCount = conversationHistoryStr.length;
        console.log(
          `New conversation history token count: ${conversationHistoryTokenCount}`,
        );
      } else {
        console.log(
          "Unable to truncate further without losing meaningful context.",
        );
        break;
      }
    }

    try {
      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInput: userInput,
          messages: messagesForRequest,
          // Include other config and prompt parameters if needed
        }),
      });

      const data = await response.json();

      // Append assistant's response to messages
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: data.message || " ",
          context: data.context || null,
        },
      ]);

      setUserInput("");
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Box p="4" borderRadius="md" className="panels-bg">
      <Box
        flex="1"
        display="flex"
        flexDirection="column"
        overflow="hidden"
        css={{ width: "100%", height: "500px" }}
      >
        <Box
          flex="1"
          overflowY="auto"
          p="2"
          borderRadius="md"
          className="chat-main"
        >
          {messages.map((message, messageIndex) => (
            <Flex
              key={messageIndex}
              justify={message.role === "assistant" ? "flex-start" : "flex-end"}
              mb="2"
            >
              <Box
                className={`message-box ${message.role}`}
                px="4"
                py="2"
                borderRadius="md"
                maxWidth="80%"
                fontSize="11pt"
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
                {message.role === "assistant" && message.context && (
                  <>
                    {Object.keys(message.context).map((key) => {
                      const tooltipId = `${messageIndex}-${key}`;
                      return (
                        <Tooltip
                          key={tooltipId}
                          label={message.context[key]}
                          placement="top"
                          hasArrow
                          fontSize="13"
                          maxWidth="500px"
                          shouldWrapChildren
                          isOpen={showTooltip === tooltipId}
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          <Text
                            as="span"
                            color="blue.500"
                            cursor="pointer"
                            onMouseEnter={() => setShowTooltip(tooltipId)}
                            onMouseLeave={() => setShowTooltip(null)}
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
            <Flex justify="center" align="center" mt="150" flexWrap="wrap">
              <Button
                leftIcon={<InfoIcon />}
                m="2"
                onClick={() =>
                  handleSendMessage("How do I treat TP53 Mutated CLL?")
                }
                className="chat-suggestions"
              >
                How do I treat TP53 Mutated CLL?
              </Button>
              <Button
                leftIcon={<SearchIcon />}
                m="2"
                onClick={() =>
                  handleSendMessage(
                    "What is the utility of cytogenetics in AML?",
                  )
                }
                className="chat-suggestions"
              >
                What is the utility of cytogenetics in AML?
              </Button>
              <Button
                leftIcon={<QuestionIcon />}
                m="2"
                onClick={() =>
                  handleSendMessage("What were the FLYER inclusion criteria?")
                }
                className="chat-suggestions"
              >
                What were the FLYER inclusion criteria?
              </Button>
            </Flex>
          )}
          <div ref={messagesEndRef} />
        </Box>
        <Flex alignItems="center" justify="space-between" p="4">
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
            onKeyPress={(e) => e.key === "Enter" && handleUserInputSend()}
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
    </Box>
  );
};

export default RagChat;
