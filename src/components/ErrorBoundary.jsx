import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h1 className="text-6xl font-bold text-slate-300 mb-4">:(</h1>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Algo salió mal</h2>
            <p className="text-slate-500 mb-2">Ocurrió un error inesperado. Recargá la página o volvé al inicio.</p>
            {this.state.error && (
              <p className="text-xs text-red-400 bg-red-50 rounded-lg px-3 py-2 mb-6 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
