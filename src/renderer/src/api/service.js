import axiosInstance from './axiosInstance';

export const fetchData = async () => {
  const response = await axiosInstance.get('/products');
  return response.data;
};