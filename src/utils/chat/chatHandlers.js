// Logic for handling chat interactions, message preparation, and sending messages.
import { chatApi } from "../api/chatApi"; //
import {
    validateInput,
    formatInitialMessage,
    truncateConversationHistory,
} from "./messageUtils";

export const handleChat = async (
    userInput,
    messages,
    setChatLoading,
    setMessages,
    setUserInput,
    setChatExpanded,
    setIsSummaryCollapsed,
    patientData,
    currentTemplate,
) => {
    if (!validateInput(userInput)) return;
    if (!patientData || !currentTemplate) {
        console.error("Patient data and template are required for chat");
        return;
    }

    setChatLoading(true);
    setChatExpanded(true);

    // Get the initial context message
    const initialMessage = formatInitialMessage(currentTemplate, patientData);
    if (!initialMessage) {
        console.error("Failed to format initial message");
        setChatLoading(false);
        return;
    }

    // Create messages array with initial context
    const messagesForRequest = [
        initialMessage, // Add initial context first
        ...messages, // Add existing conversation
        { role: "user", content: userInput }, // Add new user message
    ];

    console.log("Sending messages to API:", messagesForRequest);

    try {
        let currentResponse = {
            role: "assistant",
            content: "",
            context: null,
        };

        // Stream the response
        for await (const chunk of chatApi.streamMessage(messagesForRequest)) {
            currentResponse.content += chunk.content || "";

            if (chunk.function_response) {
                currentResponse.context = Object.fromEntries(
                    chunk.function_response.map((item, index) => [
                        (index + 1).toString(),
                        item,
                    ]),
                );
            }

            setMessages((prev) => {
                const newMessages = [...prev];
                if (
                    newMessages.length === 0 ||
                    newMessages[newMessages.length - 1].role !== "assistant"
                ) {
                    newMessages.push({ ...currentResponse });
                } else {
                    newMessages[newMessages.length - 1] = {
                        ...currentResponse,
                    };
                }
                return newMessages;
            });
        }

        setUserInput("");
    } catch (error) {
        console.error("Error in chat:", error);
        setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${error.message}` },
        ]);
    } finally {
        setChatLoading(false);
    }
};
