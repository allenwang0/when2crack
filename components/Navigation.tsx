'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Z_INDEX } from '@/lib/constants'

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Roster',
      path: '/roster',
      ariaLabel: 'View your roster of people',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Tonight',
      path: '/tonight',
      ariaLabel: 'View tonight\'s recommendations and battle',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      name: 'Schedule',
      path: '/schedule',
      ariaLabel: 'Manage your weekly schedule',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      name: 'Profile',
      path: '/profile',
      ariaLabel: 'View your profile and settings',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]" style={{ zIndex: Z_INDEX.navigation }}>
      <div className="max-w-md mx-auto flex justify-around items-center h-20 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-2 transition-all duration-200 min-w-[56px] rounded-2xl py-3 px-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-bright focus-visible:ring-inset active:scale-95 ${
                isActive
                  ? 'text-white bg-gradient-to-r from-pink to-purple shadow-[0_4px_12px_rgba(255,182,217,0.3)]'
                  : 'text-gray-400 hover:text-gray-800 hover:bg-yellow-50'
              }`}
            >
              {item.icon}
              <span className="text-xs font-semibold whitespace-nowrap">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
