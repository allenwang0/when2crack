'use client'

import { useEffect, useState } from 'react'

interface SuccessAnimationProps {
  count: number
  personName: string
}

export function SuccessAnimation({ count, personName }: SuccessAnimationProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(true)
    const timer = setTimeout(() => setShow(false), 3000)
    return () => clearTimeout(timer)
  }, [count])

  if (!show) return null

  // Milestone messages
  const getMilestoneMessage = (count: number) => {
    if (count === 1) return "🎉 First one today!"
    if (count === 3) return "🔥 You're on fire!"
    if (count === 5) return "⭐ Amazing streak!"
    if (count === 10) return "🚀 Unstoppable!"
    if (count % 5 === 0) return `💪 ${count} messages sent!`
    return null
  }

  const milestone = getMilestoneMessage(count)

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-white/20">
        <div className="text-center">
          <p className="text-lg font-bold mb-1">
            Message ready for {personName}! 💬
          </p>
          {milestone && (
            <p className="text-sm font-medium opacity-90">
              {milestone}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
