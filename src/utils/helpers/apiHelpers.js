// Helper functions for common API request handling.
export const handleApiRequest = async ({
    apiCall,
    setLoading = null,
    onSuccess = null,
    onError = null,
    successMessage = null,
    errorMessage = null,
    toast = null,
    finallyCallback = null,
}) => {
    if (setLoading) setLoading(true);

    try {
        const response = await apiCall();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (onSuccess) {
            onSuccess(data);
        }

        if (successMessage && toast) {
            toast({
                title: "Success",
                description: successMessage,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        }

        return data;
    } catch (error) {
        console.error("API Error:", error);

        if (onError) {
            onError(error);
        }

        if (toast) {
            toast({
                title: "Error",
                description: errorMessage || error.message,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }

        throw error;
    } finally {
        if (setLoading) setLoading(false);
        if (finallyCallback) finallyCallback();
    }
};

// Utility function for handling form data
export const createFormData = (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            formData.append(key, value);
        }
    });
    return formData;
};

// Utility function for handling query parameters
export const createQueryString = (params) => {
    return Object.entries(params)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(
            ([key, value]) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        )
        .join("&");
};
