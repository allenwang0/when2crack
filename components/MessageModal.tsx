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
  const initials = getInitials(person.name)

  if (!isOpen) return null

  const handleSend = async () => {
    if (!message.trim()) return

    setSending(true)
    try {
      await onSend(message)

      // Copy message to clipboard (since phone_number not in DB yet)
      await navigator.clipboard.writeText(message)

      onClose()
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleCopy = async () => {
    if (!message.trim()) return

    try {
      await navigator.clipboard.writeText(message)

      // Visual feedback - could add a toast here
      const button = document.activeElement as HTMLButtonElement
      if (button) {
        const originalText = button.textContent
        button.textContent = '✓ Copied!'
        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error)
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
                  className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-yellow-50 dark:hover:bg-gray-600 hover:border-yellow-400 dark:hover:border-yellow-400 transition-colors"
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

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="w-full"
              size="lg"
            >
              {sending ? 'Copying...' : '💬 Copy & Send Message'}
            </Button>

            <Button
              onClick={handleCopy}
              disabled={!message.trim()}
              variant="secondary"
              className="w-full"
              size="lg"
            >
              📋 Copy to Clipboard
            </Button>

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
