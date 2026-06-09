import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as api from '../../services/api'

const mockFetchOrdenes = vi.spyOn(api, 'fetchOrdenes')
const mockCreateOrden = vi.spyOn(api, 'createOrden')

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useOrdenes', () => {
  it('calls fetchOrdenes and returns data', async () => {
    mockFetchOrdenes.mockResolvedValue([{ id: 1, titulo: 'Test' }])
    const { useOrdenes } = await import('../useApi')
    const { result } = renderHook(() => useOrdenes(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 1, titulo: 'Test' }])
    expect(mockFetchOrdenes).toHaveBeenCalledOnce()
  })
})

describe('useCreateOrden', () => {
  it('calls createOrden and invalidates query', async () => {
    mockCreateOrden.mockResolvedValue({ id: 2 })
    const { useCreateOrden, useOrdenes } = await import('../useApi')

    mockFetchOrdenes.mockResolvedValue([{ id: 1 }])

    const { result: queryResult } = renderHook(() => useOrdenes(), { wrapper })
    await waitFor(() => expect(queryResult.current.isSuccess).toBe(true))

    const { result: mutationResult } = renderHook(() => useCreateOrden(), { wrapper })
    mutationResult.current.mutate({ titulo: 'New' })

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true))
    expect(mockCreateOrden).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'New' }), expect.anything())
  })
})
