// Component for handling audio recording and transcription with controls.
import React, { useState, useRef, useEffect } from "react";
import {
    Box,
    Button,
    Flex,
    Input,
    Spinner,
    Text,
    VStack,
    HStack,
    useColorMode,
    useTheme,
} from "@chakra-ui/react";
import {
    FaMicrophone,
    FaPause,
    FaUpload,
    FaUndo,
    FaRedo,
    FaFileUpload,
} from "react-icons/fa";

// WaveformVisualizer component
const WaveformVisualizer = React.memo(({ isRecording, isPaused }) => {
    const theme = useTheme();
    const { colorMode } = useColorMode();
    const barCount = window.innerWidth < 768 ? 8 : 16;

    const [bars] = useState(() =>
        [...Array(barCount)].map(() => ({
            frequency: 1 + Math.random(),
            delay: Math.random() * -2,
        })),
    );

    if (!isRecording && !isPaused) return null;

    return (
        <Flex h="40px" align="center" justify="center" mt={2}>
            {bars.map((bar, i) => (
                <Box
                    key={i}
                    w="3px"
                    mx="1.5px"
                    borderRadius="full"
                    bg={
                        theme.colors[colorMode === "light" ? "light" : "dark"]
                            .primaryButton
                    }
                    opacity={isPaused ? "0.5" : "1"}
                    animation={
                        isRecording && !isPaused
                            ? `barAnimation ${bar.frequency}s infinite ease-in-out`
                            : "none"
                    }
                    sx={{
                        "@keyframes barAnimation": {
                            "0%, 100%": { height: "8px" },
                            "50%": { height: "24px" },
                        },
                    }}
                    style={{
                        animationDelay: `${bar.delay}s`,
                        height: isPaused ? "8px" : undefined,
                        transition: "all 0.3s ease-out",
                        // Preserve the current animation state when pausing
                        animationPlayState: isPaused ? "paused" : "running",
                    }}
                />
            ))}
        </Flex>
    );
});

