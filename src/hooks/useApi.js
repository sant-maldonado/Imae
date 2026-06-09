import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/api'

export function useEquipos() {
  return useQuery({ queryKey: ['equipos'], queryFn: api.fetchEquipos })
}

export function useEquipo(id) {
  return useQuery({ queryKey: ['equipo', id], queryFn: () => api.fetchEquipo(id), enabled: !!id })
}

export function useTecnicos() {
  return useQuery({ queryKey: ['tecnicos'], queryFn: api.fetchTecnicos })
}

export function useTecnico(id) {
  return useQuery({ queryKey: ['tecnico', id], queryFn: () => api.fetchTecnico(id), enabled: !!id })
}

export function useOrdenes() {
  return useQuery({ queryKey: ['ordenes'], queryFn: api.fetchOrdenes })
}

export function useOrden(id) {
  return useQuery({ queryKey: ['orden', id], queryFn: () => api.fetchOrden(id), enabled: !!id })
}

export function useCreateOrden() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createOrden,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordenes'] }),
  })
}

export function useUpdateOrden() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateOrden(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordenes'] }),
  })
}

export function useDeleteOrden() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteOrden,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ordenes'] }),
  })
}

export function useCompras() {
  return useQuery({ queryKey: ['compras'], queryFn: api.fetchCompras })
}

export function useCompra(id) {
  return useQuery({ queryKey: ['compra', id], queryFn: () => api.fetchCompra(id), enabled: !!id })
}

export function useCreateCompra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createCompra,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compras'] }),
  })
}

export function useUpdateCompra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.updateCompra(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compras'] }),
  })
}

export function useDeleteCompra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteCompra,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compras'] }),
  })
}

export function useFotos(ordenId) {
  return useQuery({ queryKey: ['fotos', ordenId], queryFn: () => api.fetchFotos(ordenId), enabled: !!ordenId })
}

export function useCreateFoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createFoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fotos'] }),
  })
}

export function useDeleteFoto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteFoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fotos'] }),
  })
}

export function useDashboardStats() {
  return useQuery({ queryKey: ['dashboardStats'], queryFn: api.fetchDashboardStats })
}
