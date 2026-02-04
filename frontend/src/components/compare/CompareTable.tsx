import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Minus, Shield, AlertTriangle } from 'lucide-react'
import type { ScanResponse } from '@/types/scan'

interface CompareTableProps {
  scanA: ScanResponse
  scanB: ScanResponse
}

interface HeaderComparison {
  name: string
  status: 'both' | 'only-a' | 'only-b' | 'missing-both'
  valueA?: string
  valueB?: string
}

interface ComparisonSummary {
  totalHeaders: number
  presentInBoth: number
  onlyInA: number
  onlyInB: number
  missingInBoth: number
  improvements: number
  regressions: number
}

/**
 * CompareTable Component
 *
 * Displays a side-by-side comparison of two scan results.
 * Shows headers present in both scans, only in A, only in B,
 * and highlights improvements and regressions.
 *
 * @example
 * ```tsx
 * <CompareTable scanA={scanA} scanB={scanB} />
 * ```
 */
export function CompareTable({ scanA, scanB }: CompareTableProps) {
  const resultA = scanA.result
  const resultB = scanB.result

  if (!resultA || !resultB) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Both scans must have results to compare
          </p>
        </CardContent>
      </Card>
    )
  }

  // Get all unique header names from both scans
  // Handle cases where present/missing might be null/undefined
  const presentA = resultA.present || {}
  const presentB = resultB.present || {}
  const missingA = resultA.missing || []
  const missingB = resultB.missing || []

  const allHeaders = new Set([
    ...Object.keys(presentA),
    ...Object.keys(presentB),
    ...missingA,
    ...missingB,
  ])

  // Build comparison data
  const comparisons: HeaderComparison[] = Array.from(allHeaders)
    .sort()
    .map((header) => {
      const inA = header in presentA
      const inB = header in presentB

      if (inA && inB) {
        return {
          name: header,
          status: 'both',
          valueA: presentA[header],
          valueB: presentB[header],
        }
      } else if (inA && !inB) {
        return {
          name: header,
          status: 'only-a',
          valueA: presentA[header],
        }
      } else if (!inA && inB) {
        return {
          name: header,
          status: 'only-b',
          valueB: presentB[header],
        }
      } else {
        return {
          name: header,
          status: 'missing-both',
        }
      }
    })

  // Calculate summary
  const summary: ComparisonSummary = {
    totalHeaders: allHeaders.size,
    presentInBoth: comparisons.filter((c) => c.status === 'both').length,
    onlyInA: comparisons.filter((c) => c.status === 'only-a').length,
    onlyInB: comparisons.filter((c) => c.status === 'only-b').length,
    missingInBoth: comparisons.filter((c) => c.status === 'missing-both').length,
    improvements: comparisons.filter((c) => c.status === 'only-b').length,
    regressions: comparisons.filter((c) => c.status === 'only-a').length,
  }

  const bothPresent = comparisons.filter((c) => c.status === 'both')
  const onlyInA = comparisons.filter((c) => c.status === 'only-a')
  const onlyInB = comparisons.filter((c) => c.status === 'only-b')
  const missingInBoth = comparisons.filter((c) => c.status === 'missing-both')

  return (
    <div className="space-y-6" data-testid="compare-table">
      {/* Summary Card */}
      <Card data-testid="comparison-summary">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Comparison Summary
          </CardTitle>
          <CardDescription>
            Comparing scans of {scanA.target} and {scanB.target}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg" data-testid="summary-both">
              <p className="text-2xl font-bold text-green-600">{summary.presentInBoth}</p>
              <p className="text-sm text-muted-foreground mt-1">Present in Both</p>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg" data-testid="summary-only-a">
              <p className="text-2xl font-bold text-amber-600">{summary.onlyInA}</p>
              <p className="text-sm text-muted-foreground mt-1">Only in Scan A</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg" data-testid="summary-only-b">
              <p className="text-2xl font-bold text-blue-600">{summary.onlyInB}</p>
              <p className="text-sm text-muted-foreground mt-1">Only in Scan B</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg" data-testid="summary-missing">
              <p className="text-2xl font-bold">{summary.missingInBoth}</p>
              <p className="text-sm text-muted-foreground mt-1">Missing in Both</p>
            </div>
          </div>

          {/* Improvements/Regressions */}
          {(summary.improvements > 0 || summary.regressions > 0) && (
            <div className="mt-4 flex flex-wrap gap-4">
              {summary.improvements > 0 && (
                <div className="flex items-center gap-2 text-green-600" data-testid="improvements-count">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {summary.improvements} improvement{summary.improvements !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {summary.regressions > 0 && (
                <div className="flex items-center gap-2 text-red-600" data-testid="regressions-count">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {summary.regressions} regression{summary.regressions !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Headers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="scan-a-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Scan A</CardTitle>
            <CardDescription className="text-xs truncate">{scanA.target}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium text-green-600">{Object.keys(presentA).length}</span>
                <span className="text-muted-foreground">present</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-red-600">{missingA.length}</span>
                <span className="text-muted-foreground">missing</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="scan-b-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Scan B</CardTitle>
            <CardDescription className="text-xs truncate">{scanB.target}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium text-green-600">{Object.keys(presentB).length}</span>
                <span className="text-muted-foreground">present</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-red-600">{missingB.length}</span>
                <span className="text-muted-foreground">missing</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Present in Both */}
      {bothPresent.length > 0 && (
        <Card data-testid="both-present-section">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Present in Both ({bothPresent.length})
            </CardTitle>
            <CardDescription>
              Security headers found in both scans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bothPresent.map((header) => (
                <div
                  key={header.name}
                  className="border rounded-lg p-3"
                  data-testid={`header-both-${header.name}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="bg-green-500">
                      {header.name}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted rounded p-2">
                      <span className="text-xs text-muted-foreground block mb-1">Scan A</span>
                      <code className="text-xs break-all">{header.valueA}</code>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <span className="text-xs text-muted-foreground block mb-1">Scan B</span>
                      <code className="text-xs break-all">{header.valueB}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Only in A / Only in B */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Only in A */}
        {onlyInA.length > 0 && (
          <Card data-testid="only-a-section">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-amber-500" />
                Only in Scan A ({onlyInA.length})
              </CardTitle>
              <CardDescription className="text-amber-600">
                Regressions - present in A but missing in B
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {onlyInA.map((header) => (
                  <div
                    key={header.name}
                    className="flex items-start justify-between py-2 border-b last:border-0"
                    data-testid={`header-only-a-${header.name}`}
                  >
                    <Badge variant="outline" className="shrink-0 border-amber-500 text-amber-700">
                      {header.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground break-all ml-4 text-right max-w-[200px]">
                      {header.valueA}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Only in B */}
        {onlyInB.length > 0 && (
          <Card data-testid="only-b-section">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Only in Scan B ({onlyInB.length})
              </CardTitle>
              <CardDescription className="text-blue-600">
                Improvements - added since Scan A
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {onlyInB.map((header) => (
                  <div
                    key={header.name}
                    className="flex items-start justify-between py-2 border-b last:border-0"
                    data-testid={`header-only-b-${header.name}`}
                  >
                    <Badge variant="outline" className="shrink-0 border-blue-500 text-blue-700">
                      {header.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground break-all ml-4 text-right max-w-[200px]">
                      {header.valueB}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Missing in Both */}
      {missingInBoth.length > 0 && (
        <Card data-testid="missing-both-section">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Minus className="h-5 w-5 text-muted-foreground" />
              Missing in Both ({missingInBoth.length})
            </CardTitle>
            <CardDescription>
              Security headers not found in either scan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missingInBoth.map((header) => (
                <Badge
                  key={header.name}
                  variant="secondary"
                  data-testid={`header-missing-${header.name}`}
                >
                  {header.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
