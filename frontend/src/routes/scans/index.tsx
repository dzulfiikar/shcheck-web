import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useScans } from '@/hooks/use-scans'
import { useDeleteScan } from '@/hooks/use-delete-scan'
import { useBulkDeleteScans } from '@/hooks/use-bulk-delete-scans'
import { useBulkDownloadPDF } from '@/hooks/use-bulk-download-pdf'
import { useCreateBulkScans } from '@/hooks/use-create-bulk-scans'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  MoreHorizontal,
  X,
  Download,
  Loader2,
  Plus,
  ScanLine,
} from 'lucide-react'
import { StatusBadge } from '@/components/scan/StatusBadge'
import { formatDuration, formatDate } from '@/lib/formatters'
import type { ScanStatus } from '@/types/scan'

export const Route = createFileRoute('/scans/')({
  component: ScansIndex,
})

const statusOptions: { value: ScanStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

const limitOptions = [10, 20, 50]

function ScansIndex() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [statusFilter, setStatusFilter] = useState<ScanStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedScans, setSelectedScans] = useState<Set<string>>(new Set())
  const [scanToDelete, setScanToDelete] = useState<string | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showBulkScanDialog, setShowBulkScanDialog] = useState(false)
  const [bulkScanTargets, setBulkScanTargets] = useState('')

  // Debounce search query
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data, isLoading, error } = useScans({
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  })

  const deleteScan = useDeleteScan()
  const bulkDeleteScans = useBulkDeleteScans()
  const bulkDownloadPDF = useBulkDownloadPDF()
  const createBulkScans = useCreateBulkScans()

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  // Clear selection when data changes
  useMemo(() => {
    setSelectedScans(new Set())
  }, [data?.data])

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.data) {
      setSelectedScans(new Set(data.data.map((scan) => scan.id)))
    } else {
      setSelectedScans(new Set())
    }
  }

  const handleSelectScan = (scanId: string, checked: boolean) => {
    const newSelected = new Set(selectedScans)
    if (checked) {
      newSelected.add(scanId)
    } else {
      newSelected.delete(scanId)
    }
    setSelectedScans(newSelected)
  }

  const handleDelete = (scanId: string) => {
    deleteScan.mutate(scanId, {
      onSuccess: () => {
        setScanToDelete(null)
      },
    })
  }

  const handleBulkDelete = () => {
    if (selectedScans.size === 0) return

    bulkDeleteScans.mutate(
      { ids: Array.from(selectedScans) },
      {
        onSuccess: () => {
          setShowBulkDeleteDialog(false)
          setSelectedScans(new Set())
        },
      }
    )
  }

  const handleBulkDownload = () => {
    if (selectedScans.size === 0) return

    bulkDownloadPDF.mutate(Array.from(selectedScans), {
      onSuccess: () => {
        // Optionally clear selection after download
        // setSelectedScans(new Set())
      },
    })
  }

  const handleBulkScan = () => {
    if (!bulkScanTargets.trim()) return

    createBulkScans.mutate(
      { targets: bulkScanTargets },
      {
        onSuccess: (response) => {
          setShowBulkScanDialog(false)
          setBulkScanTargets('')
          // Show success feedback if some scans were created
          if (response.created > 0) {
            // Could add toast notification here
            console.log(`Created ${response.created} of ${response.total} scans`)
          }
        },
      }
    )
  }

  const allSelected = data?.data ? selectedScans.size === data.data.length && data.data.length > 0 : false
  const someSelected = selectedScans.size > 0 && !allSelected

  return (
    <div className="p-4 max-w-7xl mx-auto" data-testid="scan-list-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="scan-list-title">Scan History</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBulkScanDialog(true)}
            data-testid="bulk-scan-button"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Bulk Scan
          </Button>
          <Button asChild data-testid="new-scan-button">
            <Link to="/">
              <Plus className="h-4 w-4 mr-2" />
              New Scan
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-6" data-testid="scan-list-description">
        View all your security header scans. Click on a scan to see detailed results.
      </p>

      {/* Filters */}
      <Card className="mb-6" data-testid="scan-filters">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search Input */}
              <div className="flex items-center gap-2" data-testid="search-filter">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[280px]"
                    data-testid="search-input"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2" data-testid="status-filter">
                <span className="text-sm font-medium">Status:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as ScanStatus | 'all')
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[140px]" data-testid="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2" data-testid="limit-filter">
                <span className="text-sm font-medium">Items per page:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(Number(value))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[80px]" data-testid="limit-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {limitOptions.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedScans.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDownload}
                  disabled={bulkDownloadPDF.isPending}
                  data-testid="bulk-download-button"
                >
                  {bulkDownloadPDF.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF ({selectedScans.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                  data-testid="bulk-delete-button"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedScans.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6" data-testid="scan-list-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load scans'}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4" data-testid="scan-list-loading">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data?.data.length === 0 && (
        <Card data-testid="scan-list-empty">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">No scans found</p>
            <Button asChild variant="outline" data-testid="run-first-scan-button">
              <Link to="/">Run your first scan</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scan Table */}
      {!isLoading && !error && data && data.data.length > 0 && (
        <>
          <Card data-testid="scan-table-card">
            <Table data-testid="scan-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allSelected}
                      data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all scans"
                    />
                  </TableHead>
                  <TableHead>Target URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((scan) => (
                  <TableRow key={scan.id} data-testid={`scan-row-${scan.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedScans.has(scan.id)}
                        onCheckedChange={(checked) => handleSelectScan(scan.id, checked as boolean)}
                        aria-label={`Select scan ${scan.target}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate" data-testid="scan-target">
                      {scan.target}
                    </TableCell>
                    <TableCell data-testid="scan-status">
                      <StatusBadge status={scan.status} />
                    </TableCell>
                    <TableCell data-testid="scan-created">{formatDate(scan.createdAt)}</TableCell>
                    <TableCell data-testid="scan-duration">{formatDuration(scan.duration)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`actions-${scan.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/scans/$id" params={{ id: scan.id }}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setScanToDelete(scan.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6" data-testid="pagination">
              <p className="text-sm text-muted-foreground" data-testid="pagination-info">
                Showing {(page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, data.total)} of {data.total} scans
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="previous-page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm" data-testid="page-number">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  data-testid="next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={!!scanToDelete} onOpenChange={() => setScanToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this scan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => scanToDelete && handleDelete(scanToDelete)}
              disabled={deleteScan.isPending}
            >
              {deleteScan.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Multiple Scans</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedScans.size} selected scans? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteScans.isPending}
            >
              {bulkDeleteScans.isPending ? 'Deleting...' : `Delete ${selectedScans.size} Scans`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Scan Dialog */}
      <Dialog open={showBulkScanDialog} onOpenChange={setShowBulkScanDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Scan</DialogTitle>
            <DialogDescription>
              Enter multiple URLs to scan, one per line. Each URL will create a separate scan job.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              placeholder="https://example.com&#10;https://another-site.com&#10;https://third-site.com"
              value={bulkScanTargets}
              onChange={(e) => setBulkScanTargets(e.target.value)}
              className="w-full h-40 px-3 py-2 border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              data-testid="bulk-scan-textarea"
            />
            {bulkScanTargets && (
              <p className="text-xs text-muted-foreground mt-2">
                {bulkScanTargets.split('\n').filter(t => t.trim().length > 0).length} URL(s) to scan
              </p>
            )}
            {createBulkScans.error && (
              <p className="text-sm text-destructive mt-2">
                {createBulkScans.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkScanDialog(false)
              setBulkScanTargets('')
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkScan}
              disabled={!bulkScanTargets.trim() || createBulkScans.isPending}
              data-testid="start-bulk-scan-button"
            >
              {createBulkScans.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ScanLine className="h-4 w-4 mr-2" />
                  Start Bulk Scan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
