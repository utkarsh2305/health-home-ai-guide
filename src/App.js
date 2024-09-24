import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Flex,
  useDisclosure,
  useColorMode,
  IconButton,
} from "@chakra-ui/react";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import LandingPage from "./pages/LandingPage";
import PatientDetails from "./pages/PatientDetails";
import Settings from "./pages/Settings";
import Rag from "./pages/Rag";
import ClinicSummary from "./pages/ClinicSummary";
import OutstandingJobs from "./pages/OutstandingJobs";
import ConfirmLeaveModal from "./components/ConfirmLeaveModal";
import { fetchPatientLetter, fetchPatientDetails } from "./utils/patientUtils";

function App() {
  const [patient, setPatient] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModified, setIsModified] = useState(false);
  const [finalCorrespondence, setFinalCorrespondence] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();
  const [isFromOutstandingJobs, setIsFromOutstandingJobs] = useState(false);
  const [customHeadings, setCustomHeadings] = useState({
    primaryHistory: "Primary History",
    additionalHistory: "Additional History",
    investigations: "Investigations",
    encounterDetail: "Encounter Detail",
    impression: "Impression",
    encounterPlan: "Encounter Plan",
  });

  useEffect(() => {
    if (location.pathname.startsWith("/patient/")) {
      const patientId = location.pathname.split("/").pop();
      fetchPatientDetailsWrapper(patientId);
    } else if (location.pathname === "/new-patient") {
      setPatient({
        id: null,
        name: "",
        dob: "",
        ur_number: "",
        gender: "",
        final_primary_history: "",
        final_oahp: "",
        final_investigations: "",
        raw_transcription: "",
        initial_clinical_history: "",
        final_clinical_history: "",
        final_impression: "",
        initial_plan: "",
        final_plan: "",
        encounter_date: selectedDate,
      });
      setFinalCorrespondence("");
    }
  }, [location, selectedDate]);

  useEffect(() => {
    const fetchCustomHeadings = async () => {
      try {
        const response = await fetch("/api/custom-headings");
        if (response.ok) {
          const data = await response.json();
          setCustomHeadings(data);
        } else {
          throw new Error("Failed to fetch custom headings");
        }
      } catch (error) {
        console.error("Error fetching custom headings:", error);
      }
    };

    fetchCustomHeadings();
  }, []);

  const fetchPatientDetailsWrapper = async (patientId) => {
    try {
      const patientData = await fetchPatientDetails(
        patientId,
        setPatient,
        setSelectedDate,
        isFromOutstandingJobs,
        setIsFromOutstandingJobs,
      );
      fetchLetter(patientData.id);
    } catch (error) {
      console.error("Error in fetchPatientDetailsWrapper:", error);
    }
  };

  const fetchLetter = async (patientId) => {
    const letter = await fetchPatientLetter(patientId);
    setFinalCorrespondence(letter || "No letter attached to encounter");
  };

  const handleNewPatient = () => {
    setPatient({
      id: null,
      name: "",
      dob: "",
      ur_number: "",
      gender: "",
      final_primary_history: "",
      final_oahp: "",
      final_investigations: "",
      raw_transcription: "",
      initial_clinical_history: "",
      final_clinical_history: "",
      final_impression: "",
      initial_plan: "",
      final_plan: "",
      encounter_date: selectedDate,
    });
    setFinalCorrespondence("");
    handleNavigation("/new-patient");
  };

  const handleSelectPatient = (
    selectedPatient,
    fromOutstandingJobs = false,
  ) => {
    setIsFromOutstandingJobs(fromOutstandingJobs);
    if (isModified) {
      setPendingNavigation(`/patient/${selectedPatient.id}`);
      onOpen();
    } else {
      navigate(`/patient/${selectedPatient.id}`);
    }
  };

  const handleNavigation = (path) => {
    if (isModified) {
      setPendingNavigation(path);
      onOpen();
    } else {
      setIsModified(false);
      navigate(path);
    }
  };

  const confirmNavigation = () => {
    onClose();
    if (pendingNavigation) {
      setIsModified(false);
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const cancelNavigation = () => {
    setPendingNavigation(null);
    onClose();
  };

  const refreshSidebar = useCallback(async () => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleSaveSettings = (newCustomHeadings) => {
    setCustomHeadings(newCustomHeadings);
  };

  return (
    <Flex>
      <Sidebar
        onNewPatient={handleNewPatient}
        onSelectPatient={handleSelectPatient}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        refreshKey={refreshKey}
        handleNavigation={handleNavigation}
        refreshSidebar={refreshSidebar}
      />

      <Box flex="1" ml="200px" mr="0" p="0" className="main-bg" minH="100vh">
        <IconButton
          position="absolute"
          top={7}
          right={4}
          aria-label="Toggle color mode"
          icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          className="dark-toggle"
          onClick={toggleColorMode}
        />
        <Routes>
          <Route
            path="/new-patient"
            element={
              <PatientDetails
                patient={patient}
                setPatient={setPatient}
                selectedDate={selectedDate}
                refreshSidebar={refreshSidebar}
                setIsModified={setIsModified}
                finalCorrespondence={finalCorrespondence}
                setFinalCorrespondence={setFinalCorrespondence}
                customHeadings={customHeadings}
              />
            }
          />
          <Route
            path="/patient/:id"
            element={
              <PatientDetails
                patient={patient}
                setPatient={setPatient}
                selectedDate={selectedDate}
                refreshSidebar={refreshSidebar}
                setIsModified={setIsModified}
                finalCorrespondence={finalCorrespondence}
                setFinalCorrespondence={setFinalCorrespondence}
                customHeadings={customHeadings}
              />
            }
          />
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/settings"
            element={
              <Settings
                customHeadings={customHeadings}
                setCustomHeadings={setCustomHeadings}
                onSaveSettings={handleSaveSettings}
              />
            }
          />
          <Route path="/rag" element={<Rag />} />
          <Route
            path="/clinic-summary"
            element={
              <ClinicSummary
                selectedDate={selectedDate}
                handleSelectPatient={handleSelectPatient}
                refreshSidebar={refreshSidebar}
              />
            }
          />
          <Route
            path="/outstanding-jobs"
            element={
              <OutstandingJobs
                handleSelectPatient={(patient) =>
                  handleSelectPatient(patient, true)
                }
                refreshSidebar={refreshSidebar}
              />
            }
          />
        </Routes>
      </Box>
      <ConfirmLeaveModal
        isOpen={isOpen}
        onClose={cancelNavigation}
        confirmNavigation={confirmNavigation}
      />
    </Flex>
  );
}

export default App;
