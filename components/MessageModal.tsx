'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { RosterPerson } from '@/lib/types'
import Image from 'next/image'
import { getInitials } from '@/lib/utils/colors'
import { useRouter } from 'next/navigation'

interface MessageModalProps {
  person: RosterPerson
  isOpen: boolean
  onClose: () => void
  onSend: (message: string) => Promise<void>
  onScheduleInstead?: () => void
}

const MESSAGE_TEMPLATES = [
  "Hey! Free tonight?",
  "Want to grab dinner?",
  "Drinks this week?",
  "Coffee soon?",
  "Let's catch up!",
]

export function MessageModal({ person, isOpen, onClose, onSend, onScheduleInstead }: MessageModalProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const initials = getInitials(person.name)

  if (!isOpen) return null

  const handleSend = async () => {
    if (!message.trim()) return

    setSending(true)
    try {
      // Copy to clipboard first
      await navigator.clipboard.writeText(message)

      // Log the outreach
      await onSend(message)

      // Show success state
      setShowSuccess(true)

      // Wait 1.5 seconds to show success, then close
      setTimeout(() => {
        setShowSuccess(false)
        setMessage('')
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error sending message:', error)
      setSending(false)
    }
  }

  const handleSchedule = () => {
    onClose()
    if (onScheduleInstead) {
      onScheduleInstead()
    } else {
      router.push(`/schedule?person=${person.id}`)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success State */}
        {showSuccess && (
          <div className="absolute inset-0 bg-green-500 dark:bg-green-600 rounded-t-3xl sm:rounded-3xl flex flex-col items-center justify-center z-10 animate-scale-in">
            <div className="text-6xl mb-4 animate-bounce-slow">✓</div>
            <h3 className="text-2xl font-bold text-white mb-2">Message Copied!</h3>
            <p className="text-white/90 text-center px-6">
              Now paste it into your messaging app
            </p>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {person.avatar_url && person.avatar_url.trim() !== '' && person.avatar_url !== 'null' && person.avatar_url !== 'undefined' ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink relative bg-white dark:bg-gray-800">
                <Image
                  src={person.avatar_url}
                  alt={`${person.name}'s profile`}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: person.avatar_color }}
              >
                {initials}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Message {person.name.split(' ')[0]}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose a message to copy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick messages:
            </label>
            <div className="space-y-2">
              {MESSAGE_TEMPLATES.map((template) => (
                <button
                  key={template}
                  onClick={() => setMessage(template)}
                  className={`w-full text-left px-4 py-3 border rounded-xl transition-all ${
                    message === template
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-500 ring-2 ring-yellow-400'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-yellow-50 dark:hover:bg-gray-600 hover:border-yellow-400'
                  }`}
                >
                  <span className="text-sm text-gray-900 dark:text-gray-100">{template}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label htmlFor="custom-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or write your own:
            </label>
            <textarea
              id="custom-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-bright focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Preview Box */}
          {message && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                READY TO COPY:
              </p>
              <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                "{message}"
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sending || showSuccess}
              className="w-full text-lg py-4"
              size="lg"
            >
              {sending ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Copying...
                </>
              ) : (
                '📋 Copy Message'
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Message will be copied to your clipboard
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">or</span>
              </div>
            </div>

            <Button
              onClick={handleSchedule}
              variant="tertiary"
              className="w-full"
              size="lg"
            >
              📅 Schedule a Time Instead
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
