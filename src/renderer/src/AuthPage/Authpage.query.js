import axiosInstance from '@/api/axiosInstance'
import { useQuery, useMutation } from '@tanstack/react-query'

export const useGetUser = (enabled) => {
  return useQuery({
    queryKey: ['getUser'],
    queryFn: async () => {
      return await axiosInstance.get('/users/get-user')
    },
    enabled,
  })
}


export const useSignup = () => {
  return useMutation({
    mutationFn: async (data) => {
      return await axiosInstance.post('/users/signup', data)
    },
  })
}

export const useUserLogin = () => {
  return useMutation({
    mutationFn: async (data) => {
      return await axiosInstance.post('/auth/login', data)
    },
  })
}

