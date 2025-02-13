// Page component that renders a summary of patients for a selected date.
import { useEffect, useState } from "react";
import PatientTable from "../components/patient/PatientTable";

const ClinicSummary = ({
    selectedDate,
    handleSelectPatient,
    refreshSidebar,
}) => {
    const [patients, setPatients] = useState([]);

    const fetchPatients = async (date, detailed = true) => {
        try {
            const response = await fetch(
                `/api/patient/list?date=${date}&detailed=${detailed}`,
            );
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const data = await response.json();
            setPatients(
                data.map((patient) => ({
                    ...patient,
                    jobs_list: JSON.parse(patient.jobs_list || "[]"),
                })),
            );
        } catch (error) {
            console.error("Error fetching patients:", error);
        }
    };

    useEffect(() => {
        fetchPatients(selectedDate);
    }, [selectedDate]);

    return (
        <PatientTable
            patients={patients}
            setPatients={setPatients}
            handleSelectPatient={handleSelectPatient}
            refreshSidebar={refreshSidebar}
            title={`Clinic Summary for ${selectedDate}`}
        />
    );
};

export default ClinicSummary;
