import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useScan } from '@/hooks/use-scan'
import { useScanStatus } from '@/hooks/use-scan-status'
import { useScanSubscription } from '@/hooks/use-scan-subscription'
import { useDownloadScanPDF } from '@/hooks/use-download-scan-pdf'
import { useCreateScan } from '@/hooks/use-create-scan'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, ArrowLeft, CheckCircle, XCircle, Clock, Globe, Timer, Loader2, Wifi, Download, Plus, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/scan/StatusBadge'
import { CSPEvaluation } from '@/components/csp/CSPEvaluation'
import { formatDuration, formatDate } from '@/lib/formatters'
import type { ScanStatus, ScanResult } from '@/types/scan'

export const Route = createFileRoute('/scans/$id')({
  component: ScanDetail,
})


function ScanProgress({ status, live }: { status: ScanStatus; live?: boolean }) {
  return (
    <Card className="mb-6" data-testid="scan-progress">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold" data-testid="scan-progress-title">Scan in Progress</h3>
              {live && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground" data-testid="scan-progress-message">
              {status === 'pending'
                ? 'Waiting in queue to start...'
                : 'Scanning security headers...'}
            </p>
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="scan-progress-spinner" />
        </div>
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden" data-testid="scan-progress-bar">
          <div
            className="h-full bg-primary transition-all duration-500 animate-pulse"
            style={{ width: status === 'pending' ? '30%' : '70%' }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ScanMetadata({ scan }: { scan: { target: string; createdAt: string; startedAt?: string | null; completedAt?: string | null; duration?: number | null } }) {
  return (
    <Card className="mb-6" data-testid="scan-metadata">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="scan-metadata-title">
          <Globe className="h-5 w-5" />
          Scan Metadata
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div data-testid="scan-target-url">
            <p className="text-sm text-muted-foreground">Target URL</p>
            <p className="font-medium break-all">{scan.target}</p>
          </div>
          <div data-testid="scan-duration">
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium flex items-center gap-1">
              <Timer className="h-4 w-4" />
              {formatDuration(scan.duration)}
            </p>
          </div>
          <div data-testid="scan-created">
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDate(scan.createdAt)}
            </p>
          </div>
          <div data-testid="scan-completed">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="font-medium">{formatDate(scan.completedAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryCard({ result }: { result: ScanResult }) {
  const safeCount = result.summary?.safe || Object.keys(result.present).length
  const unsafeCount = result.summary?.unsafe || result.missing.length
  const total = safeCount + unsafeCount

  return (
    <Card className="mb-6" data-testid="scan-summary">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="scan-summary-title">Summary</CardTitle>
        <CardDescription data-testid="scan-summary-description">
          Security header scan results for {result.url}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg" data-testid="summary-present">
            <p className="text-3xl font-bold text-green-600" data-testid="summary-present-count">{safeCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Present</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg" data-testid="summary-missing">
            <p className="text-3xl font-bold text-red-600" data-testid="summary-missing-count">{unsafeCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Missing</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg" data-testid="summary-total">
            <p className="text-3xl font-bold" data-testid="summary-total-count">{total}</p>
            <p className="text-sm text-muted-foreground mt-1">Total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PresentHeadersCard({ present }: { present: Record<string, string> }) {
  const entries = Object.entries(present)

  return (
    <Card className="mb-6" data-testid="present-headers-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="present-headers-title">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Present Headers ({entries.length})
        </CardTitle>
        <CardDescription data-testid="present-headers-description">
          Security headers that are properly configured
        </CardDescription>
      </CardHeader>
      <CardContent data-testid="present-headers-content">
        {entries.length === 0 ? (
          <p className="text-muted-foreground" data-testid="present-headers-empty">No security headers found</p>
        ) : (
          <div className="space-y-2" data-testid="present-headers-list">
            {entries.map(([header, value]) => (
              <div
                key={header}
                className="flex items-start justify-between py-2 border-b last:border-0"
                data-testid={`present-header-${header}`}
              >
                <Badge variant="default" className="bg-green-500 hover:bg-green-600 shrink-0">
                  {header}
                </Badge>
                <span className="text-sm text-muted-foreground break-all ml-4 text-right">
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MissingHeadersCard({ missing }: { missing: string[] }) {
  return (
    <Card className="mb-6" data-testid="missing-headers-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="missing-headers-title">
          <XCircle className="h-5 w-5 text-red-500" />
          Missing Headers ({missing.length})
        </CardTitle>
        <CardDescription data-testid="missing-headers-description">
          Security headers that should be implemented
        </CardDescription>
      </CardHeader>
      <CardContent data-testid="missing-headers-content">
        {missing.length === 0 ? (
          <p className="text-muted-foreground" data-testid="missing-headers-empty">All recommended headers are present!</p>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="missing-headers-list">
            {missing.map((header) => (
              <Badge key={header} variant="destructive" data-testid={`missing-header-${header}`}>
                {header}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InformationDisclosureCard({ info }: { info: Record<string, string> }) {
  const entries = Object.entries(info)

  if (entries.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Information Disclosure</CardTitle>
        <CardDescription>
          Headers that may reveal sensitive information about the server
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map(([header, value]) => (
            <div
              key={header}
              className="flex items-start justify-between py-2 border-b last:border-0"
            >
              <Badge variant="outline" className="shrink-0">
                {header}
              </Badge>
              <span className="text-sm text-muted-foreground break-all ml-4 text-right">
                {value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CachingHeadersCard({ caching }: { caching: Record<string, string> }) {
  const entries = Object.entries(caching)

  if (entries.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Caching Headers</CardTitle>
        <CardDescription>
          Cache control and expiration headers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map(([header, value]) => (
            <div
              key={header}
              className="flex items-start justify-between py-2 border-b last:border-0"
            >
              <Badge variant="secondary" className="shrink-0">
                {header}
              </Badge>
              <span className="text-sm text-muted-foreground break-all ml-4 text-right">
                {value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ScanDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLive, setIsLive] = useState(false)
  const [showCompletionToast, setShowCompletionToast] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<'completed' | 'failed' | null>(null)
  // Track if we were actively monitoring (scan was pending/processing when page loaded)
  const [wasActivelyMonitoring, setWasActivelyMonitoring] = useState(false)

  const { data: scan, isLoading: scanLoading, error: scanError } = useScan(id)
  // Poll scan status while pending/processing - this triggers refetching
  const { data: statusData } = useScanStatus(id)

  const downloadPDF = useDownloadScanPDF()
  const createScan = useCreateScan()

  // Handle rescan - create new scan with same target
  const handleRescan = () => {
    if (!scan?.target) return

    createScan.mutate(
      { target: scan.target },
      {
        onSuccess: (response) => {
          navigate({ to: '/scans/$id', params: { id: response.jobId } })
        },
      }
    )
  }

  // Determine if scan is currently active (pending/processing)
  const isScanActive = scan?.status === 'pending' || scan?.status === 'processing'

  // Set actively monitoring flag when scan becomes active
  useEffect(() => {
    if (isScanActive && !wasActivelyMonitoring) {
      setWasActivelyMonitoring(true)
    }
  }, [isScanActive, wasActivelyMonitoring])

  // Subscribe to live updates via SSE
  useScanSubscription(id, {
    onUpdate: () => {
      setIsLive(true)
    },
    onComplete: () => {
      setIsLive(false)
      // Only show toast if we were actively monitoring this scan
      if (wasActivelyMonitoring) {
        setCompletionStatus('completed')
        setShowCompletionToast(true)
        // Auto-hide toast after 5 seconds
        setTimeout(() => setShowCompletionToast(false), 5000)
      }
    },
    onError: () => {
      setIsLive(false)
      // Only show toast if we were actively monitoring this scan
      if (wasActivelyMonitoring) {
        setCompletionStatus('failed')
        setShowCompletionToast(true)
        // Auto-hide toast after 5 seconds
        setTimeout(() => setShowCompletionToast(false), 5000)
      }
    },
  })

  // Invalidate scan query when status transitions to completed/failed
  useEffect(() => {
    if (statusData?.status === 'completed' || statusData?.status === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['scan', id] })
    }
  }, [statusData?.status, id, queryClient])

  const isLoading = scanLoading
  const error = scanError

  return (
    <div className="p-4 max-w-7xl mx-auto" data-testid="scan-detail-page">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2" data-testid="back-to-scans">
          <Link to="/scans">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to scans
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" data-testid="scan-detail-title">Scan Details</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              asChild
              data-testid="new-scan-button"
            >
              <Link to="/">
                <Plus className="h-4 w-4 mr-2" />
                New Scan
              </Link>
            </Button>
            {scan?.target && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRescan}
                disabled={createScan.isPending}
                data-testid="rescan-button"
              >
                {createScan.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Rescan
              </Button>
            )}
            {scan?.status === 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadPDF.mutate(id)}
                disabled={downloadPDF.isPending}
                data-testid="download-pdf-button"
              >
                {downloadPDF.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
            )}
            {scan && <StatusBadge status={scan.status} />}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6" data-testid="scan-detail-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load scan'}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4" data-testid="scan-detail-loading">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Completion Toast */}
      {showCompletionToast && (
        <Alert
          className={`mb-6 w-full ${completionStatus === 'completed' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}
          data-testid="scan-completion-toast"
        >
          <div className="flex items-start gap-3 w-full">
            {completionStatus === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <AlertTitle className="text-base font-semibold">
                {completionStatus === 'completed' ? 'Scan Completed!' : 'Scan Failed'}
              </AlertTitle>
              <AlertDescription className="mt-1">
                {completionStatus === 'completed'
                  ? 'Your security header scan has completed successfully.'
                  : 'Your security header scan encountered an error.'}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Scan Content */}
      {!isLoading && !error && scan && (
        <>
          {/* Metadata */}
          <ScanMetadata scan={scan} />

          {/* In Progress State */}
          {(scan.status === 'pending' || scan.status === 'processing') && (
            <ScanProgress status={scan.status} live={isLive} />
          )}

          {/* Failed State */}
          {scan.status === 'failed' && (
            <Alert variant="destructive" className="mb-6" data-testid="scan-failed-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Scan Failed</AlertTitle>
              <AlertDescription>
                {scan.error || 'An error occurred while scanning'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {scan.status === 'completed' && scan.result && (
            <>
              <SummaryCard result={scan.result} />

              <Separator className="my-6" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PresentHeadersCard present={scan.result.present} />
                <MissingHeadersCard missing={scan.result.missing} />
              </div>

              {scan.result.informationDisclosure && (
                <InformationDisclosureCard
                  info={scan.result.informationDisclosure}
                />
              )}

              {scan.result.caching && (
                <CachingHeadersCard caching={scan.result.caching} />
              )}

              {/* CSP Evaluation */}
              {scan.result.cspEvaluation && (
                <CSPEvaluation evaluation={scan.result.cspEvaluation} />
              )}

              {/* Show CSP missing card if no CSP header */}
              {(() => {
                const presentKeys = Object.keys(scan.result.present);
                const hasCSP = presentKeys.some(
                  k => k.toLowerCase() === 'content-security-policy'
                );
                const hasCSPReportOnly = presentKeys.some(
                  k => k.toLowerCase() === 'content-security-policy-report-only'
                );
                const hasNoCSP = scan.status === 'completed' &&
                                 scan.result &&
                                 !hasCSP &&
                                 !hasCSPReportOnly;
                return hasNoCSP ? (
                  <CSPEvaluation
                    evaluation={{
                      headers: {},
                      overallScore: 0,
                      overallEffectiveness: 'none',
                      recommendations: [
                        'Implement a Content-Security-Policy header to prevent XSS attacks',
                        'Start with report-only mode: Content-Security-Policy-Report-Only',
                      ],
                      bypassTechniques: [],
                      frameworkCompatibility: [],
                    }}
                  />
                ) : null;
              })()}
            </>
          )}
        </>
      )}
    </div>
  )
}
