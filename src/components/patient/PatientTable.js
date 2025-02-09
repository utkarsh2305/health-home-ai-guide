// Component displaying patient task lists
import {
    Box,
    Text,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    HStack,
    Icon,
    Tooltip,
    Button,
    IconButton,
    Checkbox,
    VStack,
    useColorMode,
    useTheme,
} from "@chakra-ui/react";
import { FaUser, FaCalendarAlt, FaIdBadge } from "react-icons/fa";
import { RepeatIcon } from "@chakra-ui/icons";
import {
    toggleJobsItem,
    resetJobsItems,
} from "../../utils/patient/patientHandlers";

const PatientTable = ({
    patients,
    handleSelectPatient,
    setPatients,
    refreshSidebar,
    title,
    groupByDate = false,
}) => {
    const { colorMode } = useColorMode();
    const theme = useTheme();

    const formatName = (name) => {
        const nameParts = name.split(", ");
        const firstNameInitial = nameParts[1] ? nameParts[1][0] : "";
        const lastName = nameParts[0];
        return `${firstNameInitial}. ${lastName}`;
    };

    const getRowBackgroundColor = (index) => {
        return colorMode === "light"
            ? index % 2 === 0
                ? theme.colors.light.secondary
                : theme.colors.light.tertiary
            : index % 2 === 0
              ? theme.colors.dark.secondary
              : theme.colors.dark.tertiary;
    };

    const PatientDetails = ({ patient }) => (
        <Box>
            <HStack spacing="2">
                <Icon as={FaUser} />
                <Text fontWeight="bold">{formatName(patient.name)}</Text>
            </HStack>
            <HStack spacing="2">
                <Icon as={FaCalendarAlt} />
                <Text>{patient.dob}</Text>
            </HStack>
            <HStack spacing="2">
                <Icon as={FaIdBadge} />
                <Text>{patient.ur_number}</Text>
            </HStack>
        </Box>
    );

    const renderPatientRow = (patient, index) => (
        <Tr key={patient.id} backgroundColor={getRowBackgroundColor(index)}>
            <Td width="30%">
                <Tooltip
                    label={`${patient.name}, DOB: ${patient.dob}, UR Number: ${patient.ur_number}`}
                    aria-label="Patient Details"
                >
                    <PatientDetails patient={patient} />
                </Tooltip>
            </Td>
            <Td width="40%">
                <Box>
                    <Text fontStyle="italic">{patient.encounter_summary}</Text>
                    <Button
                        className="green-button"
                        size="sm"
                        mt={2}
                        onClick={() => handleSelectPatient(patient)}
                    >
                        Go to Encounter
                    </Button>
                </Box>
            </Td>
            <Td width="30%" verticalAlign="top">
                <HStack spacing={2} alignItems="flex-start">
                    <Tooltip label="Reset jobs" aria-label="Reset jobs">
                        <IconButton
                            icon={<RepeatIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                resetJobsItems(
                                    patient.id,
                                    patients,
                                    setPatients,
                                    refreshSidebar,
                                )
                            }
                        />
                    </Tooltip>
                    <VStack align="start" spacing={1}>
                        {patient.jobs_list &&
                            patient.jobs_list.map((item, index) => (
                                <Checkbox
                                    key={index}
                                    className="checkbox task-checkbox"
                                    isChecked={item.completed}
                                    onChange={() =>
                                        toggleJobsItem(
                                            patient.id,
                                            index,
                                            patients,
                                            refreshSidebar,
                                        )
                                    }
                                    alignItems="flex-start"
                                    sx={{
                                        ".chakra-checkbox__label": {
                                            display: "block",
                                            whiteSpace: "normal",
                                            paddingTop: 0,
                                        },
                                        ".chakra-checkbox__control": {
                                            marginTop: "3px",
                                        },
                                    }}
                                >
                                    {item.job}
                                </Checkbox>
                            ))}
                    </VStack>
                </HStack>
            </Td>
        </Tr>
    );

    return (
        <Box p="5" borderRadius="sm" w="100%">
            <Text as="h2">{title}</Text>
            {groupByDate ? (
                Object.entries(
                    patients.reduce((acc, patient) => {
                        const date = patient.encounter_date;
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(patient);
                        return acc;
                    }, {}),
                )
                    .sort(([a], [b]) => new Date(b) - new Date(a))
                    .map(([date, patients]) => (
                        <Box key={date} mb={8}>
                            <Text as="h3" mb={2}>
                                {new Date(date).toLocaleDateString()}
                            </Text>
                            <Box overflowX="auto">
                                <Table variant="simple">
                                    <Thead>
                                        <Tr>
                                            <Th width="30%">Patient Details</Th>
                                            <Th width="40%">
                                                Encounter Summary
                                            </Th>
                                            <Th width="30%">Plan</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {patients
                                            .sort((a, b) =>
                                                a.name.localeCompare(b.name),
                                            )
                                            .map((patient, index) =>
                                                renderPatientRow(
                                                    patient,
                                                    index,
                                                ),
                                            )}
                                    </Tbody>
                                </Table>
                            </Box>
                        </Box>
                    ))
            ) : (
                <Box overflowX="auto">
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th width="30%">Patient Details</Th>
                                <Th width="40%">Encounter Summary</Th>
                                <Th width="30%">Plan</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {patients.map((patient, index) =>
                                renderPatientRow(patient, index),
                            )}
                        </Tbody>
                    </Table>
                </Box>
            )}
        </Box>
    );
};

export default PatientTable;
