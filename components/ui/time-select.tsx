'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TimeSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// Build 15-minute interval options for a full 24-hour day (00:00 ... 23:45)
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const options: { value: string; label: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      const period = h < 12 ? 'AM' : 'PM'
      const hour12 = h % 12 === 0 ? 12 : h % 12
      const label = `${hour12}:${m.toString().padStart(2, '0')} ${period}`
      options.push({ value, label })
    }
  }
  return options
})()

/**
 * Time picker restricted to 15-minute intervals only.
 * Normalizes incoming values (e.g. "08:07:00") to the nearest stored option
 * so previously saved times still display.
 */
export function TimeSelect({ id, value, onChange, placeholder = 'Select time', className }: TimeSelectProps) {
  // Normalize a stored value like "08:30:00" to "08:30"
  const normalized = value ? value.slice(0, 5) : ''

  return (
    <Select value={normalized} onValueChange={onChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {/* Include the normalized value as a fallback option if it isn't a 15-min interval */}
        {normalized && !TIME_OPTIONS.some((o) => o.value === normalized) && (
          <SelectItem value={normalized}>{normalized}</SelectItem>
        )}
        {TIME_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
