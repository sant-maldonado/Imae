import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

const channelName = `ordenes-changes-${Date.now()}`

export function useRealtime() {
  const toast = useToast()

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ordenes' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success(`Nueva orden: #${payload.new.id}`)
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.estado !== payload.old.estado) {
              toast.success(`Orden #${payload.new.id}: estado cambiado a "${payload.new.estado}"`)
            }
          } else if (payload.eventType === 'DELETE') {
            toast.error(`Orden #${payload.old.id} eliminada`)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [toast])
}
