import axios from "axios";

// Set VITE_API_URL in frontend/.env (see .env.example). Falls back to the hosted API.
const baseURL = (
  import.meta.env.VITE_API_URL || "https://job-tracker-application-1-gy8p.onrender.com"
).replace(/\/+$/, "");

export const TOKEN_KEY = "token";
export const UNAUTHORIZED_EVENT = "auth:unauthorized";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the auth token to every outgoing request, if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// FastAPI returns `detail` as a string for most errors, but as a list of
// objects for validation errors (422). Turn either into a readable message.
function readableDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const msg = String(d?.msg || "").replace(/^Value error, /, "");
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null;
        return field && field !== "body" ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean)
      .join(". ");
  }
  return null;
}

// Normalize API errors, and sign the user out if their session has expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthRequest = url.includes("/auth/login") || url.includes("/auth/signup");

    if (error.response?.status === 401 && !isAuthRequest && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    const message =
      readableDetail(error.response?.data?.detail) ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong. Please try again.";

    return Promise.reject(new Error(message));
  }
);

export const jobsApi = {
  list: async () => {
    const response = await api.get("/jobs");
    return response.data;
  },
  create: async (job) => {
    const response = await api.post("/jobs", job);
    return response.data;
  },
  update: async (id, job) => {
    const response = await api.put(`/jobs/${id}`, job);
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
};

export const authApi = {
  signup: async (email, password) => {
    const response = await api.post("/auth/signup", { email, password });
    return response.data;
  },
  login: async (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const response = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  },
  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};
