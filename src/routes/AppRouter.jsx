import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from '../components/layout/Layout'
import ProtectedRoute from './ProtectedRoute'
import RequirePermiso from './RequirePermiso'
import { SkeletonSpinner } from '../components/Skeleton'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import WorkOrderForm from '../pages/WorkOrderForm'
import PurchaseForm from '../pages/PurchaseForm'
import EquipmentList from '../pages/EquipmentList'
import Technicians from '../pages/Technicians'
import Calendar from '../pages/Calendar'
import Profile from '../pages/Profile'
import ResetPassword from '../pages/ResetPassword'
import NotFound from '../pages/NotFound'

const WorkOrders = lazy(() => import('../pages/WorkOrders'))
const WorkOrderDetail = lazy(() => import('../pages/WorkOrderDetail'))
const WorkOrderEdit = lazy(() => import('../pages/WorkOrderEdit'))
const Purchases = lazy(() => import('../pages/Purchases'))
const PurchaseDetail = lazy(() => import('../pages/PurchaseDetail'))
const EquipmentDetail = lazy(() => import('../pages/EquipmentDetail'))
const Reports = lazy(() => import('../pages/Reports'))

function SuspenseWrapper({ children }) {
  return (
    <Suspense fallback={<div className="p-4"><SkeletonSpinner /></div>}>
      {children}
    </Suspense>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/ordenes"
            element={<SuspenseWrapper><WorkOrders /></SuspenseWrapper>}
          />
          <Route
            path="/ordenes/nueva"
            element={
              <RequirePermiso capacidad="crearOrden">
                <WorkOrderForm />
              </RequirePermiso>
            }
          />
          <Route
            path="/ordenes/:id"
            element={<SuspenseWrapper><WorkOrderDetail /></SuspenseWrapper>}
          />
          <Route
            path="/ordenes/:id/editar"
            element={
              <RequirePermiso capacidad="editarOrden">
                <WorkOrderEdit />
              </RequirePermiso>
            }
          />
          <Route path="/compras" element={<SuspenseWrapper><Purchases /></SuspenseWrapper>} />
          <Route
            path="/compras/nueva"
            element={
              <RequirePermiso capacidad="crearCompra">
                <PurchaseForm />
              </RequirePermiso>
            }
          />
          <Route path="/compras/:id" element={<SuspenseWrapper><PurchaseDetail /></SuspenseWrapper>} />
          <Route path="/equipos" element={<EquipmentList />} />
          <Route path="/equipos/:id" element={<SuspenseWrapper><EquipmentDetail /></SuspenseWrapper>} />
          <Route path="/tecnicos" element={<Technicians />} />
          <Route path="/calendario" element={<Calendar />} />
          <Route
            path="/reportes"
            element={
              <RequirePermiso capacidad="verReportes">
                <SuspenseWrapper><Reports /></SuspenseWrapper>
              </RequirePermiso>
            }
          />
          <Route path="/perfil" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
