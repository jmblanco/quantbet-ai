import { createApp } from 'vue';
import axios from 'axios';
import './style.css';
import App from './App.vue';

// Interceptor de resiliencia de red: reintenta automáticamente si el proxy o socket sufre desconexión
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (config && (!config.__retryCount || config.__retryCount < 2)) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 150));
      return axios(config);
    }
    return Promise.reject(error);
  }
);

createApp(App).mount('#app');
