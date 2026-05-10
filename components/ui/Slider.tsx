import React from 'react'

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
  min = 1,
  max = 10,
  step = 1,
  showValue = true,
}: SliderProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {showValue && (
          <span className="text-sm font-semibold text-pink">{value}</span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #ff6b9d 0%, #ff6b9d ${
            ((value - min) / (max - min)) * 100
          }%, #262626 ${((value - min) / (max - min)) * 100}%, #262626 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ff6b9d;
          cursor: pointer;
          border: 2px solid #0a0a0a;
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ff6b9d;
          cursor: pointer;
          border: 2px solid #0a0a0a;
        }
      `}</style>
    </div>
  )
}
