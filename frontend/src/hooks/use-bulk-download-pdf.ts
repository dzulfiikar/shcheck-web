import { useMutation } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook to download multiple scan reports as a combined PDF
 *
 * @example
 * ```tsx
 * const { mutate: downloadBulkPDF, isPending } = useBulkDownloadPDF();
 * downloadBulkPDF(['scan-id-1', 'scan-id-2']);
 * ```
 */
export function useBulkDownloadPDF() {
  return useMutation({
    mutationFn: async (scanIds: string[]) => {
      // Use native fetch for binary PDF download
      const response = await fetch(`${API_BASE_URL}/api/scans/bulk-pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: scanIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to download PDF: ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create download link with date stamp
      const date = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.href = url;
      link.download = `scans-report-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      window.URL.revokeObjectURL(url);
    },
  });
}
