import type { ServiceStatus } from '@/lib/types'

// Thresholds for the "due soon" window
const DUE_SOON_DAYS = 14
const DUE_SOON_KM = 500

/**
 * Compute a vehicle's service status from its next-service date and/or km target.
 * - Overdue: next date is in the past OR current km has reached/passed the next-service km.
 * - Due soon: next date within DUE_SOON_DAYS OR within DUE_SOON_KM of the next-service km.
 * - Up to date: otherwise (including when no targets are set).
 */
export function computeServiceStatus(
  nextServiceDate: string | null | undefined,
  nextServiceKm: number | null | undefined,
  currentKm: number | null | undefined,
): ServiceStatus {
  let overdue = false
  let dueSoon = false

  if (nextServiceDate) {
    const next = new Date(nextServiceDate)
    if (!Number.isNaN(next.getTime())) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      next.setHours(0, 0, 0, 0)
      const diffDays = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) overdue = true
      else if (diffDays <= DUE_SOON_DAYS) dueSoon = true
    }
  }

  if (typeof nextServiceKm === 'number' && typeof currentKm === 'number') {
    const kmRemaining = nextServiceKm - currentKm
    if (kmRemaining <= 0) overdue = true
    else if (kmRemaining <= DUE_SOON_KM) dueSoon = true
  }

  if (overdue) return 'overdue'
  if (dueSoon) return 'due_soon'
  return 'up_to_date'
}

export const SERVICE_STATUS_META: Record<
  ServiceStatus,
  { label: string; badgeClass: string; dot: string }
> = {
  up_to_date: {
    label: 'Up to Date',
    badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  due_soon: {
    label: 'Due Soon',
    badgeClass: 'border-amber-300 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  overdue: {
    label: 'Overdue',
    badgeClass: 'border-red-300 bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
}
