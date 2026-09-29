import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppRouter from './routes/AppRouter'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import PwaUpdates from './components/PwaUpdates'

const queryClient = new QueryClient()

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthProvider>
              <PwaUpdates />
              <AppRouter />
            </AuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
