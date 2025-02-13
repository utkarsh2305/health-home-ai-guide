// API functions for handling landing page data and requests.
import { handleApiRequest } from "../helpers/apiHelpers";

export const landingApi = {
    fetchFeeds: () =>
        handleApiRequest({
            apiCall: () => fetch("/api/dashboard/rss/list"),
            errorMessage: "Error fetching feeds",
        }),

    fetchRssDigests: () =>
        handleApiRequest({
            apiCall: () => fetch("/api/dashboard/rss/digest"),
            errorMessage: "Error fetching RSS digests",
        }),

    refreshAllFeeds: () =>
        handleApiRequest({
            apiCall: () =>
                fetch("/api/dashboard/rss/refresh", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ feed_id: null }), // Explicitly send null for feed_id
                }),
            successMessage: "All feeds refreshed successfully",
            errorMessage: "Error refreshing all feeds",
        }),

    refreshSingleFeed: (feedId) =>
        handleApiRequest({
            apiCall: () =>
                fetch("/api/dashboard/rss/refresh", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ feed_id: feedId }),
                }),
            successMessage: "Feed refreshed successfully",
            errorMessage: "Error refreshing feed",
        }),

    fetchIncompleteJobs: () =>
        handleApiRequest({
            apiCall: () => fetch("/api/patient/incomplete-jobs-count"),
            errorMessage: "Error fetching incomplete tasks count",
        }),

    addTodo: (task) =>
        handleApiRequest({
            apiCall: () =>
                fetch("/api/dashboard/todos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ task }),
                }),
            successMessage: "Todo added successfully",
            errorMessage: "Error adding todo",
        }),

    toggleTodo: (id, completed, task) =>
        handleApiRequest({
            apiCall: () =>
                fetch(`/api/dashboard/todos/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ task, completed: !completed }), // Include both task and completed fields
                }),
            successMessage: "Todo updated successfully",
            errorMessage: "Error updating todo",
        }),

    deleteTodo: (id) =>
        handleApiRequest({
            apiCall: () =>
                fetch(`/api/dashboard/todos/${id}`, { method: "DELETE" }),
            successMessage: "Todo deleted successfully",
            errorMessage: "Error deleting todo",
        }),

    addFeed: (url) =>
        handleApiRequest({
            apiCall: () =>
                fetch("/api/dashboard/rss/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url }),
                }),
            successMessage: "Feed added successfully",
            errorMessage: "Error adding feed",
        }),

    removeFeed: (feedId) =>
        handleApiRequest({
            apiCall: () =>
                fetch(`/api/dashboard/rss/remove/${feedId}`, {
                    method: "DELETE",
                }),
            successMessage: "Feed removed successfully",
            errorMessage: "Error removing feed",
        }),

    fetchRssItems: (feeds) =>
        handleApiRequest({
            apiCall: () =>
                fetch("/api/dashboard/rss/fetch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ feeds }),
                }),
            errorMessage: "Error fetching RSS items",
        }),

    fetchAnalysis: () =>
        handleApiRequest({
            apiCall: () => fetch("/api/dashboard/analysis/latest"),
            errorMessage: "Error fetching analysis",
        }),

    refreshAnalysis: () =>
        handleApiRequest({
            apiCall: () =>
                fetch("/api/dashboard/analysis/generate", { method: "POST" }),
            successMessage: "Analysis refreshed successfully",
            errorMessage: "Error refreshing analysis",
        }),

    fetchServerInfo: () =>
        handleApiRequest({
            apiCall: () => fetch("/api/dashboard/server/info"),
            errorMessage: "Error fetching server information",
        }),

    refreshRssDigests: () =>
        handleApiRequest({
            apiCall: () =>
                fetch("/api/dashboard/rss/digest/refresh", { method: "POST" }),
            successMessage: "News digest refreshed successfully",
            errorMessage: "Error refreshing digest",
        }),
};
