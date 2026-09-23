import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL;

if (typeof apiBaseUrl !== "string" || apiBaseUrl.trim().length === 0) {
  throw new Error("VITE_API_URL is not configured");
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" }
});
