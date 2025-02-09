import { handleApiRequest } from "../helpers/apiHelpers";

export const templateApi = {
    fetchTemplates: () =>
        handleApiRequest({
            apiCall: () => fetch("/api/templates"),
            errorMessage: "Failed to fetch templates",
        }),

    getDefaultTemplate: () =>
        handleApiRequest({
            apiCall: () => fetch("/api/templates/default"),
            errorMessage: "Failed to fetch default template",
        }),

    getTemplateByKey: (templateKey) =>
        handleApiRequest({
            apiCall: () => fetch(`/api/templates/${templateKey}`),
            errorMessage: `Failed to fetch template: ${templateKey}`,
        }),

    setDefaultTemplate: (templateKey) =>
        handleApiRequest({
            apiCall: () =>
                fetch(`/api/templates/default/${templateKey}`, {
                    method: "POST",
                }),
            successMessage: "Default template updated successfully",
            errorMessage: "Failed to set default template",
        }),

    saveTemplates: (templates) =>
        handleApiRequest({
            apiCall: () => {
                const templatesArray = Array.isArray(templates)
                    ? templates
                    : Object.values(templates);

                return fetch("/api/templates", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(templatesArray),
                });
            },
            successMessage: "Templates saved successfully",
            errorMessage: "Failed to save templates",
            transformResponse: (data) => ({
                message: data.message,
                details: data.details,
                updated_keys: data.updated_keys,
            }),
        }),
};
