import { encodingForModel } from "js-tiktoken";

const enc = encodingForModel("gpt-4o");

export const handleTranscriptionComplete = (
  data,
  setLoading,
  setClinicalHistory,
  setPlan,
  setRawTranscription,
  setTranscriptionDuration,
  setProcessDuration,
  setIsTranscriptionCollapsed,
  setIsSummaryCollapsed,
  triggerResize = false,
  summaryRef,
) => {
  setLoading(false);
  setClinicalHistory(data.clinicalHistory);
  setPlan(data.plan);
  setRawTranscription(data.rawTranscription);
  setTranscriptionDuration(data.transcriptionDuration);
  setProcessDuration(data.processDuration);
  setIsTranscriptionCollapsed(true);
  setIsSummaryCollapsed(false);

  if (triggerResize && summaryRef.current) {
    setTimeout(() => {
      summaryRef.current.autoResizeAllTextareas();
    }, 100);
  }
};

export const savePatientData = async (patientData, toast, refreshSidebar) => {
  try {
    const payload = {
      patientData,
    };
    console.log(payload);
    const response = await fetch(`/api/save-patient`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (response.ok) {
      toast({
        title: "Success",
        description: "Patient data saved successfully.",
        status: "success",
        duration: null,
        isClosable: true,
      });
      refreshSidebar();
      return data;
    } else {
      toast({
        title: "Error",
        description: `Error saving patient data: ${data.detail || "Unknown error"}`,
        status: "error",
        duration: null,
        isClosable: true,
      });
      return null;
    }
  } catch (error) {
    console.error("Error:", error);
    toast({
      title: "Error",
      description: `Error: ${error.message}`,
      status: "error",
      duration: null,
      isClosable: true,
    });
  }
};

export const handleChat = async (
  userInput,
  messages,
  setChatLoading,
  setMessages,
  setUserInput,
  setChatExpanded,
  setIsSummaryCollapsed,
  primaryHistory,
  additionalHistory,
  investigations,
  encounterDetail,
  impression,
  encounterPlan,
  rawTranscription,
  customHeadings,
) => {
  if (!userInput.trim()) return;
  setChatLoading(true);
  setChatExpanded(true);

  const transcriptContent = rawTranscription || "No transcript available";
  const modifiedUserInput = userInput.replace("/transcript", transcriptContent);

  const initialMessage = {
    role: "user",
    content:
      `${customHeadings.primaryHistory || "Primary History"}:\n${primaryHistory}\n\n` +
      `${customHeadings.additionalHistory || "Additional History"}:\n${additionalHistory}\n\n` +
      `${customHeadings.investigations || "Investigations"}:\n${investigations}\n\n` +
      `${customHeadings.encounterDetail || "Encounter Detail"}:\n${encounterDetail}\n\n` +
      `${customHeadings.impression || "Impression"}:\n${impression}\n\n` +
      `${customHeadings.encounterPlan || "Encounter Plan"}:\n${encounterPlan}`,
  };

  const messagesForRequest = [
    initialMessage,
    ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
    { role: "user", content: modifiedUserInput },
  ];

  const conversationHistoryStr = messagesForRequest
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join(" ");
  let conversationHistoryTokenCount = enc.encode(conversationHistoryStr).length;
  console.log(
    `Current conversation token count: ${conversationHistoryTokenCount}`,
  );

  while (conversationHistoryTokenCount > 5000) {
    if (messagesForRequest.length > 2) {
      console.log("Truncating conversation history...");
      messagesForRequest.splice(1, 2);
      const conversationHistoryStr = messagesForRequest
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join(" ");
      conversationHistoryTokenCount = enc.encode(conversationHistoryStr).length;
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
        messages: messagesForRequest,
      }),
    });

    const data = await response.json();

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

