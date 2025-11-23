'use client'

import { useEffect, useState } from 'react'

export type LayoutMode = 'morning-brief' | 'zen-dashboard' | 'prototype'

const STORAGE_KEY = 'ember-feed-layout-mode'
const DEFAULT_LAYOUT: LayoutMode = 'prototype'

/**
 * Custom hook for managing layout mode preference with localStorage persistence
 *
 * @returns {[LayoutMode, (mode: LayoutMode) => void]} Current layout mode and setter function
 *
 * @example
 * const [layoutMode, setLayoutMode] = useLayoutMode()
 *
 * // Switch to zen dashboard
 * setLayoutMode('zen-dashboard')
 */
export function useLayoutMode(): [LayoutMode, (mode: LayoutMode) => void] {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>(DEFAULT_LAYOUT)
  const [isClient, setIsClient] = useState(false)

  // Load preference from localStorage on mount
  useEffect(() => {
    setIsClient(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'morning-brief' || stored === 'zen-dashboard' || stored === 'prototype') {
      setLayoutModeState(stored)
    }
  }, [])

  // Update localStorage when preference changes
  const setLayoutMode = (mode: LayoutMode) => {
    setLayoutModeState(mode)
    if (isClient) {
      localStorage.setItem(STORAGE_KEY, mode)
    }
  }

  return [layoutMode, setLayoutMode]
}