const RecordingWidget = ({
    mode,
    toggleMode,
    onTranscriptionComplete,
    name,
    dob,
    gender,
    templateKey,
}) => {
    const { colorMode } = useColorMode();
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const completeRecordingRef = useRef([]);
    const timerIntervalRef = useRef(null);

    useEffect(() => {
        // Reset state when component mounts or remounts
        setIsRecording(false);
        setIsPaused(false);
        setLoading(false);
        setTimer(0);
        setAudioBlob(null);
        audioChunksRef.current = [];
        completeRecordingRef.current = [];
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream
                .getTracks()
                .forEach((track) => track.stop());
        }
        mediaRecorderRef.current = null;

        // Cleanup function
        return () => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stream
                    .getTracks()
                    .forEach((track) => track.stop());
            }
            clearInterval(timerIntervalRef.current);
            resetRecordingState();
        };
    }, [name, dob, gender]);

    useEffect(() => {
        // Reset completeRecordingRef when a new patient is selected
        completeRecordingRef.current = [];
    }, [name, dob, gender]);

    useEffect(() => {
        if (isRecording && !isPaused) {
            timerIntervalRef.current = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerIntervalRef.current);
        }
        return () => clearInterval(timerIntervalRef.current);
    }, [isRecording, isPaused]);

    const resetRecordingState = () => {
        setIsRecording(false);
        setIsPaused(false);
        setTimer(0);
        setAudioBlob(null);
        audioChunksRef.current = [];
        completeRecordingRef.current = [];
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream
                .getTracks()
                .forEach((track) => track.stop());
        }
        mediaRecorderRef.current = null;
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("getUserMedia is not supported in this browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            mediaRecorderRef.current = new MediaRecorder(stream);

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                completeRecordingRef.current = [
                    ...completeRecordingRef.current,
                    ...audioChunksRef.current,
                ];
                const audioBlob = new Blob(completeRecordingRef.current, {
                    type: "audio/wav",
                });
                setAudioBlob(audioBlob); // Store the audio file in state
                audioChunksRef.current = [];
                setIsRecording(false);
                setIsPaused(false);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setTimer(0);
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    };

    const stopRecording = () => {
        return new Promise((resolve) => {
            console.log("stopRecording called");
            if (isRecording) {
                mediaRecorderRef.current.onstop = () => {
                    console.log("MediaRecorder stopped");
                    completeRecordingRef.current = [
                        ...completeRecordingRef.current,
                        ...audioChunksRef.current,
                    ];
                    const newAudioBlob = new Blob(
                        completeRecordingRef.current,
                        {
                            type: "audio/wav",
                        },
                    );
                    console.log(
                        "New audio blob created, size:",
                        newAudioBlob.size,
                    );
                    audioChunksRef.current = [];
                    setIsRecording(false);
                    setIsPaused(false);
                    resolve(newAudioBlob);
                };
                mediaRecorderRef.current.stop();
            } else {
                resolve(null);
            }
        });
    };

    const pauseRecording = () => {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
    };

    const resumeRecording = () => {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
    };

    const sendRecording = async () => {
        console.log("sendRecording called");
        let currentAudioBlob;
        if (isRecording) {
            console.log("Stopping recording");
            currentAudioBlob = await stopRecording();
        } else {
            currentAudioBlob = audioBlob;
        }

        console.log(
            "Audio blob size:",
            currentAudioBlob ? currentAudioBlob.size : "No audio blob",
        );

        if (!currentAudioBlob) {
            console.error("No recording data available.");
            return;
        }

        const formData = new FormData();
        formData.append("file", currentAudioBlob, "recording.wav");

        if (name && typeof name === "string") formData.append("name", name);
        if (gender && typeof gender === "string")
            formData.append("gender", gender);
        if (dob && typeof dob === "string") formData.append("dob", dob);
        if (templateKey) formData.append("templateKey", templateKey);

        console.log("FormData created", formData);

        setLoading(true);

        try {
            console.log("Sending request to /api/transcribe/audio");
            const response = await fetch(`/api/transcribe/audio`, {
                method: "POST",
                body: formData,
            });

            console.log(
                "Response received",
                response.status,
                response.statusText,
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Transcription data:", data);
            onTranscriptionComplete(
                {
                    fields: data.fields,
                    rawTranscription: data.rawTranscription,
                    transcriptionDuration: data.transcriptionDuration,
                    processDuration: data.processDuration,
                },
                true,
            );

            // Set the audio blob after successful send
            setAudioBlob(currentAudioBlob);
        } catch (error) {
            console.error("Error transcribing audio:", error);
            onTranscriptionComplete({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const resendRecording = async () => {
        console.log("resendRecording called");

        if (!audioBlob) {
            console.error("No recording data available to resend.");
            return;
        }

        console.log("Audio blob size for resend:", audioBlob.size);

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.wav");

        if (name && typeof name === "string") formData.append("name", name);
        if (gender && typeof gender === "string")
            formData.append("gender", gender);
        if (dob && typeof dob === "string") formData.append("dob", dob);
        if (templateKey) formData.append("templateKey", templateKey);

        console.log("FormData created for resend", formData);

        setLoading(true);

        try {
            console.log("Sending request to /api/transcribe/audio for resend");
            const response = await fetch(`/api/transcribe/audio`, {
                method: "POST",
                body: formData,
            });

            console.log(
                "Response received for resend",
                response.status,
                response.statusText,
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Transcription data from resend:", data);
            onTranscriptionComplete(
                {
                    fields: data.fields,
                    rawTranscription: data.rawTranscription,
                    transcriptionDuration: data.transcriptionDuration,
                    processDuration: data.processDuration,
                },
                true,
            );
        } catch (error) {
            console.error("Error transcribing audio on resend:", error);
            onTranscriptionComplete({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];

        const formData = new FormData();
        formData.append("file", file, "recording.wav");

        if (name && typeof name === "string") formData.append("name", name);
        if (gender && typeof gender === "string")
            formData.append("gender", gender);
        if (dob && typeof dob === "string") formData.append("dob", dob);
        if (templateKey) formData.append("templateKey", templateKey);

        setLoading(true);

        try {
            const response = await fetch(`/api/transcribe/audio`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log("Transcription data:", data);
            onTranscriptionComplete(
                {
                    fields: data.fields,
                    rawTranscription: data.rawTranscription,
                    transcriptionDuration: data.transcriptionDuration,
                    processDuration: data.processDuration,
                },
                true,
            );
        } catch (error) {
            console.error("Error uploading file:", error);
            onTranscriptionComplete({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const resetRecording = () => {
        if (
            window.confirm(
                "Are you sure you want to reset the recording? This will discard the current recording.",
            )
        ) {
            stopRecording();
            completeRecordingRef.current = [];
            setAudioBlob(null); // Clear the stored audio blob
            setTimer(0);
        }
    };

    return (
        <Box>
            {loading ? (
                <Flex justify="center" align="center" height="100px">
                    <Spinner size="xl" />
                </Flex>
            ) : (
                <VStack spacing={4} align="stretch">
                    {mode === "record" ? (
                        <>
                            <HStack>
                                <Button
                                    onClick={
                                        isRecording
                                            ? isPaused
                                                ? resumeRecording
                                                : pauseRecording
                                            : startRecording
                                    }
                                    colorScheme={
                                        isRecording
                                            ? isPaused
                                                ? "yellow"
                                                : "red"
                                            : "blue"
                                    }
                                    leftIcon={
                                        isRecording ? (
                                            isPaused ? (
                                                <FaMicrophone />
                                            ) : (
                                                <FaPause />
                                            )
                                        ) : (
                                            <FaMicrophone />
                                        )
                                    }
                                    className="blue-button"
                                >
                                    {isRecording
                                        ? isPaused
                                            ? "Resume"
                                            : "Pause"
                                        : "Start Recording"}
                                </Button>
                                {isRecording && (
                                    <>
                                        <Button
                                            onClick={sendRecording}
                                            colorScheme="green"
                                            leftIcon={<FaUpload />}
                                            className="green-button"
                                        >
                                            Send
                                        </Button>
                                        <Button
                                            onClick={resetRecording}
                                            colorScheme="red"
                                            leftIcon={<FaUndo />}
                                            className="red-button"
                                        >
                                            Reset
                                        </Button>
                                    </>
                                )}
                                {!isRecording && audioBlob && (
                                    <Button
                                        onClick={resendRecording}
                                        colorScheme="blue"
                                        leftIcon={<FaRedo />}
                                        className="blue-button"
                                    >
                                        Resend
                                    </Button>
                                )}
                            </HStack>

                            {/* Add the waveform visualizer */}
                            {isRecording && (
                                <WaveformVisualizer
                                    isRecording={isRecording}
                                    isPaused={isPaused}
                                    colorMode={colorMode}
                                />
                            )}

                            {isRecording && (
                                <Text>{`Recording Time: ${Math.floor(timer / 60)}:${String(
                                    timer % 60,
                                ).padStart(2, "0")}`}</Text>
                            )}
                        </>
                    ) : (
                        <HStack>
                            <Input
                                type="file"
                                onChange={handleFileUpload}
                                className="input-style"
                            />
                            <Button
                                px="10"
                                leftIcon={<FaFileUpload />}
                                onClick={() =>
                                    document
                                        .querySelector('input[type="file"]')
                                        .click()
                                }
                                className="blue-button"
                            >
                                Upload File
                            </Button>
                        </HStack>
                    )}
                </VStack>
            )}
        </Box>
    );
};

export default RecordingWidget;
