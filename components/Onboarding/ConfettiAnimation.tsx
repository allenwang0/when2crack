'use client'

export function ConfettiAnimation() {
  const emojis = ['🎉', '🥚', '⚔️', '📅', '💖', '🎉', '🥚', '⚔️', '📅']

  return (
    <div className="confetti-container" style={{ zIndex: 10001 }}>
      {emojis.map((emoji, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            left: `${(i + 1) * 10}%`,
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
      `}</style>
    </div>
  )
}
