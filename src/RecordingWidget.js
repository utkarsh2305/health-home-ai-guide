//RecordingWidget.js
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
} from "@chakra-ui/react";
import {
  FaMicrophone,
  FaPause,
  FaUpload,
  FaUndo,
  FaRedo,
  FaFileUpload,
} from "react-icons/fa";

const RecordingWidget = ({
  mode,
  toggleMode,
  onTranscriptionComplete,
  name,
  dob,
  gender,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const completeRecordingRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // New useEffect for resetting state
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

  // Existing useEffect for timer functionality
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
          const newAudioBlob = new Blob(completeRecordingRef.current, {
            type: "audio/wav",
          });
          console.log("New audio blob created, size:", newAudioBlob.size);
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
    if (gender && typeof gender === "string") formData.append("gender", gender);
    if (dob && typeof dob === "string") formData.append("dob", dob);

    console.log("FormData created", formData);

    setLoading(true);

    try {
      console.log("Sending request to /api/transcribe");
      const response = await fetch(`/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      console.log("Response received", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Transcription data:", data);
      onTranscriptionComplete(
        {
          clinicalHistory: data.clinicalHistory,
          plan: data.plan,
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

    // Use the same logic as sendRecording from this point
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    if (name && typeof name === "string") formData.append("name", name);
    if (gender && typeof gender === "string") formData.append("gender", gender);
    if (dob && typeof dob === "string") formData.append("dob", dob);

    console.log("FormData created for resend", formData);

    setLoading(true);

    try {
      console.log("Sending request to /api/transcribe for resend");
      const response = await fetch(`/api/transcribe`, {
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
          clinicalHistory: data.clinicalHistory,
          plan: data.plan,
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
    if (gender && typeof gender === "string") formData.append("gender", gender);
    if (dob && typeof dob === "string") formData.append("dob", dob);

    setLoading(true);

    try {
      const response = await fetch(`/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("Transcription data:", data);
      onTranscriptionComplete(
        {
          clinicalHistory: data.clinicalHistory,
          plan: data.plan,
          rawTranscription: data.rawTranscription,
          transcriptionDuration: data.transcriptionDuration,
          processDuration: data.processDuration,
        },
        true,
      ); // Add 'true' as a second parameter to indicate the auto-resize should be triggered
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
                    isRecording ? (isPaused ? "yellow" : "red") : "blue"
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
              {isRecording && (
                <Text>{`Recording Time: ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}`}</Text>
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
                leftIcon={<FaFileUpload />}
                onClick={() =>
                  document.querySelector('input[type="file"]').click()
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
