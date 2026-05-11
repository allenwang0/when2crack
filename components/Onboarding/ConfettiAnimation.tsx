'use client'

export function ConfettiAnimation() {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Don't show animation if user prefers reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 10001 }}
      >
        <div className="text-6xl">🎉</div>
      </div>
    )
  }

  const emojis = [
    '🎉', '🥚', '⚔️', '📅', '💖', '✨', '🌟', '⭐', '🎊', '🎈',
    '💫', '🔥', '💯', '👏', '🙌', '🎯', '🏆', '👑', '💪', '🚀'
  ]

  return (
    <div className="confetti-container" style={{ zIndex: 10001 }}>
      {emojis.map((emoji, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${(i + 1) * 5}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        >
          {emoji}
        </div>
      ))}

      <style jsx>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .confetti {
          position: fixed;
          font-size: 2rem;
          animation: confettiFall 2s ease-in forwards;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .confetti {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
