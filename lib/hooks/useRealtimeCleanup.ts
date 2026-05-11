import { useEffect, useRef } from 'react'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

/**
 * Hook to ensure proper cleanup of Supabase realtime subscriptions
 * Prevents memory leaks from unclosed channels
 */
export function useRealtimeCleanup(
  supabase: SupabaseClient,
  channelName: string,
  setupChannel: (channel: RealtimeChannel) => RealtimeChannel
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isCleanedUpRef = useRef(false)

  useEffect(() => {
    isCleanedUpRef.current = false

    // Create and setup channel
    const channel = supabase.channel(channelName)
    const configuredChannel = setupChannel(channel)

    // Subscribe
    configuredChannel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug(`Realtime channel ${channelName} subscribed`)
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(`Realtime channel ${channelName} error`)
        } else if (status === 'TIMED_OUT') {
          logger.warn(`Realtime channel ${channelName} timed out`)
        }
      })

    channelRef.current = configuredChannel

    // Cleanup function
    return () => {
      if (isCleanedUpRef.current) {
        return // Already cleaned up
      }

      isCleanedUpRef.current = true

      if (channelRef.current) {
        logger.debug(`Cleaning up realtime channel ${channelName}`)

        try {
          // Unsubscribe and remove channel
          supabase.removeChannel(channelRef.current)
          channelRef.current = null
        } catch (error) {
          logger.error(`Error cleaning up channel ${channelName}:`, error)
        }
      }
    }
  }, [supabase, channelName]) // Dependencies: recreate if these change

  return channelRef
}

/**
 * Hook for monitoring and cleaning up zombie channels
 * Useful for debugging subscription leaks
 */
export function useRealtimeMonitor(supabase: SupabaseClient, enabled: boolean = false) {
  useEffect(() => {
    if (!enabled || process.env.NODE_ENV !== 'development') {
      return
    }

    const interval = setInterval(() => {
      const channels = supabase.getChannels()
      if (channels.length > 0) {
        logger.debug(`Active realtime channels: ${channels.length}`,
          channels.map(c => c.topic)
        )
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [supabase, enabled])
}
