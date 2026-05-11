import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-bright focus-visible:ring-offset-2'

  const variantStyles = {
    primary: 'bg-gradient-to-r from-pink to-purple text-white shadow-md hover:shadow-lg hover:opacity-90',
    secondary: 'bg-white dark:bg-gray-800 border-2 border-gray-800 dark:border-gray-600 text-gray-800 dark:text-gray-100 shadow-sm hover:bg-yellow-soft dark:hover:bg-gray-700 hover:border-pink hover:shadow-md',
    tertiary: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-yellow-soft dark:hover:bg-gray-800 shadow-none hover:shadow-sm',
    danger: 'bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-lg',
  }

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[52px]',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
