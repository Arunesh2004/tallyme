import * as React from "react"

export function ConfigSlider({ 
  value, 
  onChange, 
  min = 0, 
  max = 1,
  step = 0.01,
  disabled = false 
}: { 
  value: number; 
  onChange: (value: number) => void; 
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center space-x-4">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="flex-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="text-sm font-medium w-12 text-right">{value}</span>
    </div>
  )
}
