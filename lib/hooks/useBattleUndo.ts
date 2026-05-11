import { useState, useCallback, useRef, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

interface BattleRecord {
  winnerId: string
  loserId: string
  winnerOldRating: number
  loserOldRating: number
  timestamp: number
}

interface UseBattleUndoOptions {
  undoWindowMs?: number // How long undo is available (default 5000ms)
  onUndo?: () => void
}

/**
 * Hook for battle undo functionality
 * Allows users to reverse accidental battle selections within a time window
 */
export function useBattleUndo(options: UseBattleUndoOptions = {}) {
  const { undoWindowMs = 5000, onUndo } = options

  const [lastBattle, setLastBattle] = useState<BattleRecord | null>(null)
  const [isUndoable, setIsUndoable] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Clear undo timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  /**
   * Record a battle for potential undo
   */
  const recordBattle = useCallback((
    winnerId: string,
    loserId: string,
    winnerOldRating: number,
    loserOldRating: number
  ) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const battle: BattleRecord = {
      winnerId,
      loserId,
      winnerOldRating,
      loserOldRating,
      timestamp: Date.now(),
    }

    setLastBattle(battle)
    setIsUndoable(true)

    logger.debug('Battle recorded for undo:', battle)

    // Set timeout to disable undo
    timeoutRef.current = setTimeout(() => {
      setIsUndoable(false)
      logger.debug('Undo window expired')
    }, undoWindowMs)
  }, [undoWindowMs])

  /**
   * Perform undo operation
   */
  const undo = useCallback(() => {
    if (!lastBattle || !isUndoable) {
      logger.warn('Undo attempted but no undoable battle')
      return null
    }

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const battleToUndo = lastBattle
    setLastBattle(null)
    setIsUndoable(false)

    logger.info('Battle undone:', battleToUndo)

    if (onUndo) {
      onUndo()
    }

    return battleToUndo
  }, [lastBattle, isUndoable, onUndo])

  /**
   * Clear undo state (used when navigating away)
   */
  const clearUndo = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setLastBattle(null)
    setIsUndoable(false)
  }, [])

  /**
   * Get remaining time in undo window (for UI display)
   */
  const getRemainingTime = useCallback(() => {
    if (!lastBattle || !isUndoable) return 0

    const elapsed = Date.now() - lastBattle.timestamp
    const remaining = Math.max(0, undoWindowMs - elapsed)

    return Math.ceil(remaining / 1000) // Return seconds
  }, [lastBattle, isUndoable, undoWindowMs])

  return {
    recordBattle,
    undo,
    clearUndo,
    isUndoable,
    lastBattle,
    getRemainingTime,
  }
}
