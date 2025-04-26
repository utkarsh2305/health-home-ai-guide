import {
    Box,
    VStack,
    Text,
    IconButton,
    useDisclosure,
    HStack,
    Input,
    Image,
    Flex,
    Button,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Badge,
    useToast,
    Tooltip,
    Avatar,
    Divider,
    Collapse,
    useColorModeValue,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import {
    DeleteIcon,
    AddIcon,
    SettingsIcon,
    HamburgerIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from "@chakra-ui/icons";
import { FaClinicMedical, FaTasks, FaPlus } from "react-icons/fa";
import { GiBrain } from "react-icons/gi";
import VersionInfo from "./VersionInfo";

// Function to generate a consistent color based on a string
const getAvatarColor = (name) => {
    // Array of colors for avatar backgrounds - using your color palette
    const colors = [
        "#8aadf4", // primaryButton dark
        "#ed8796", // dangerButton dark
        "#a6da95", // successButton dark
        "#eed49f", // secondaryButton dark
        "#b7bdf8", // neutralButton dark
        "#f5bde6", // tertiaryButton dark
        "#c6a0f6", // chatIcon dark
    ];

    // Simple hash function for the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Get a consistent color from the array
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

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
    const [patients, setPatients] = useState([]);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [patientToDelete, setPatientToDelete] = useState(null);
    const [hoveredPatientId, setHoveredPatientId] = useState(null);
    const [incompleteJobsCount, setIncompleteJobsCount] = useState(0);
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);
    const [isPatientsCollapsed, setIsPatientsCollapsed] = useState(false);
    const toast = useToast();

    // Color mode values
    const sidebarBg = useColorModeValue("gray.50", "gray.900");
    const labelColor = useColorModeValue("gray.500", "gray.400");
    const dividerColor = useColorModeValue("gray.200", "gray.700");
    const hoverColor = useColorModeValue("gray.100", "gray.700");

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

    useEffect(() => {
        console.log("Sidebar refresh triggered, refreshKey:", refreshKey);
        fetchPatients(selectedDate);
        fetchIncompleteJobsCount();
    }, [selectedDate, refreshKey]);

    // Get initials from name
    const getInitials = (name) => {
        const nameParts = name.split(" ");
        return nameParts.length > 1
            ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
            : nameParts[0].slice(0, 2).toUpperCase();
    };

    return (
        <Box
            as="nav"
            pos="fixed"
            top="0"
            left="0"
            h="100vh"
            p={isCollapsed ? "3" : "4"}
            bg={sidebarBg}
            boxShadow="md"
            display="flex"
            flexDirection="column"
            w={isCollapsed ? "70px" : "220px"}
            transition="all 0.3s ease"
            zIndex="100"
            transform={
                isSmallScreen && isCollapsed
                    ? "translateX(-100%)"
                    : "translateX(0)"
            }
        >
            {/* Sidebar toggle button - redesigned */}
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
                        right={isCollapsed ? "12px" : "15px"}
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
                mt={isCollapsed ? "10px" : "5px"}
                mb="15px"
            >
                <Image
                    src="/logo.webp"
                    alt="Logo"
                    width={isCollapsed ? "40px" : "100px"}
                />
            </Box>

            <VStack
                spacing={isCollapsed ? "4" : "5"}
                align={isCollapsed ? "center" : "stretch"}
                h="full"
                overflowY="auto"
                maxHeight="calc(100vh - 80px)"
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
                        />
                    </Box>
                )}

                {/* New Patient button - rendered as avatar/icon button */}
                <Tooltip
                    label="New Patient"
                    placement={isCollapsed ? "right" : "top"}
                >
                    <Flex
                        w="100%"
                        justifyContent={isCollapsed ? "center" : "flex-start"}
                        mb="2"
                    >
                        <Flex
                            align="center"
                            p="2"
                            borderRadius="lg"
                            role="group"
                            cursor="pointer"
                            w={isCollapsed ? "auto" : "100%"}
                            onClick={() => {
                                toast.closeAll();
                                onNewPatient();
                            }}
                            _hover={{ bg: "rgba(245, 189, 230, 0.1)" }}
                            transition="all 0.2s"
                        >
                            <Avatar
                                icon={<FaPlus fontSize="1.2rem" />}
                                bg="#f5bde6"
                                color="white"
                                size={isCollapsed ? "md" : "sm"}
                                mr={isCollapsed ? "0" : "3"}
                            />

                            {!isCollapsed && (
                                <Text fontWeight="medium">New Patient</Text>
                            )}
                        </Flex>
                    </Flex>
                </Tooltip>

                {/* Patient List Header - Collapsible when expanded */}
                {!isCollapsed && (
                    <Flex
                        w="100%"
                        justifyContent="space-between"
                        alignItems="center"
                        onClick={() =>
                            setIsPatientsCollapsed(!isPatientsCollapsed)
                        }
                        cursor="pointer"
                        _hover={{ color: "gray.600" }}
                        mt="2"
                    >
                        <Text
                            fontSize="xs"
                            fontWeight="medium"
                            color={labelColor}
                        >
                            PATIENTS{" "}
                            {patients.length > 0 ? `(${patients.length})` : ""}
                        </Text>
                        <IconButton
                            icon={
                                isPatientsCollapsed ? (
                                    <ChevronDownIcon />
                                ) : (
                                    <ChevronUpIcon />
                                )
                            }
                            variant="ghost"
                            size="xs"
                            aria-label={
                                isPatientsCollapsed
                                    ? "Expand patients"
                                    : "Collapse patients"
                            }
                        />
                    </Flex>
                )}

                {/* Patient List - collapsible and using avatar with initials */}
                <Collapse
                    in={isCollapsed || !isPatientsCollapsed}
                    animateOpacity
                >
                    <Box
                        w="100%"
                        mt={isCollapsed ? "0" : "1"}
                        maxH={isCollapsed ? "none" : "30vh"}
                        overflowY="auto"
                        className="custom-scrollbar"
                    >
                        {patients.length > 0 ? (
                            patients.map((patient) => {
                                const initials = getInitials(patient.name);
                                const avatarBg = getAvatarColor(patient.name);

                                return (
                                    <Tooltip
                                        key={patient.id}
                                        label={isCollapsed ? patient.name : ""}
                                        placement="right"
                                        isDisabled={!isCollapsed}
                                    >
                                        <Flex
                                            w="100%"
                                            align="center"
                                            p="2"
                                            borderRadius="lg"
                                            role="group"
                                            cursor="pointer"
                                            justifyContent={
                                                isCollapsed
                                                    ? "center"
                                                    : "space-between"
                                            }
                                            mb="2"
                                            onClick={() =>
                                                handlePatientClick(patient)
                                            }
                                            onMouseEnter={() =>
                                                setHoveredPatientId(patient.id)
                                            }
                                            onMouseLeave={() =>
                                                setHoveredPatientId(null)
                                            }
                                            _hover={{
                                                bg: "rgba(184, 192, 224, 0.1)",
                                            }}
                                            transition="all 0.2s"
                                        >
                                            <Flex align="center">
                                                <Avatar
                                                    name={initials}
                                                    bg={avatarBg}
                                                    color="white"
                                                    size={
                                                        isCollapsed
                                                            ? "md"
                                                            : "sm"
                                                    }
                                                    mr={isCollapsed ? "0" : "3"}
                                                />

                                                {!isCollapsed && (
                                                    <Box>
                                                        <Text
                                                            fontSize="sm"
                                                            fontWeight="500"
                                                            noOfLines={1}
                                                        >
                                                            {patient.name}
                                                        </Text>
                                                        <Text
                                                            fontSize="xs"
                                                            color={labelColor}
                                                        >
                                                            UR:{" "}
                                                            {patient.ur_number}
                                                        </Text>
                                                    </Box>
                                                )}
                                            </Flex>

                                            {!isCollapsed &&
                                                hoveredPatientId ===
                                                    patient.id && (
                                                    <IconButton
                                                        icon={<DeleteIcon />}
                                                        size="xs"
                                                        aria-label="Delete patient"
                                                        variant="ghost"
                                                        colorScheme="red"
                                                        onClick={(e) => {
                                                            toast.closeAll();
                                                            e.stopPropagation();
                                                            handleDelete(
                                                                patient,
                                                            );
                                                        }}
                                                    />
                                                )}
                                        </Flex>
                                    </Tooltip>
                                );
                            })
                        ) : (
                            <Text
                                fontSize="sm"
                                color={labelColor}
                                textAlign={isCollapsed ? "center" : "left"}
                                px="2"
                            >
                                {isCollapsed
                                    ? "No pts"
                                    : "No patients available"}
                            </Text>
                        )}
                    </Box>
                </Collapse>

                <Divider borderColor={dividerColor} />

                {/* Navigation Header - Collapsible when expanded */}
                {!isCollapsed && (
                    <Flex
                        w="100%"
                        justifyContent="space-between"
                        alignItems="center"
                        onClick={() => setIsNavCollapsed(!isNavCollapsed)}
                        cursor="pointer"
                        _hover={{ color: "gray.600" }}
                        mt="2"
                    >
                        <Text
                            fontSize="xs"
                            fontWeight="medium"
                            color={labelColor}
                        >
                            NAVIGATION
                        </Text>
                        <IconButton
                            icon={
                                isNavCollapsed ? (
                                    <ChevronDownIcon />
                                ) : (
                                    <ChevronUpIcon />
                                )
                            }
                            variant="ghost"
                            size="xs"
                            aria-label={
                                isNavCollapsed
                                    ? "Expand navigation"
                                    : "Collapse navigation"
                            }
                        />
                    </Flex>
                )}

                {/* Navigation Icons - collapsible section when sidebar is expanded */}
                <Collapse in={isCollapsed || !isNavCollapsed} animateOpacity>
                    <VStack
                        spacing={isCollapsed ? "6" : "3"}
                        align={isCollapsed ? "center" : "stretch"}
                        w="100%"
                        mt={isCollapsed ? "6" : "2"}
                    >
                        {/* Day Summary button */}
                        <Tooltip
                            label="Day Summary"
                            placement={isCollapsed ? "right" : "top"}
                        >
                            <Flex
                                w="100%"
                                justifyContent={
                                    isCollapsed ? "center" : "flex-start"
                                }
                            >
                                <Flex
                                    align="center"
                                    p="2"
                                    borderRadius="lg"
                                    role="group"
                                    cursor="pointer"
                                    w={isCollapsed ? "auto" : "100%"}
                                    onClick={() =>
                                        handleNavigation("/clinic-summary")
                                    }
                                    _hover={{ bg: "rgba(138, 173, 244, 0.1)" }}
                                    transition="all 0.2s"
                                >
                                    <Avatar
                                        icon={
                                            <FaClinicMedical fontSize="1.2rem" />
                                        }
                                        bg="#8aadf4"
                                        color="white"
                                        size={isCollapsed ? "md" : "sm"}
                                        mr={isCollapsed ? "0" : "3"}
                                    />

                                    {!isCollapsed && (
                                        <Text fontWeight="medium">
                                            Day Summary
                                        </Text>
                                    )}
                                </Flex>
                            </Flex>
                        </Tooltip>

                        {/* All Jobs button */}
                        <Tooltip
                            label="All Jobs"
                            placement={isCollapsed ? "right" : "top"}
                        >
                            <Flex
                                w="100%"
                                justifyContent={
                                    isCollapsed ? "center" : "flex-start"
                                }
                                position="relative"
                            >
                                <Flex
                                    align="center"
                                    p="2"
                                    borderRadius="lg"
                                    role="group"
                                    cursor="pointer"
                                    w={isCollapsed ? "auto" : "100%"}
                                    onClick={() =>
                                        handleNavigation("/outstanding-jobs")
                                    }
                                    _hover={{ bg: "rgba(183, 189, 248, 0.1)" }}
                                    transition="all 0.2s"
                                >
                                    <Box position="relative">
                                        <Avatar
                                            icon={<FaTasks fontSize="1.2rem" />}
                                            bg="#b7bdf8"
                                            color="white"
                                            size={isCollapsed ? "md" : "sm"}
                                            mr={isCollapsed ? "0" : "3"}
                                        />

                                        {incompleteJobsCount > 0 && (
                                            <Badge
                                                position="absolute"
                                                top="-2px"
                                                right={
                                                    isCollapsed
                                                        ? "-5px"
                                                        : "-8px"
                                                }
                                                borderRadius="full"
                                                bg="red.500"
                                                color="white"
                                                fontSize="0.6rem"
                                                p="1px 5px"
                                                boxShadow={`0 0 0 2px ${sidebarBg}`}
                                            >
                                                {incompleteJobsCount}
                                            </Badge>
                                        )}
                                    </Box>

                                    {!isCollapsed && (
                                        <Text fontWeight="medium">
                                            All Jobs
                                        </Text>
                                    )}
                                </Flex>
                            </Flex>
                        </Tooltip>

                        {/* Documents button */}
                        <Tooltip
                            label="Documents"
                            placement={isCollapsed ? "right" : "top"}
                        >
                            <Flex
                                w="100%"
                                justifyContent={
                                    isCollapsed ? "center" : "flex-start"
                                }
                            >
                                <Flex
                                    align="center"
                                    p="2"
                                    borderRadius="lg"
                                    role="group"
                                    cursor="pointer"
                                    w={isCollapsed ? "auto" : "100%"}
                                    onClick={() => handleNavigation("/rag")}
                                    _hover={{ bg: "rgba(198, 160, 246, 0.1)" }}
                                    transition="all 0.2s"
                                >
                                    <Avatar
                                        icon={<GiBrain fontSize="1.3rem" />}
                                        bg="#c6a0f6"
                                        color="white"
                                        size={isCollapsed ? "md" : "sm"}
                                        mr={isCollapsed ? "0" : "3"}
                                    />

                                    {!isCollapsed && (
                                        <Text fontWeight="medium">
                                            Documents
                                        </Text>
                                    )}
                                </Flex>
                            </Flex>
                        </Tooltip>

                        {/* Settings button */}
                        <Tooltip
                            label="Settings"
                            placement={isCollapsed ? "right" : "top"}
                        >
                            <Flex
                                w="100%"
                                justifyContent={
                                    isCollapsed ? "center" : "flex-start"
                                }
                            >
                                <Flex
                                    align="center"
                                    p="2"
                                    borderRadius="lg"
                                    role="group"
                                    cursor="pointer"
                                    w={isCollapsed ? "auto" : "100%"}
                                    onClick={() =>
                                        handleNavigation("/settings")
                                    }
                                    _hover={{ bg: "rgba(245, 194, 231, 0.1)" }}
                                    transition="all 0.2s"
                                >
                                    <Avatar
                                        icon={
                                            <SettingsIcon fontSize="1.2rem" />
                                        }
                                        bg="#f5c2e7"
                                        color="white"
                                        size={isCollapsed ? "md" : "sm"}
                                        mr={isCollapsed ? "0" : "3"}
                                    />

                                    {!isCollapsed && (
                                        <Text fontWeight="medium">
                                            Settings
                                        </Text>
                                    )}
                                </Flex>
                            </Flex>
                        </Tooltip>
                    </VStack>
                </Collapse>
            </VStack>

            {/* Version info at bottom */}
            <Box mt="auto" pt="4">
                <VersionInfo isCollapsed={isCollapsed} />
            </Box>

            {/* Delete confirmation modal */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent className="modal-style">
                    <ModalHeader>Delete Patient</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        Are you sure you want to delete this patient?
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            className="red-button"
                            mr={3}
                            onClick={confirmDelete}
                        >
                            Delete
                        </Button>
                        <Button className="green-button" onClick={onClose}>
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
};

export default Sidebar;
