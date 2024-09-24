import {
  Box,
  VStack,
  useClipboard,
  useToast,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PatientInfoBar from "../components/PatientInfoBar";
import Transcription from "../components/Transcription";
import Summary from "../components/Summary";
import Chat from "../components/Chat";
import Letter from "../components/Letter";
import {
  handleTranscriptionComplete,
  savePatientData,
  savePatientLetter,
  handleChat,
  handleSearchUtil,
  handleGenerateLetter,
} from "../utils/patientUtils";

const PatientDetails = ({
  patient,
  setPatient,
  selectedDate,
  refreshSidebar,
  setIsModified,
  finalCorrespondence,
  setFinalCorrespondence,
  customHeadings,
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("record");
  const [isTranscriptionCollapsed, setIsTranscriptionCollapsed] =
    useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(true);
  const [isLetterCollapsed, setIsLetterCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [recentlyCopied, setRecentlyCopied] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const summaryRef = useRef(null);

  const toast = useToast();

  useEffect(() => {
    if (patient) {
      setIsTranscriptionCollapsed(false);
      setIsSummaryCollapsed(false);
      setIsLetterCollapsed(true);
      setChatExpanded(false);
      setMessages([]);
      setUserInput("");
      setShowSuggestions(true);

      if (summaryRef.current) {
        setTimeout(() => {
          summaryRef.current.autoResizeAllTextareas();
        }, 100);
      }
    }
  }, [patient]);

  const { onCopy } = useClipboard(
    patient
      ? `${customHeadings.primaryHistory || "Primary History"}:\n${patient.primary_history || ""}\n\n` +
          `${customHeadings.additionalHistory || "Additional History"}:\n${patient.additional_history || ""}\n\n` +
          `${customHeadings.investigations || "Investigations"}:\n${patient.investigations || ""}\n\n` +
          `${customHeadings.encounterDetail || "This Clinical Encounter"}:\n${patient.encounter_detail || ""}\n\n` +
          `${customHeadings.impression || "Impression"}:\n${patient.impression || ""}\n\n` +
          `${customHeadings.encounterPlan || "Plan"}:\n${patient.encounter_plan || ""}`
      : "",
  );

  const handleCopy = () => {
    onCopy();
    setRecentlyCopied(true);
    setTimeout(() => setRecentlyCopied(false), 2000);
  };

  const handleTranscriptionCompleteWrapper = (data, triggerResize = false) => {
    handleTranscriptionComplete(
      data,
      setLoading,
      (value) => setPatient((prev) => ({ ...prev, encounter_detail: value })),
      (value) => setPatient((prev) => ({ ...prev, encounter_plan: value })),
      (value) => setPatient((prev) => ({ ...prev, raw_transcription: value })),
      (value) =>
        setPatient((prev) => ({ ...prev, transcription_duration: value })),
      (value) => setPatient((prev) => ({ ...prev, process_duration: value })),
      setIsTranscriptionCollapsed,
      setIsSummaryCollapsed,
      triggerResize,
      summaryRef,
    );
  };

  const toggleMode = () =>
    setMode((prevMode) => (prevMode === "record" ? "upload" : "record"));
  const toggleTranscriptionCollapse = () =>
    setIsTranscriptionCollapsed((prev) => !prev);
  const toggleSummaryCollapse = () => setIsSummaryCollapsed((prev) => !prev);
  const toggleLetterCollapse = () => setIsLetterCollapsed((prev) => !prev);

  const handleChatClick = () => {
    setIsTranscriptionCollapsed(true);
    setIsSummaryCollapsed(true);
    setChatExpanded(true);
  };

  const handleGenerateLetterClick = () => {
    if (!patient) return;
    handleGenerateLetter(
      patient.primary_history,
      patient.additional_history,
      patient.investigations,
      patient.encounter_detail,
      patient.impression,
      patient.encounter_plan,
      setFinalCorrespondence,
      toast,
      patient.name,
      setLoading,
    );
    setIsLetterCollapsed(false);
    setIsTranscriptionCollapsed(true);
    setIsSummaryCollapsed(true);
    setChatExpanded(false);
  };

  const handleSavePatientData = async (e) => {
    e.preventDefault();

    if (
      !patient ||
      !patient.name ||
      !patient.dob ||
      !patient.ur_number ||
      !patient.gender
    ) {
      toast({
        title: "Missing Fields",
        description:
          "Name, Date of Birth, UR Number, and Gender must be filled in.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSaveLoading(true);

    try {
      const savedPatient = await savePatientData(
        patient,
        toast,
        refreshSidebar,
      );
      if (savedPatient) {
        setPatient((prev) => ({ ...prev, id: savedPatient.id }));
        setIsModified(false);
        if (!patient.id) {
          navigate(`/patient/${savedPatient.id}`);
        }
      }
    } catch (error) {
      console.error("Error saving patient data:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSearch = (urNumber) => {
    handleSearchUtil(
      urNumber,
      (value) => setPatient((prev) => ({ ...prev, name: value })),
      (value) => setPatient((prev) => ({ ...prev, gender: value })),
      (value) => setPatient((prev) => ({ ...prev, dob: value })),
      (value) => setPatient((prev) => ({ ...prev, primary_history: value })),
      (value) => setPatient((prev) => ({ ...prev, additional_history: value })),
      (value) => setPatient((prev) => ({ ...prev, investigations: value })),
      (value) => setPatient((prev) => ({ ...prev, impression: value })),
      toast,
      summaryRef,
      setIsSummaryCollapsed,
    );
  };
  const handleSaveLetter = async () => {
    if (!patient || !patient.id) {
      throw new Error("Patient ID is missing");
    }

    try {
      await savePatientLetter(patient.id, finalCorrespondence);
      setIsModified(false);
    } catch (error) {
      console.error("Error saving letter:", error);
      throw error;
    }
  };

  if (!patient) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box p="5" borderRadius="md" w="100%">
      <VStack spacing="5" align="stretch">
        <PatientInfoBar
          patient={patient}
          setPatient={setPatient}
          handleSearch={handleSearch}
        />
        <Transcription
          isTranscriptionCollapsed={isTranscriptionCollapsed}
          toggleTranscriptionCollapse={toggleTranscriptionCollapse}
          mode={mode}
          toggleMode={toggleMode}
          handleTranscriptionComplete={handleTranscriptionCompleteWrapper}
          transcriptionDuration={patient.transcription_duration}
          processDuration={patient.process_duration}
          name={patient.name}
          dob={patient.dob}
          gender={patient.gender}
        />
        <Summary
          ref={summaryRef}
          isSummaryCollapsed={isSummaryCollapsed}
          toggleSummaryCollapse={toggleSummaryCollapse}
          primaryHistory={patient.primary_history}
          setPrimaryHistory={(value) =>
            setPatient((prev) => ({ ...prev, primary_history: value }))
          }
          additionalHistory={patient.additional_history}
          setAdditionalHistory={(value) =>
            setPatient((prev) => ({ ...prev, additional_history: value }))
          }
          investigations={patient.investigations}
          setInvestigations={(value) =>
            setPatient((prev) => ({ ...prev, investigations: value }))
          }
          encounterDetail={patient.encounter_detail}
          setEncounterDetail={(value) =>
            setPatient((prev) => ({ ...prev, encounter_detail: value }))
          }
          impression={patient.impression}
          setImpression={(value) =>
            setPatient((prev) => ({ ...prev, impression: value }))
          }
          encounterPlan={patient.encounter_plan}
          setEncounterPlan={(value) =>
            setPatient((prev) => ({ ...prev, encounter_plan: value }))
          }
          handleChat={handleChatClick}
          handleGenerateLetter={handleGenerateLetterClick}
          handleSavePatientData={handleSavePatientData}
          saveLoading={saveLoading}
          setIsModified={setIsModified}
          onCopy={handleCopy}
          recentlyCopied={recentlyCopied}
          customHeadings={customHeadings}
        />
        <Letter
          isLetterCollapsed={isLetterCollapsed}
          toggleLetterCollapse={toggleLetterCollapse}
          finalCorrespondence={finalCorrespondence}
          setFinalCorrespondence={setFinalCorrespondence}
          loading={loading}
          handleGenerateLetterClick={handleGenerateLetterClick}
          handleSaveLetter={handleSaveLetter}
          toast={toast}
          setIsModified={setIsModified}
        />
        <Chat
          chatExpanded={chatExpanded}
          setChatExpanded={setChatExpanded}
          chatLoading={chatLoading}
          messages={messages}
          setMessages={setMessages}
          userInput={userInput}
          setUserInput={setUserInput}
          customHeadings={customHeadings}
          handleChat={(userInput) =>
            handleChat(
              userInput,
              messages,
              setChatLoading,
              setMessages,
              setUserInput,
              setChatExpanded,
              setIsSummaryCollapsed,
              customHeadings,
              patient.primary_history,
              patient.additional_history,
              patient.investigations,
              patient.encounter_detail,
              patient.impression,
              patient.encounter_plan,
              patient.raw_transcription,
            )
          }
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          rawTranscription={patient.raw_transcription}
        />
      </VStack>
    </Box>
  );
};

export default PatientDetails;
