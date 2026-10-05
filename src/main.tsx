import './infrastructure/zod-config'
import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RotateCw } from 'lucide-react'
import { StatusMessage, statusButtonClassName } from '@/features/feedback/StatusMessage'
import './index.css'
import App from './App'
import { lockViewportHeight } from './lib/stable-viewport'
import { initPageScroll } from './lib/page-scroll'

// Medidor de FPS (só no npm run dev, com ?fps=1 na URL); some do build publicado
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('fps')) {
  void import('./dev/fps-meter').then((m) => m.startFpsMeter())
}

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
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 font-sans">
          <StatusMessage
            emoji="🤯"
            title="Ops, algo deu errado"
            description="Ocorreu uma instabilidade inesperada na renderização. Recarregue a página para restabelecer a sessão do Cinera."
            titleAs="h1"
            flush
          >
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={statusButtonClassName}
            >
              <RotateCw size={14} />
              <span>Recarregar Página</span>
            </button>
          </StatusMessage>
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

initPageScroll()
lockViewportHeight()

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)