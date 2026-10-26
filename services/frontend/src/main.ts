import { createApp } from 'vue';
import axios from 'axios';
import './style.css';
import App from './App.vue';

// Conexión directa y rápida a la API de Fastify (evita el bug de ECONNRESET del proxy de Vite en Windows)
const apiHost = typeof window !== 'undefined' && window.location.hostname
  ? window.location.hostname
  : '127.0.0.1';
axios.defaults.baseURL = import.meta.env.VITE_API_URL || `http://${apiHost}:3333`;
axios.defaults.timeout = 8000;

// Interceptor de resiliencia solo ante desconexión física de socket o caída transitoria
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    if (isNetworkError && config && (!config.__retryCount || config.__retryCount < 2)) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
      return axios(config);
    }
    return Promise.reject(error);
  }
);

createApp(App).mount('#app');
