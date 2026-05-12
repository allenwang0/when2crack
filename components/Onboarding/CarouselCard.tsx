'use client'

interface CarouselCardProps {
  icon: string | React.ReactNode
  title: string
  description: string
  illustration?: React.ReactNode
}

export function CarouselCard({ icon, title, description, illustration }: CarouselCardProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-12">
      {/* Icon or Illustration */}
      <div className="mb-8">
        {typeof icon === 'string' ? (
          <div className="text-8xl mb-4">{icon}</div>
        ) : (
          <div className="w-48 h-48 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
        {title}
      </h2>

      {/* Description */}
      <p className="text-xl sm:text-2xl text-white/90 max-w-md leading-relaxed">
        {description}
      </p>

      {/* Optional Illustration */}
      {illustration && (
        <div className="mt-8">
          {illustration}
        </div>
      )}
    </div>
  )
}
