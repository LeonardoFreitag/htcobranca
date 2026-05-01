import axios from 'axios';

// The functions URL can be set via environment variable VITE_FUNCTIONS_URL.
// Default: attempt to use Vite proxy (/api), fallback to local emulator URL.
// const projectId = 'htcobranca-43a32';
// const defaultEmulatorUrl = `http://localhost:5002/${projectId}/us-central1/api`;
// Prefer explicit env var, otherwise use Vite proxy '/api'. You can set VITE_FUNCTIONS_URL to the emulator URL.
const baseURL = (import.meta.env.VITE_FUNCTIONS_URL as string) || '/api';

console.log('Functions API Base URL:', baseURL);

export const functionsApi = axios.create({
  baseURL,
});

export default functionsApi;
