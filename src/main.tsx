import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RotateCw, AlertTriangle } from 'lucide-react'
import './index.css'
import App from './App'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Erro não capturado na interface do Cinera:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Ops, algo deu errado</h1>
          <p className="text-zinc-400 text-sm max-w-md mb-8 leading-relaxed">
            Ocorreu uma instabilidade inesperada na renderização. Recarregue a página para restabelecer a sessão do Cinera.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors active:scale-95 shadow-lg shadow-white/5"
          >
            <RotateCw className="w-4 h-4" />
            Recarregar Página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutos de frescor (catálogo estável)
      gcTime: 1000 * 60 * 60 * 2, // 2 horas de retenção em memória
      refetchOnWindowFocus: false, // Sem refetch desnecessário ao alternar abas
      retry: 1,
    },
  },
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento root não encontrado no DOM.')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)