import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import AppRouter from './routes/AppRouter'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'

const queryClient = new QueryClient()

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
