import axiosInstance from '@/api/axiosInstance'
import { useQuery, useMutation } from '@tanstack/react-query'

export const useGetUser = (enabled) => {
  return useQuery({
    queryKey: ['getUser'],
    queryFn: async () => {
      return await axiosInstance.get('/users')
    },
    enabled,
  })
}


export const useUserLogin = () => {
  return useMutation({
    mutationFn: async (data) => {
      return await axiosInstance.post('/auth/login', data)
    },
  })
}

export const useGetLatestRecordings = (enabled) => {
  return useQuery({
    queryKey: ['getLatestRecording'],
    queryFn: async () => {
      return await axiosInstance.get('/recordings/v1/last-recordings')
    },
    enabled,
  })
}

