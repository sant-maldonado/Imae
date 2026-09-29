import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import InstallPrompt from '../InstallPrompt'
import useInstallPrompt from '../../hooks/useInstallPrompt'
import { useRealtime } from '../../hooks/useRealtime'

export default function Layout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useRealtime()
  // El hook vive aca y no en el sidebar para que el item que abre el sheet y el
  // sheet compartan el mismo beforeinstallprompt capturado.
  const prompt = useInstallPrompt()

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen bg-slate-200 dark:bg-slate-900">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-200 ease-in-out md:static md:z-auto md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          instalable={prompt.instalable}
          onInstall={prompt.abrir}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-auto p-3 md:p-6">
          {/* Afuera del div con key: ese se remonta en cada navegacion y el
              sheet volveria a abrirse aunque ya lo hayan cerrado. */}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
      <InstallPrompt
        abierto={prompt.abierto}
        plataforma={prompt.plataforma}
        evento={prompt.evento}
        instalar={prompt.instalar}
        cerrarTemporal={prompt.cerrarTemporal}
        descartar={prompt.descartar}
      />
    </div>
  )
}
