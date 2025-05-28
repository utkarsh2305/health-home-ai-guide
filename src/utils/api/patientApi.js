// API functions for patient related data operations.
import { handleApiRequest } from "../helpers/apiHelpers";

export const patientApi = {
    async savePatientData(saveRequest, toast, refreshSidebar) {
        try {
            const response = await fetch("/api/patient/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(saveRequest),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to save patient");
            }

            const data = await response.json();

            toast({
                title: "Success",
                description: "Patient data saved successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });

            if (refreshSidebar) {
                await refreshSidebar();
            }

            return data;
        } catch (error) {
            console.error("Error saving patient:", error);
            throw error;
        }
    },

    searchPatient: async (urNumber, callbacks = {}) => {
        return handleApiRequest({
            apiCall: () => fetch(`/api/patient/search?ur_number=${urNumber}`),
            onSuccess: (data) => {
                if (data.length > 0) {
                    const latestEncounter = data[0];

                    // Safely iterate over callbacks
                    if (callbacks && typeof callbacks === "object") {
                        Object.entries(callbacks).forEach(([key, setter]) => {
                            if (
                                typeof setter === "function" &&
                                latestEncounter[key] !== undefined
                            ) {
                                setter(latestEncounter[key]);
                            }
                        });
                    }

                    return latestEncounter;
                }
                return null;
            },
            successMessage:
                "Patient data pre-filled from the latest encounter.",
            errorMessage: "No patient data found",
        });
    },

    fetchPatientDetails: async (patientId, setters) => {
        return handleApiRequest({
            apiCall: () => fetch(`/api/patient/id/${patientId}`),
            onSuccess: (patientData) => {
                if (setters.setPatient) {
                    setters.setPatient(patientData);
                }
                if (setters.setSelectedDate && setters.isFromOutstandingJobs) {
                    setters.setSelectedDate(patientData.encounter_date);
                    setters.setIsFromOutstandingJobs(false);
                }
                console.log(patientData);
                return patientData;
            },
            errorMessage: "Failed to fetch patient details",
        });
    },

    updateJobsList: async (patientId, jobsList) => {
        return handleApiRequest({
            apiCall: () =>
                fetch(`/api/patient/update-jobs-list`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ patientId, jobsList }),
                }),
            errorMessage: "Failed to update jobs list",
        });
    },

    generateReasoning: async (patientId, toast) => {
        return handleApiRequest({
            apiCall: () =>
                fetch(`/api/patient/${patientId}/reasoning`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }),
            successMessage: "Clinical reasoning generated successfully.",
            errorMessage: "Error running clinical reasoning",
            toast,
        });
    },
};
