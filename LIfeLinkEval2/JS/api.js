/* =====================================================
   LIFELINK - FRONTEND REST API CLIENT
   Manages network requests, tokens, and error handling
   ===================================================== */

const API_BASE_URL = (function () {
    if (typeof window !== "undefined" && window.location) {
        // If loaded on any remote production domain (e.g. Render, custom domain), use relative path
        if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
            return "";
        }
        // If served by local Express server on port 5000
        if (window.location.port === "5000") {
            return "";
        }
        // If running via Live Server (e.g. port 5500 or 3000) during local development
        return "http://localhost:5000";
    }
    return "";
})();

const TOKEN_KEY = "lifelink_auth_token";
const USER_KEY = "lifelink_auth_user";

const api = {
    // Auth token helpers
    getToken: function () {
        try {
            return localStorage.getItem(TOKEN_KEY) || null;
        } catch (e) {
            return null;
        }
    },

    setToken: function (token) {
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch (e) {
            console.warn("Could not save auth token", e);
        }
    },

    clearToken: function () {
        try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        } catch (e) {
            console.warn("Could not clear auth token", e);
        }
    },

    getUser: function () {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY)) || null;
        } catch (e) {
            return null;
        }
    },

    setUser: function (user) {
        try {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (e) {
            console.warn("Could not save user", e);
        }
    },

    // Base request dispatcher
    request: async function (endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            "Content-Type": "application/json",
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errorMessage = data.message || `Request failed with status ${response.status}`;
                const error = new Error(errorMessage);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`API Error on [${options.method || "GET"}] ${endpoint}:`, error.message);
            throw error;
        }
    },

    // HTTP Verbs
    get: function (endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: "GET" });
    },

    post: function (endpoint, body = {}) {
        return this.request(endpoint, {
            method: "POST",
            body: JSON.stringify(body)
        });
    },

    patch: function (endpoint, body = {}) {
        return this.request(endpoint, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },

    delete: function (endpoint) {
        return this.request(endpoint, { method: "DELETE" });
    },

    // --- Specialized Donor Endpoints ---
    getDonors: function (filters = {}) {
        return this.get("/api/donors", filters);
    },

    getDonorById: function (id) {
        return this.get(`/api/donors/${id}`);
    },

    registerDonorWizard: function (donorData) {
        return this.post("/api/donors/register-wizard", donorData);
    },

    updateDonorAvailability: function (donorId, availability) {
        return this.patch(`/api/donors/${donorId}/availability`, { availability });
    },

    addDonationRecord: function (donorId, donationData) {
        return this.post(`/api/donors/${donorId}/donations`, donationData);
    },

    deleteDonorProfile: function (donorId) {
        return this.delete(`/api/donors/${donorId}`);
    },

    // --- Specialized Blood Request Endpoints ---
    getRequests: function (filters = {}) {
        return this.get("/api/requests", filters);
    },

    getRequestById: function (id) {
        return this.get(`/api/requests/${id}`);
    },

    createRequest: function (requestData) {
        return this.post("/api/requests", requestData);
    },

    updateRequest: function (id, requestData) {
        return this.patch(`/api/requests/${id}`, requestData);
    },

    cancelRequest: function (id, reason) {
        return this.post(`/api/requests/${id}/cancel`, { reason });
    },

    fulfillRequest: function (id, outcomeData) {
        return this.post(`/api/requests/${id}/fulfill`, outcomeData);
    },

    deleteRequest: function (id) {
        return this.delete(`/api/requests/${id}`);
    },

    // --- Specialized Hospital Console & Analytics Endpoints ---
    getHospitalStats: function (params = {}) {
        return this.get("/api/hospital/dashboard-stats", params);
    },

    getHospitalProfile: function (id) {
        return this.get(`/api/hospital/profile/${id}`);
    },

    verifyHospital: function (id, status, notes) {
        return this.patch(`/api/hospital/${id}/verify`, { status, notes });
    },

    getAuditLogs: function () {
        return this.get("/api/hospital/audit-logs");
    },

    // --- Specialized Smart Matcher Endpoints ---
    findMatches: function (matchCriteria) {
        return this.post("/api/matcher/find-matches", matchCriteria);
    },

    findMatchesForRequest: function (requestId) {
        return this.get(`/api/matcher/request/${requestId}`);
    },

    // --- Specialized Invitation & Inbox Endpoints ---
    sendInvitation: function (invitationData) {
        return this.post("/api/invitations/send", invitationData);
    },

    getInvitationsForRequest: function (requestId) {
        return this.get(`/api/invitations/request/${requestId}`);
    },

    getDonorInbox: function (donorId) {
        const params = donorId ? { donorId } : {};
        return this.get("/api/invitations/inbox", params);
    },

    respondToInvitation: function (invitationId, status, note = "") {
        return this.patch(`/api/invitations/${invitationId}/respond`, { status, note });
    },

    // --- Specialized Notification & Escalation Endpoints ---
    getNotifications: function () {
        return this.get("/api/notifications");
    },

    markNotificationRead: function (id) {
        return this.patch(`/api/notifications/${id}/read`);
    },

    markAllNotificationsRead: function () {
        return this.patch("/api/notifications/mark-all-read");
    },

    checkEscalation: function () {
        return this.post("/api/notifications/check-escalation");
    },

    // --- User & Profile Endpoints ---
    getMe: function () {
        return this.get("/api/auth/me");
    },

    updateMyProfile: function (profileData) {
        return this.patch("/api/auth/me/profile", profileData);
    }
};

window.api = api;
