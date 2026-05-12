import React, { useRef, useEffect, useCallback, useState } from 'react'

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  showValue?: boolean
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  showValue = true,
}: SliderProps) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [localValue, setLocalValue] = useState(value)

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Debounced onChange handler
  const handleChange = useCallback(
    (newValue: number) => {
      setLocalValue(newValue) // Update local value immediately for responsive UI

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Debounce the actual onChange call
      timeoutRef.current = setTimeout(() => {
        onChange(newValue)
      }, 150) // 150ms debounce
    },
    [onChange]
  )
  const getIcon = () => {
    if (label === 'Looks') {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (label === 'Personality') {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      )
    }
    if (label === 'Values') {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <div className="mb-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-purple-400" aria-hidden="true">{getIcon()}</span>
          <label htmlFor={`slider-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-medium text-foreground">{label}</label>
        </div>
        {showValue && (
          <div className="text-center text-3xl font-bold text-pink" aria-live="polite" aria-atomic="true">{localValue}/10</div>
        )}
      </div>
      <input
        id={`slider-${label.toLowerCase().replace(/\s+/g, '-')}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={(e) => handleChange(parseInt(e.target.value))}
        className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
        aria-label={`${label} score`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localValue}
        aria-valuetext={`${localValue} out of ${max}`}
        style={{
          background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${
            ((localValue - min) / (max - min)) * 100
          }%, var(--purple) ${((localValue - min) / (max - min)) * 100}%, var(--purple) 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-300 mt-3">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--pink);
          cursor: pointer;
          border: 3px solid var(--card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--pink);
          cursor: pointer;
          border: 3px solid var(--card);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  )
}
