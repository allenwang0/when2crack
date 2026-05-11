import Link from 'next/link'

export function Footer() {
  return (
    <footer className="text-center text-xs text-gray-500 dark:text-gray-400 py-4 space-y-2">
      <div className="flex justify-center gap-4">
        <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-200 underline">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-200 underline">
          Terms of Service
        </Link>
      </div>
      <p>© {new Date().getFullYear()} When2Crack. All rights reserved.</p>
    </footer>
  )
}
