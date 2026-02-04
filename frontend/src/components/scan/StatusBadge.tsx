import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { ScanStatus } from '@/types/scan'

const variants: Record<ScanStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'default',
  completed: 'default',
  failed: 'destructive',
}

const labels: Record<ScanStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

interface StatusBadgeProps {
  status: ScanStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant={variants[status]}
      data-testid={`status-badge-${status}`}
      className={
        status === 'processing'
          ? 'animate-pulse bg-yellow-500 hover:bg-yellow-600'
          : status === 'completed'
          ? 'bg-green-500 hover:bg-green-600'
          : status === 'pending'
          ? 'bg-blue-500 hover:bg-blue-600'
          : undefined
      }
    >
      {status === 'processing' && (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      )}
      {labels[status]}
    </Badge>
  )
}
