import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Flex,
    useDisclosure,
    useColorMode,
    IconButton,
    useToast,
} from "@chakra-ui/react";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";
import { useState, useEffect, useCallback } from "react";
import { TemplateProvider } from "./utils/templates/templateContext";
import Sidebar from "./components/layout/Sidebar";
import LandingPage from "./pages/LandingPage";
import PatientDetails from "./pages/PatientDetails";
import Settings from "./pages/Settings";
import Rag from "./pages/Rag";
import ClinicSummary from "./pages/ClinicSummary";
import OutstandingJobs from "./pages/OutstandingJobs";
import ConfirmLeaveModal from "./components/patient/ConfirmLeaveModal";
import { handleError } from "./utils/helpers/errorHandlers";
import {
    handleLoadPatientDetails,
    handleFetchPatientLetter,
} from "./utils/patient/patientHandlers";
import { usePatient } from "./utils/hooks/usePatient";

function AppContent() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isModified, setIsModified] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [pendingNavigation, setPendingNavigation] = useState(null);
    const navigate = useNavigate();
    const toast = useToast();
    const location = useLocation();
    const { colorMode, toggleColorMode } = useColorMode();
    const [isFromOutstandingJobs, setIsFromOutstandingJobs] = useState(false);
    const [resetLetter, setResetLetter] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Use the patient hook for all patient-related state
    const {
        patient,
        setPatient,
        selectedDate,
        setSelectedDate,
        finalCorrespondence,
        setFinalCorrespondence,
        createNewPatient,
        templateKey,
        setTemplateKey,
    } = usePatient();

    const fetchPatientDetailsWrapper = useCallback(
        async (patientId) => {
            try {
                const patientData = await handleLoadPatientDetails(patientId, {
                    setPatient,
                    setSelectedDate,
                    isFromOutstandingJobs,
                    setIsFromOutstandingJobs,
                });
            } catch (error) {
                handleError(error, toast);
            }
        },
        [isFromOutstandingJobs, toast, setPatient, setSelectedDate],
    );

    useEffect(() => {
        if (location.pathname.startsWith("/patient/")) {
            const patientId = location.pathname.split("/").pop();
            fetchPatientDetailsWrapper(patientId);
        }
    }, [location, fetchPatientDetailsWrapper]);

    const handleNewPatient = async () => {
        try {
            await createNewPatient();
            if (resetLetter) {
                resetLetter(); // Clear the letter when creating new patient
            }
            handleNavigation("/new-patient");
        } catch (error) {
            console.error("Error creating new patient:", error);
            toast({
                title: "Error",
                description: "Failed to create new patient",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
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
        toast.closeAll();
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
        onClose();
        setPendingNavigation(null);
    };

    const refreshSidebar = useCallback(() => {
        setRefreshKey((prev) => prev + 1);
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isModified) {
                e.preventDefault();
                e.returnValue =
                    "You have unsaved changes. Are you sure you want to leave?";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isModified]);

    const toggleSidebar = useCallback(() => {
        setIsSidebarCollapsed((prev) => !prev);
    }, []);

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
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={toggleSidebar}
            />

            <Box
                flex="1"
                ml={isSidebarCollapsed ? "50px" : "200px"}
                mr="0"
                p="0"
                className="main-bg"
                minH="100vh"
                transition="margin-left 0.3s ease"
            >
                <IconButton
                    position="absolute"
                    top={5}
                    right={5}
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
                                templateKey={templateKey}
                                setTemplateKey={setTemplateKey}
                                onResetLetter={setResetLetter}
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
                                templateKey={templateKey}
                                setTemplateKey={setTemplateKey}
                            />
                        }
                    />
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/settings" element={<Settings />} />
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

// Wrap the entire app with TemplateProvider
function App() {
    return (
        <TemplateProvider>
            <AppContent />
        </TemplateProvider>
    );
}

export default App;
