import { useState } from 'react'
import { useScans } from '@/hooks/use-scans'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/formatters'
import type { ScanResponse } from '@/types/scan'

interface ScanSelectorProps {
  label: string
  value: string | undefined
  onChange: (scanId: string, scan: ScanResponse | undefined) => void
  excludeScanId?: string
  disabled?: boolean
}

/**
 * ScanSelector Component
 *
 * A dropdown component for selecting a scan from the scan history.
 * Displays the target URL and creation date for each scan.
 *
 * @example
 * ```tsx
 * <ScanSelector
 *   label="Scan A"
 *   value={selectedScanA}
 *   onChange={(id, scan) => setSelectedScanA(id)}
 *   excludeScanId={selectedScanB}
 * />
 * ```
 */
export function ScanSelector({
  label,
  value,
  onChange,
  excludeScanId,
  disabled = false,
}: ScanSelectorProps) {
  const [page] = useState(1)
  const [limit] = useState(50)
  const { data, isLoading, error, refetch } = useScans({ page, limit, status: 'completed' })

  // Filter out the excluded scan and only show completed scans with results
  // Include the currently selected scan even if it's the excluded one (for this selector)
  const availableScans = data?.data.filter(
    (scan) => (scan.id !== excludeScanId || scan.id === value) && scan.result != null
  ) ?? []

  // Find selected scan from full data list, not just available scans
  const selectedScan = data?.data.find((scan) => scan.id === value)

  const handleChange = (scanId: string) => {
    const scan = availableScans.find((s) => s.id === scanId)
    onChange(scanId, scan)
  }

  return (
    <div className="space-y-2" data-testid={`scan-selector-${label.toLowerCase().replace(' ', '-')}`}>
      <label className="text-sm font-medium">{label}</label>

      {isLoading ? (
        <Skeleton className="h-10 w-full" data-testid="scan-selector-loading" />
      ) : error ? (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load scans</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-6 px-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : availableScans.length === 0 ? (
        <Alert className="py-2">
          <AlertDescription>No completed scans available</AlertDescription>
        </Alert>
      ) : (
        <Select
          value={value}
          onValueChange={handleChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full" data-testid="scan-select-trigger">
            <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {availableScans.map((scan) => (
              <SelectItem
                key={scan.id}
                value={scan.id}
                data-testid={`scan-option-${scan.id}`}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium truncate max-w-[250px]">
                    {scan.target}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(scan.createdAt)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selectedScan && (
        <div className="text-xs text-muted-foreground mt-1" data-testid="selected-scan-info">
          <span className="font-medium">Target:</span> {selectedScan.target}
          {' · '}
          <span className="font-medium">Scanned:</span> {formatDate(selectedScan.createdAt)}
        </div>
      )}
    </div>
  )
}