export const handleSearchUtil = async (
  urNumber,
  setName,
  setGender,
  setDob,
  setPrimaryHistory,
  setAdditionalHistory,
  setInvestigations,
  setImpression,
  toast,
  summaryRef,
  setIsSummaryCollapsed,
) => {
  try {
    const response = await fetch(`/api/search-patient?ur_number=${urNumber}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    if (data.length > 0) {
      const latestEncounter = data[0];
      setName(latestEncounter.name);
      setGender(latestEncounter.gender);
      setDob(latestEncounter.dob);
      setPrimaryHistory(latestEncounter.primary_history);
      setAdditionalHistory(latestEncounter.additional_history);
      setInvestigations(latestEncounter.investigations);
      setImpression(latestEncounter.impression);

      if (summaryRef.current) {
        setTimeout(() => {
          summaryRef.current.autoResizeAllTextareas();
        }, 100);
      }

      setIsSummaryCollapsed(false);

      toast({
        title: "Patient Found",
        description: "Patient data pre-filled from the latest encounter.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "No Patient Found",
        description: "No patient data found for the provided UR number.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  } catch (error) {
    console.error("Error searching for patient:", error);
    toast({
      title: "Error",
      description: `Error searching for patient: ${error.message}`,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
};

export const handleGenerateLetter = async (
  primaryHistory,
  additionalHistory,
  investigations,
  encounterDetail,
  impression,
  encounterPlan,
  setFinalLetter,
  toast,
  patientName,
  setLoading,
) => {
  const summary_text = `${primaryHistory}\n\n${additionalHistory}\n\n${investigations}\n\n${encounterDetail}\n\n${impression}\n\n${encounterPlan}`;

  const letterData = {
    summary_text,
    patientName,
    primaryHistory,
  };

  try {
    setLoading(true);
    const response = await fetch("/api/generate-letter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(letterData),
    });

    const data = await response.json();
    setLoading(false);

    if (response.ok) {
      setFinalLetter(data.letter);
      toast({
        title: "Success",
        description: "Letter generated successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Error",
        description: `Error generating letter: ${data.error}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  } catch (error) {
    setLoading(false);
    console.error("Error generating letter:", error);
    toast({
      title: "Error",
      description: `Error: ${error.message}`,
      status: "error",
      duration: 3000,
      isClosable: true,
    });
  }
};
export const savePatientLetter = async (patientId, letter) => {
  try {
    const response = await fetch("/api/save-letter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ patientId, letter }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to save letter");
    }
    return data;
  } catch (error) {
    console.error("Error saving letter:", error);
    throw error;
  }
};

export const fetchPatientDetails = async (
  patientId,
  setPatient,
  setSelectedDate,
  isFromOutstandingJobs,
  setIsFromOutstandingJobs,
) => {
  try {
    const response = await fetch(`/api/patient/${patientId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch patient details");
    }
    const patientData = await response.json();
    setPatient(patientData);
    if (isFromOutstandingJobs) {
      setSelectedDate(patientData.encounter_date);
      setIsFromOutstandingJobs(false);
    }
    return patientData;
  } catch (error) {
    console.error("Error fetching patient details:", error);
    throw error;
  }
};

// patientUtils.js
export const fetchPatientLetter = async (patientId) => {
  try {
    const response = await fetch(`/api/fetch-letter?patientId=${patientId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data.letter;
    } else {
      console.error(`Error fetching letter: ${data.error}`);
      return "No letter attached to encounter";
    }
  } catch (error) {
    console.error("Error:", error);
    return "No letter attached to encounter";
  }
};

export const toggleJobsItem = async (
  patientId,
  index,
  patients,
  setPatients,
  refreshSidebar,
) => {
  const patient = patients.find((p) => p.id === patientId);
  if (patient) {
    const updatedJobsList = [...patient.jobs_list];
    updatedJobsList[index].completed = !updatedJobsList[index].completed;

    try {
      const response = await fetch(`/api/update-jobs-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientId, jobsList: updatedJobsList }),
      });
      if (response.ok) {
        setPatients(
          patients.map((p) =>
            p.id === patientId ? { ...p, jobs_list: updatedJobsList } : p,
          ),
        );

        // Refresh the sidebar after updating the todo list
        refreshSidebar();
      } else {
        console.error("Failed to update jobs list:", response.statusText);
      }
    } catch (error) {
      console.error("Error updating to-do list:", error);
    }
  }
};

export const resetJobsItems = async (patientId, patients, setPatients) => {
  const patient = patients.find((p) => p.id === patientId);
  if (patient) {
    const updatedJobsList = patient.jobs_list.map((item) => ({
      ...item,
      completed: false,
    }));

    try {
      const response = await fetch(`/api/update-jobs-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientId, jobsList: updatedJobsList }),
      });
      if (response.ok) {
        setPatients(
          patients.map((p) =>
            p.id === patientId ? { ...p, jobs_list: updatedJobsList } : p,
          ),
        );
      } else {
        console.error("Failed to reset to-do list:", response.statusText);
      }
    } catch (error) {
      console.error("Error resetting to-do list:", error);
    }
  }
};
