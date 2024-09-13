import {
  Box,
  Flex,
  IconButton,
  Text,
  Collapse,
  Tooltip,
  Input,
  Spinner,
  Button,
} from "@chakra-ui/react";
import {
  CloseIcon,
  ArrowUpIcon,
  InfoIcon,
  SearchIcon,
  QuestionIcon,
  ChatIcon,
} from "@chakra-ui/icons";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

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
  customHeadings,
}) => {
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const messagesEndRef = useRef(null);
  const resizerRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  const filteredMessages = messages.filter(
    (message, index) =>
      !(index === 0 && message.role === "system") &&
      !(index === 1 && message.role === "user"),
  );

  // Improved scrolling effect
  useEffect(() => {
    if (filteredMessages.length > lastMessageCount) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setLastMessageCount(filteredMessages.length);
    }
  }, [filteredMessages, lastMessageCount]);

  const handleSendMessage = (message) => {
    if (message.trim()) {
      const newMessage = { role: "user", content: message };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      handleChat(message, messages, rawTranscription, customHeadings);
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
      width:
        prev.width -
        (e.clientX - resizerRef.current.getBoundingClientRect().left),
      height:
        prev.height -
        (e.clientY - resizerRef.current.getBoundingClientRect().top),
    }));
  };

  const handleMouseUp = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      zIndex="1000"
      className="hover-chat-box"
    >
      {!chatExpanded && (
        <IconButton
          icon={<ChatIcon boxSize="1.5em" />}
          colorScheme="purple"
          onClick={() => setChatExpanded(true)}
          aria-label="Open Chat"
          borderRadius="full"
          size="lg"
          bg="#c4a7e7"
          className="chat-icon"
          boxShadow="md"
          width="3em"
          height="3em"
          fontSize="2xl"
        />
      )}
      {chatExpanded && (
        <Box
          width={`${dimensions.width}px`}
          height={`${dimensions.height - 24}px`}
          borderRadius="md"
          boxShadow="md"
          overflow="hidden"
          position="relative"
          className="chat-panel"
        >
          <Box borderRadius="md" display="flex" flexDirection="column">
            <Flex align="center" justify="space-between" p="4">
              <Flex align="center" width="100%">
                <Text>Chat With LlamaScribe</Text>
                <IconButton
                  icon={<CloseIcon />}
                  onClick={() => setChatExpanded(false)}
                  aria-label="Close chat"
                  variant="outline"
                  size="sm"
                  ml="auto"
                  className="collapse-toggle"
                />
              </Flex>
            </Flex>
            <Collapse in={chatExpanded} animateOpacity>
              <Box
                flex="1"
                display="flex"
                ml="2"
                flexDirection="column"
                overflow="hidden"
                css={{ width: "98%", height: `${dimensions.height - 90}px` }}
              >
                <Box
                  flex="1"
                  overflowY="auto"
                  p="4"
                  borderRadius="md"
                  className="chat-main"
                >
                  {filteredMessages.map((message, messageIndex) => (
                    <Flex
                      key={messageIndex}
                      justify={
                        message.role === "assistant" ? "flex-start" : "flex-end"
                      }
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
                                    onMouseEnter={() =>
                                      setShowTooltip(tooltipId)
                                    }
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
                    <Flex justify="center" mb="4" flexWrap="wrap">
                      <Button
                        leftIcon={<InfoIcon />}
                        m="2"
                        onClick={() => handleSendMessage("Critique my plan")}
                        className="chat-suggestions"
                      >
                        Critique my plan
                      </Button>
                      <Button
                        leftIcon={<SearchIcon />}
                        m="2"
                        onClick={() =>
                          handleSendMessage("Any additional investigations")
                        }
                        className="chat-suggestions"
                      >
                        Any additional investigations
                      </Button>
                      <Button
                        leftIcon={<QuestionIcon />}
                        m="2"
                        onClick={() =>
                          handleSendMessage("Any differentials to consider")
                        }
                        className="chat-suggestions"
                      >
                        Any differentials to consider
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
                    borderRadius="full"
                    className="chat-input"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSendMessage(userInput)
                    }
                  />
                  <IconButton
                    icon={<ArrowUpIcon />}
                    onClick={() => handleSendMessage(userInput)}
                    colorScheme="purple"
                    borderRadius="full"
                    size="md"
                    aria-label="Send"
                  />
                </Flex>
              </Box>
            </Collapse>
          </Box>
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
      )}
    </Box>
  );
};

export default Chat;
