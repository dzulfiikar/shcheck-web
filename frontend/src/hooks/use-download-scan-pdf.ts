import { useMutation } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook to download a single scan report as PDF
 *
 * @example
 * ```tsx
 * const { mutate: downloadPDF, isPending } = useDownloadScanPDF();
 * downloadPDF('scan-id-123');
 * ```
 */
export function useDownloadScanPDF() {
  return useMutation({
    mutationFn: async (scanId: string) => {
      // Use native fetch for binary PDF download
      const response = await fetch(`${API_BASE_URL}/api/scans/${scanId}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to download PDF: ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `scan-report-${scanId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      window.URL.revokeObjectURL(url);
    },
  });
}
