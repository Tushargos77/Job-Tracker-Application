import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


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
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },
  resetPassword: async (token, newPassword) => {
    const response = await api.post("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
    return response.data;
  },
  googleLogin: async (credential) => {
    const response = await api.post("/auth/google", { credential });
    return response.data;
  },
  updatePhone: async (phone) => {
    const response = await api.put("/auth/me/phone", { phone });
    return response.data;
  },
};