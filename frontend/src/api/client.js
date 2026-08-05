import axios from "axios";

// Temporary: directly use the deployed backend
const baseURL = "https://job-tracker-application-1-gy8p.onrender.com";

console.log("Using API:", baseURL);

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Normalize API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
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