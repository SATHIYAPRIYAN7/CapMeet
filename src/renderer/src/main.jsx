import './assets/main.css'
import { createRoot } from 'react-dom/client'
import App from './App'
import { QueryClientProvider } from '@tanstack/react-query'
import queryClient from './api/queryClient'
import { Toaster } from './components/ui/sonner'

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <App />
  </QueryClientProvider>
)
