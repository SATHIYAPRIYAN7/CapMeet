import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

const defaultQueryFn = async ({ queryKey }) => {
  try {
    const { data } = await axios.get(`${queryKey[0]}`)
    return data
  } catch {
    return { error: 'Something went wrong' }
  }
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 5 * 60 * 1000
      //   cacheTime: 1000 * 60 * 10,
    }
  }
})

export default queryClient
