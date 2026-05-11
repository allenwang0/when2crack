import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
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
    'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-bright focus-visible:ring-offset-2'

  const variantStyles = {
    primary: 'bg-black text-yellow-bright hover:bg-gray-800 hover:shadow-yellow-bright/20',
    secondary: 'bg-white border-2 border-black text-black hover:bg-gray-50 hover:border-pink',
    ghost: 'bg-transparent text-foreground hover:bg-yellow-soft shadow-none hover:shadow-md',
    danger: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-red-500/30',
    outline: 'bg-white border-2 text-black hover:bg-yellow-soft hover:border-yellow-bright',
  }

  const sizeStyles = {
    sm: 'px-4 py-2.5 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
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
