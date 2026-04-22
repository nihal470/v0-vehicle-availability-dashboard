import { UpcomingReturns } from '@/components/fleet/upcoming-returns'

export const metadata = {
  title: 'Upcoming Returns & Schedules | Fleet Management',
  description: 'View all upcoming vehicle returns, overdue rentals, and return schedules',
}

export default function ReturnsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <UpcomingReturns fullPage />
    </div>
  )
}
