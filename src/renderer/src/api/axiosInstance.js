import axios from 'axios'

const axiosInstance = axios.create({
  // baseURL: 'https://class-capsule-2.onrender.com',
  baseURL:'https://api-dev-classcapsule.nfndev.com',
  timeout: 100000,
})

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isUnauth = error.response && (error.response.status === 401 || error.response.status === 403);
    const isOnLoginPage = window.location.pathname === '/login';

    if (isUnauth && !isOnLoginPage) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
)

export default axiosInstance
