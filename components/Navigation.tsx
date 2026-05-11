'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Roster',
      path: '/roster',
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
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: 'Tonight',
      path: '/tonight',
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
      name: 'Battle',
      path: '/battle',
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
      name: 'Add',
      path: '/add',
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
    },
  ]

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-t border-border z-50" style={{ boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
      <div className="max-w-md mx-auto flex justify-around items-center h-20 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center gap-1 transition-all min-w-[60px] rounded-2xl py-2 ${
                isActive
                  ? 'text-white scale-105'
                  : 'text-gray-400 hover:text-pink hover:scale-105'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, #FFB6D9 0%, #E4C1F9 100%)',
                boxShadow: '0 4px 12px rgba(255, 182, 217, 0.3)'
              } : {}}
            >
              {item.icon}
              <span className="text-xs font-semibold">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
