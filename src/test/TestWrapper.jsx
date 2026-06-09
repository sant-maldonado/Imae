import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../components/Toast'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

export function TestWrapper({ children, initialEntries = ['/'] }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
