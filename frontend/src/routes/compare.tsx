import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useScan } from '@/hooks/use-scan'
import { ScanSelector, CompareTable } from '@/components/compare'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, AlertCircle, BarChart2, RotateCcw } from 'lucide-react'
import type { ScanResponse } from '@/types/scan'

export const Route = createFileRoute('/compare')({
  component: CompareScans,
})

/**
 * CompareScans Page
 *
 * Allows users to select two completed scans and compare their
 * security headers side by side. Shows improvements, regressions,
 * and headers present in both or missing from both.
 */
function CompareScans() {
  const [selectedScanAId, setSelectedScanAId] = useState<string>('')
  const [selectedScanBId, setSelectedScanBId] = useState<string>('')
  const [, setSelectedScanA] = useState<ScanResponse | undefined>()
  const [, setSelectedScanB] = useState<ScanResponse | undefined>()

  const { data: scanAData, isLoading: scanALoading, error: scanAError } = useScan(
    selectedScanAId || undefined
  )
  const { data: scanBData, isLoading: scanBLoading, error: scanBError } = useScan(
    selectedScanBId || undefined
  )

  const handleScanAChange = (scanId: string, scan: ScanResponse | undefined) => {
    setSelectedScanAId(scanId)
    setSelectedScanA(scan)
  }

  const handleScanBChange = (scanId: string, scan: ScanResponse | undefined) => {
    setSelectedScanBId(scanId)
    setSelectedScanB(scan)
  }

  const handleReset = () => {
    setSelectedScanAId('')
    setSelectedScanBId('')
    setSelectedScanA(undefined)
    setSelectedScanB(undefined)
  }

  const isLoading = scanALoading || scanBLoading
  const hasError = scanAError || scanBError
  const canCompare = selectedScanAId && selectedScanBId && !isLoading && !hasError

  return (
    <div className="p-4 max-w-7xl mx-auto" data-testid="compare-page">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2" data-testid="back-to-scans">
          <Link to="/scans">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to scans
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="compare-title">Compare Scans</h1>
            <p className="text-muted-foreground mt-1">
              Select two scans to compare their security headers side by side
            </p>
          </div>
          {(selectedScanAId || selectedScanBId) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              data-testid="reset-comparison"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Scan Selectors */}
      <Card className="mb-6" data-testid="scan-selectors">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScanSelector
              label="Scan A (Baseline)"
              value={selectedScanAId}
              onChange={handleScanAChange}
              excludeScanId={selectedScanBId}
            />
            <ScanSelector
              label="Scan B (Compare)"
              value={selectedScanBId}
              onChange={handleScanBChange}
              excludeScanId={selectedScanAId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4" data-testid="compare-loading">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <Alert variant="destructive" data-testid="compare-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Scans</AlertTitle>
          <AlertDescription>
            {scanAError && `Scan A: ${scanAError.message}`}
            {scanAError && scanBError && <br />}
            {scanBError && `Scan B: ${scanBError.message}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Comparison Results */}
      {!isLoading && !hasError && canCompare && scanAData && scanBData && (
        <>
          {!scanAData.result && (
            <Alert variant="destructive" className="mb-4" data-testid="scan-a-no-result">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Scan A Missing Results</AlertTitle>
              <AlertDescription>
                Scan A does not have any result data to compare.
              </AlertDescription>
            </Alert>
          )}
          {!scanBData.result && (
            <Alert variant="destructive" className="mb-4" data-testid="scan-b-no-result">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Scan B Missing Results</AlertTitle>
              <AlertDescription>
                Scan B does not have any result data to compare.
              </AlertDescription>
            </Alert>
          )}
          {scanAData.result && scanBData.result && (
            <CompareTable scanA={scanAData} scanB={scanBData} />
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !hasError && !canCompare && (
        <Card data-testid="compare-empty-state">
          <CardContent className="pt-12 pb-12 text-center">
            <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select Two Scans to Compare</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Choose two completed scans from the dropdowns above to see a side-by-side
              comparison of their security headers. You can identify improvements,
              regressions, and track your security posture over time.
            </p>
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Present in both</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Improvements</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Regressions</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
