import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTour, useAutoStartTour } from '../tour/useTour'

export default function TourButton({ tour }) {
  const { start } = useTour(tour)
  useAutoStartTour(tour)

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
