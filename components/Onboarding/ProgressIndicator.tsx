'use client'

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="flex flex-col items-center mb-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Step {currentStep} of {totalSteps}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep
          const isUpcoming = step > currentStep

          return (
            <div
              key={step}
              className={`rounded-full transition-all ${
                isCurrent
                  ? 'w-3 h-3 bg-yellow-bright'
                  : isCompleted
                  ? 'w-2 h-2 bg-yellow-bright'
                  : 'w-2 h-2 bg-gray-300 dark:bg-gray-700'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
