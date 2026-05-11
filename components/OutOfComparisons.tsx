'use client'

import { Button } from './ui/Button'

interface OutOfComparisonsProps {
  onReset: () => void
  totalPeople: number
}

export function OutOfComparisons({ onReset, totalPeople }: OutOfComparisonsProps) {
  const totalBattles = (totalPeople * (totalPeople - 1)) / 2

  return (
    <div className="py-12 px-4">
      <div className="max-w-md mx-auto text-center">
        {/* Fun illustration */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-pink via-purple to-yellow rounded-full flex items-center justify-center animate-bounce">
            <span className="text-6xl">🎉</span>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
            <span className="text-4xl animate-pulse">✨</span>
          </div>
          <div className="absolute bottom-0 right-1/4 translate-y-4">
            <span className="text-3xl animate-pulse delay-100">💫</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-serif font-bold mb-5 text-pink">
          All Done!
        </h2>

        <p className="text-lg mb-6 text-foreground/80">
          You've compared everyone! 🏆
        </p>

        <p className="text-sm text-foreground/60 mb-10">
          Completed {totalBattles} battles with {totalPeople} people
        </p>

        {/* Fun stats */}
        <div className="bg-gradient-to-r from-pink/10 via-purple/10 to-blue/10 rounded-3xl p-6 mb-8">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-pink mb-1">
                {totalBattles}
              </div>
              <div className="text-xs text-foreground/60">Battles</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple mb-1">
                {totalPeople}
              </div>
              <div className="text-xs text-foreground/60">People</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue mb-1">
                100%
              </div>
              <div className="text-xs text-foreground/60">Complete</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onReset}
            className="w-full py-4 text-lg font-semibold shadow-lg bg-gradient-to-r from-pink to-purple text-white"
          >
            Start Over 🔄
          </Button>

          <p className="text-xs text-foreground/50">
            Reset to compare everyone again
          </p>
        </div>

        {/* Decorative elements */}
        <div className="mt-12 flex justify-center gap-3">
          {['💖', '⭐', '✨', '🌟', '💫'].map((emoji, i) => (
            <span
              key={i}
              className="text-2xl animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
