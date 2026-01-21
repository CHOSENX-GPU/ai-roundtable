import { useState, useCallback } from 'react'
import { AI_TYPES } from '../lib/constants'
import type { AiType, AiStatuses } from '../lib/types'

const initialStatuses: AiStatuses = AI_TYPES.reduce(
  (acc, ai) => ({ ...acc, [ai]: false }),
  {} as AiStatuses
)

export function useAiStatus() {
  const [statuses, setStatuses] = useState<AiStatuses>(initialStatuses)

  const updateStatus = useCallback((aiType: AiType, connected: boolean) => {
    setStatuses(prev => ({ ...prev, [aiType]: connected }))
  }, [])

  const refreshStatuses = useCallback(() => {
    setStatuses(initialStatuses)
  }, [])

  const replaceStatuses = useCallback((next: AiStatuses) => {
    setStatuses(next)
  }, [])

  return {
    statuses,
    updateStatus,
    refreshStatuses,
    replaceStatuses,
  }
}
