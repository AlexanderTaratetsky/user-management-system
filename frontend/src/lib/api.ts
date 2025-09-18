import axios from 'axios';

const fallbackBaseUrl = window.location.protocol + '//' + window.location.hostname + ':4000';
const baseURL = import.meta.env.VITE_API_URL || fallbackBaseUrl;

const api = axios.create({ baseURL });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = 'Bearer ' + token;
  return cfg;
});

export default api;
