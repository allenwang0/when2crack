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

interface HelpFAQProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpFAQ({ isOpen, onClose }: HelpFAQProps) {
  const [expandedItem, setExpandedItem] = useState<number | null>(null)

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center pointer-events-none p-4" style={{ zIndex: 9999 }}>
      <div className="pointer-events-auto w-full max-w-md mb-20 sm:mb-0">
        <div
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border-[3px] border-yellow-bright"
          style={{ maxHeight: 'calc(100vh - 180px)' }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 flex items-center justify-between flex-shrink-0 bg-foreground dark:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <h3 className="font-bold text-lg text-yellow-bright">
                Guide
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="#FFD93D" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* FAQ Items */}
          <div className="overflow-y-auto p-4 space-y-3 flex-1">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={index}
                className={`rounded-2xl overflow-hidden transition-all border-2 ${
                  expandedItem === index
                    ? 'bg-yellow-soft dark:bg-yellow-900/20 border-border dark:border-gray-700'
                    : 'bg-white dark:bg-gray-800 border-border dark:border-gray-700'
                }`}
              >
                <button
                  onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <span className="font-semibold text-sm text-foreground dark:text-gray-100">
                      {item.question}
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform flex-shrink-0 text-foreground dark:text-gray-100 ${
                      expandedItem === index ? 'rotate-180' : 'rotate-0'
                    }`}
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
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-center flex-shrink-0">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Close this and reopen anytime with the info button
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
