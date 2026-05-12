'use client'

import { createContext, useContext, useRef, ReactNode, RefObject } from 'react'

interface ScrollContextType {
  scrollContainerRef: RefObject<HTMLElement | null>
  scrollToTop: (smooth?: boolean) => void
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined)

export function ScrollProvider({ children }: { children: ReactNode }) {
  const scrollContainerRef = useRef<HTMLElement>(null)

  const scrollToTop = (smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto'
      })
    }
  }

  return (
    <ScrollContext.Provider value={{ scrollContainerRef, scrollToTop }}>
      {children}
    </ScrollContext.Provider>
  )
}

export function useScroll() {
  const context = useContext(ScrollContext)
  if (!context) {
    throw new Error('useScroll must be used within ScrollProvider')
  }
  return context
}
