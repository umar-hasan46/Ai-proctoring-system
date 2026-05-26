const API_BASE_URL = import.meta.env.VITE_API_URL || "https://ai-proctoring-backend-5t3k.onrender.com";

export default API_BASE_URL;

// Re-export api functions from the local api object if needed
import { api } from '../api/api';
