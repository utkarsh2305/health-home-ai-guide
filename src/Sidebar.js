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
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { DeleteIcon, AddIcon, SettingsIcon } from "@chakra-ui/icons";
import { FaClinicMedical, FaTasks } from "react-icons/fa";
import { GiBrain } from "react-icons/gi";

const Sidebar = ({
  onNewPatient,
  onSelectPatient,
  selectedDate,
  setSelectedDate,
  refreshKey,
  handleNavigation,
}) => {
  const [patients, setPatients] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [hoveredPatientId, setHoveredPatientId] = useState(null);
  const [hoveredNewPatient, setHoveredNewPatient] = useState(false);
  const [incompleteJobsCount, setIncompleteJobsCount] = useState(0);

  const fetchPatients = async (date) => {
    try {
      const response = await fetch(`/api/patients?date=${date}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchIncompleteJobsCount = async () => {
    try {
      const response = await fetch(`/api/incomplete-jobs-count`);
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
    console.log("Patient clicked:", patient);
    onSelectPatient(patient);
  };

  const handleDelete = (patient) => {
    setPatientToDelete(patient);
    onOpen();
  };

  const confirmDelete = async () => {
    if (patientToDelete) {
      try {
        const response = await fetch(`/api/patients/${patientToDelete.id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setPatients(
            patients.filter((patient) => patient.id !== patientToDelete.id),
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
    fetchPatients(selectedDate);
    fetchIncompleteJobsCount();
  }, [selectedDate, refreshKey]);

  return (
    <Box
      as="nav"
      pos="fixed"
      top="0"
      left="0"
      w="200px"
      h="100vh"
      className="sidebar"
      p="5"
      boxShadow="lg"
      display="flex"
      flexDirection="column"
    >
      <VStack
        spacing="5"
        align="stretch"
        h="full"
        overflowY="auto"
        maxHeight="100vh"
      >
        <Box
          as="button"
          onClick={() => handleNavigation("/")}
          cursor="pointer"
          _hover={{ opacity: 0.8 }}
          transition="opacity 0.2s"
        >
          <Image src="/logo.webp" alt="Logo" mb="0" width="200px" />
        </Box>

        {/* Date selector */}
        <Box>
          <Text mb="2">Select Date</Text>
          <Input
            type="date"
            value={selectedDate || ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            size="sm"
            className="input-style"
          />
        </Box>

        {/* New Patient button */}
        <Box
          p="2"
          borderRadius="md"
          mt="2"
          className="new-patient"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          onClick={() => {
            console.log("New Patient clicked");
            onNewPatient();
          }}
          onMouseEnter={() => setHoveredNewPatient(true)}
          onMouseLeave={() => setHoveredNewPatient(false)}
        >
          <Text>New Patient</Text>
          {hoveredNewPatient && <AddIcon />}
        </Box>

        {/* Patient List */}
        <Text mt="4" mb="0">
          Patient List
        </Text>
        <Box flex="1" overflowY="auto" className="custom-scrollbar" mt="0">
          {patients.length > 0 ? (
            patients.map((patient) => {
              const nameParts = patient.name.split(" ");
              const initials =
                nameParts.length > 1
                  ? `${nameParts[1][0]}${nameParts[0][0]}`
                  : nameParts[0][0];
              return (
                <Box
                  key={patient.id}
                  p="2"
                  borderRadius="md"
                  className="sidebar-patient-items"
                  mb="2"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  onClick={() => handlePatientClick(patient)}
                  onMouseEnter={() => setHoveredPatientId(patient.id)}
                  onMouseLeave={() => setHoveredPatientId(null)}
                >
                  <HStack>
                    <Box
                      maxW="120px"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      style={{
                        WebkitMaskImage:
                          hoveredPatientId === patient.id
                            ? "linear-gradient(to right, black 60%, transparent 100%)"
                            : "none",
                      }}
                    >
                      <Text>{`${initials} ${patient.ur_number}`}</Text>
                    </Box>
                  </HStack>
                  {hoveredPatientId === patient.id && (
                    <IconButton
                      icon={<DeleteIcon />}
                      size="sm"
                      aria-label="Delete patient"
                      className="sidebar-patient-items-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(patient);
                      }}
                      width="24px"
                      height="24px"
                      minWidth="24px"
                      minHeight="24px"
                    />
                  )}
                </Box>
              );
            })
          ) : (
            <Text>No patients available</Text>
          )}
        </Box>

        {/* Other navigation buttons */}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexDirection="column"
        >
          <Button
            mt="4"
            bg="teal.500"
            _hover={{ bg: "teal.400" }}
            onClick={() => handleNavigation("/clinic-summary")}
            fontSize="sm"
            width="150px"
            height="30px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            className="summary-buttons"
          >
            <FaClinicMedical style={{ marginRight: "8px" }} />
            Day Summary
          </Button>
          <Button
            mt="2"
            bg="teal.500"
            _hover={{ bg: "teal.400" }}
            onClick={() => handleNavigation("/outstanding-jobs")}
            fontSize="sm"
            width="150px"
            height="30px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            className="summary-buttons"
            position="relative"
          >
            <FaTasks style={{ marginRight: "8px" }} />
            All Jobs
            {incompleteJobsCount > 0 && (
              <Badge
                borderRadius="full"
                px="2"
                colorScheme="red"
                backgroundColor="red.500"
                color="white"
                position="absolute"
                top="5px"
                right="5px"
                fontSize="0.75em"
                width="20px"
                height="20px"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {incompleteJobsCount}
              </Badge>
            )}
          </Button>
        </Box>
      </VStack>

      {/* Documents and Settings buttons */}
      <Flex p="2" mt="2" mb="0" justifyContent="center" alignItems="center">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="md"
          className="settings-button"
          height="40px"
          width="100%"
          onClick={() => handleNavigation("/rag")}
        >
          <GiBrain boxsize="20px" />
          <Text ml="2" fontSize="md">
            Documents
          </Text>
        </Box>
      </Flex>
      <Flex p="2" mt="0" justifyContent="center" alignItems="center">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="md"
          className="settings-button"
          height="40px"
          width="100%"
          onClick={() => handleNavigation("/settings")}
        >
          <SettingsIcon boxsize="20px" />
          <Text ml="2" fontSize="md">
            Settings
          </Text>
        </Box>
      </Flex>

      {/* Delete confirmation modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent className="modal-style">
          <ModalHeader>Delete Patient</ModalHeader>
          <ModalCloseButton />
          <ModalBody>Are you sure you want to delete this patient?</ModalBody>
          <ModalFooter>
            <Button className="red-button" mr={3} onClick={confirmDelete}>
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
