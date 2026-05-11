'use client'

import { useState, useEffect } from 'react'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

interface FAQItem {
  question: string
  answer: string
  emoji: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    emoji: '🥚',
    question: 'What is When2Crack?',
    answer: 'When2Crack helps you rank your romantic prospects and decide who to reach out to. Add people, compare them in battles, and see who ranks highest!'
  },
  {
    emoji: '⚔️',
    question: 'How do battles work?',
    answer: 'Pick who you\'d rather hang with right now. The app uses ELO ratings (like chess) to rank everyone based on your choices.'
  },
  {
    emoji: '📊',
    question: 'What are the scores?',
    answer: 'Rate each person on Looks (face), Personality (heart), and Values (star). These combine into a composite score.'
  },
  {
    emoji: '📅',
    question: 'What\'s the schedule feature?',
    answer: 'Mark when you\'re free this week (6pm-2am). See who else is available for spontaneous hangouts!'
  },
  {
    emoji: '🏆',
    question: 'How do I unlock achievements?',
    answer: 'Add more people, complete battles, set your schedule, and use the app daily to unlock all achievements!'
  },
  {
    emoji: '👤',
    question: 'Guest mode vs Sign in?',
    answer: 'Guest mode saves locally (won\'t sync). Sign in with Google to sync across devices and save your progress.'
  }
]

export function HelpFAQ() {
  const [hasSeen, setHasSeen] = useLocalStorage('faq_seen', false)
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState<number | null>(null)

  // Auto-show on first visit
  useEffect(() => {
    if (!hasSeen) {
      setIsOpen(true)
      setHasSeen(true)
    }
  }, [hasSeen, setHasSeen])

  if (!isOpen) {
    // Info button to reopen
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-3 sm:right-4 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #FFD93D 0%, #F4C430 100%)',
          border: '2px solid #1A1A1A'
        }}
        title="Help & FAQ"
      >
        <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="#1A1A1A" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-4">
      <div className="pointer-events-auto w-full max-w-md mb-20 sm:mb-0">
        <div
          className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          style={{ border: '3px solid #FFD93D', maxHeight: 'calc(100vh - 180px)' }}
        >
          {/* Header */}
          <div
            className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0"
            style={{ background: '#1A1A1A' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💡</span>
              <h3 className="font-bold text-base sm:text-lg" style={{ color: '#FFD93D' }}>
                Help & FAQ
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="#FFD93D" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* FAQ Items */}
          <div className="overflow-y-auto p-3 sm:p-4 space-y-2 flex-1">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={index}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  border: '2px solid #F5F5F0',
                  backgroundColor: expandedItem === index ? '#FFF4CC' : '#FFFFFF'
                }}
              >
                <button
                  onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                      {item.question}
                    </span>
                  </div>
                  <svg
                    className="w-5 h-5 transition-transform flex-shrink-0"
                    style={{
                      transform: expandedItem === index ? 'rotate(180deg)' : 'rotate(0deg)',
                      color: '#1A1A1A'
                    }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedItem === index && (
                  <div className="px-4 pb-4 pt-1">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-gray-200 text-center flex-shrink-0">
            <p className="text-xs text-gray-500">
              Close this and reopen anytime with the info button
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
