import {
    Box,
    VStack,
    Text,
    IconButton,
    useDisclosure,
    Input,
    Image,
    Flex,
    Divider,
    useColorModeValue,
    Tooltip,
    useToast,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { HamburgerIcon } from "@chakra-ui/icons";
import VersionInfo from "./VersionInfo";
import SidebarPatientList from "./SidebarPatientList";
import SidebarNavigation from "./SidebarNavigation";
import { AvatarButton } from "./SidebarHelpers";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { colors } from "../../theme/colors";

const Sidebar = ({
    onNewPatient,
    onSelectPatient,
    selectedDate,
    setSelectedDate,
    refreshKey,
    handleNavigation,
    isCollapsed,
    toggleSidebar,
    isSmallScreen,
}) => {
    // State declarations remain the same
    const [patients, setPatients] = useState([]);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [patientToDelete, setPatientToDelete] = useState(null);
    const [incompleteJobsCount, setIncompleteJobsCount] = useState(0);
    const toast = useToast();

    // Color mode values
    const sidebarBg = colors.dark.sidebar.background;
    const textColor = colors.dark.sidebar.text;
    const labelColor = colors.dark.textSecondary;
    const dividerColor = colors.dark.divider;
    const hoverColor = colors.dark.sidebar.hover;

    // Function definitions remain the same
    const fetchPatients = async (date) => {
        try {
            const response = await fetch(`/api/patient/list?date=${date}`);
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            // Sort patients by ID in descending order
            const sortedPatients = data.sort((a, b) => a.id - b.id);
            setPatients(sortedPatients);
        } catch (error) {
            console.error("Error fetching patients:", error);
        }
    };

    const fetchIncompleteJobsCount = async () => {
        try {
            const response = await fetch(`/api/patient/incomplete-jobs-count`);
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            setIncompleteJobsCount(data.incomplete_jobs_count);
        } catch (error) {
            console.error("Error fetching incomplete jobs count:", error);
        }
    };

    const handlePatientClick = (patient) => {
        toast.closeAll();
        onSelectPatient(patient);
    };

    const handleDelete = (patient) => {
        setPatientToDelete(patient);
        onOpen();
    };

    const confirmDelete = async () => {
        if (patientToDelete) {
            try {
                const response = await fetch(
                    `/api/patient/id/${patientToDelete.id}`,
                    {
                        method: "DELETE",
                    },
                );
                if (response.ok) {
                    setPatients(
                        patients.filter(
                            (patient) => patient.id !== patientToDelete.id,
                        ),
                    );
                    onClose();
                } else {
                    console.error("Error deleting patient");
                }
            } catch (error) {
                console.error("Error deleting patient:", error);
            }
        }
    };

    const handleNewPatient = () => {
        toast.closeAll();
        onNewPatient();
    };

    useEffect(() => {
        console.log("Sidebar refresh triggered, refreshKey:", refreshKey);
        fetchPatients(selectedDate);
        fetchIncompleteJobsCount();
    }, [selectedDate, refreshKey]);

    return (
        <Box
            as="nav"
            pos="fixed"
            top="0"
            left="0"
            h="100vh"
            p={isCollapsed ? "2" : "4"}
            bg={sidebarBg}
            boxShadow="md"
            display="flex"
            flexDirection="column"
            w={isCollapsed ? "60px" : "220px"}
            transition="all 0.3s ease"
            zIndex="100"
            transform={
                isSmallScreen && isCollapsed
                    ? "translateX(-100%)"
                    : "translateX(0)"
            }
        >
            {/* Sidebar toggle button */}
            {!isSmallScreen && (
                <Tooltip
                    label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    placement="right"
                >
                    <IconButton
                        icon={<HamburgerIcon />}
                        onClick={toggleSidebar}
                        position="absolute"
                        top="12px"
                        right="15px"
                        size="sm"
                        borderRadius="full"
                        aria-label="Toggle sidebar"
                        zIndex="200"
                        variant="ghost"
                        color={labelColor}
                        _hover={{ bg: hoverColor }}
                    />
                </Tooltip>
            )}

            {/* Logo Area */}
            <Box
                as="button"
                onClick={() => handleNavigation("/")}
                cursor="pointer"
                display="flex"
                justifyContent="center"
                width="100%"
                mt={isCollapsed ? "40px" : "5px"}
                mb={isCollapsed ? "10px" : "15px"}
            >
                <Image
                    src="/logo.webp"
                    alt="Logo"
                    width={isCollapsed ? "35px" : "100px"}
                />
            </Box>

            {/* Main Content Area - Restructured for better collapsed view */}
            <Flex
                direction="column"
                flex="1"
                h="calc(100vh - 160px)"
                position="relative"
                overflow="hidden"
            >
                {/* Date selector - only visible when expanded */}
                {!isCollapsed && (
                    <Box mb="2">
                        <Text
                            fontSize="xs"
                            fontWeight="medium"
                            color={labelColor}
                            mb="1"
                        >
                            CLINIC DATE
                        </Text>
                        <Input
                            type="date"
                            value={selectedDate || ""}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            size="sm"
                            borderRadius="md"
                            className="clinic-date-input"
                        />
                    </Box>
                )}

                {/* New Patient button - adjusted size for collapsed view */}
                <Tooltip
                    label="New Patient"
                    placement={isCollapsed ? "right" : "top"}
                >
                    <Box w="100%" mb={isCollapsed ? 3 : 4}>
                        <AvatarButton
                            icon={
                                <FaPlus
                                    fontSize={isCollapsed ? "0.9rem" : "1.2rem"}
                                />
                            }
                            backgroundColor={colors.dark.tertiaryButton}
                            label="New Patient"
                            onClick={onNewPatient}
                            isCollapsed={isCollapsed}
                        />
                    </Box>
                </Tooltip>

                {/* Patient List Section - Make it grow to fill available space */}
                <Box
                    flex="1"
                    overflow="hidden"
                    mb={isCollapsed ? 2 : 0}
                    mt={isCollapsed ? 0 : 0}
                >
                    <SidebarPatientList
                        patients={patients}
                        onSelectPatient={handlePatientClick}
                        onDeletePatient={handleDelete}
                        isCollapsed={isCollapsed}
                    />
                </Box>

                {/* Navigation Section - Fixed at bottom, slides over patient list */}
                <Box
                    position="absolute"
                    bottom="0"
                    left="0"
                    right="0"
                    bg={sidebarBg}
                    pt="2"
                    borderTop={`1px solid ${dividerColor}`}
                >
                    <SidebarNavigation
                        isCollapsed={isCollapsed}
                        handleNavigation={handleNavigation}
                        onNewPatient={handleNewPatient}
                        incompleteJobsCount={incompleteJobsCount}
                    />
                </Box>
            </Flex>

            {/* Version info at bottom - adjusted for collapsed view */}
            <Box mt="auto" pt="2" pb={isCollapsed ? "2" : "0"}>
                <VersionInfo isCollapsed={isCollapsed} />
            </Box>

            {/* Delete confirmation modal */}
            <DeleteConfirmationModal
                isOpen={isOpen}
                onClose={onClose}
                onDelete={confirmDelete}
                patientName={patientToDelete?.name}
            />
        </Box>
    );
};

export default Sidebar;
