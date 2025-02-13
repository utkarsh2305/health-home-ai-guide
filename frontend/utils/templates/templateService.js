import { settingsApi } from "../api/settingsApi";
import { settingsHelpers } from "../helpers/settingsHelpers";
const templateCache = new Map();
export const templateService = {
    fetchTemplates: async () => {
        try {
            const response = await fetch("/api/templates");
            if (!response.ok) {
                throw new Error("Failed to fetch templates");
            }
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch templates:", error);
            throw error;
        }
    },

    async getDefaultTemplate() {
        try {
            const response = await fetch("/api/templates/default");
            if (!response.ok) {
                throw new Error("Failed to fetch default template");
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to get default template:", error);
            throw error;
        }
    },
    setDefaultTemplate: async (templateKey, toast) => {
        try {
            await settingsApi.setDefaultTemplate(templateKey);
            if (toast) {
                settingsHelpers.showSuccessToast(
                    toast,
                    "Default template updated successfully",
                );
            }
        } catch (error) {
            if (toast) {
                settingsHelpers.showErrorToast(
                    toast,
                    "Failed to set default template",
                );
            }
            throw error;
        }
    },

    async getTemplateByKey(templateKey) {
        // Check cache first
        if (templateCache.has(templateKey)) {
            return templateCache.get(templateKey);
        }

        try {
            const response = await fetch(`/api/templates/${templateKey}`);
            if (!response.ok) {
                throw new Error("Failed to fetch template");
            }
            const template = await response.json();

            // Cache the template
            templateCache.set(templateKey, template);

            return template;
        } catch (error) {
            console.error(`Failed to fetch template ${templateKey}:`, error);
            throw error;
        }
    },
};
