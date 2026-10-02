import axios from "axios";

// Change this to your deployed backend URL later (e.g. https://yourapp.onrender.com/api)
const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({ baseURL: API_BASE_URL });

// Attach the login token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
