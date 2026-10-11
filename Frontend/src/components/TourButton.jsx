import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTour, useAutoStartTour } from '../tour/useTour'
import { useShowTourButtons } from '../tour/tourState'

export default function TourButton({ tour }) {
  const { start } = useTour(tour)
  useAutoStartTour(tour)
  const show = useShowTourButtons()

  // Still mounted when hidden so the Guide's "Show me" (?tour=1) can start the tour.
  if (!show) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={start}
      className="gap-1.5 whitespace-nowrap"
    >
      <HelpCircle className="size-4" />
      Take a tour
    </Button>
  )
}
