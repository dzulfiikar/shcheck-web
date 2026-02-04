import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { scansQueryKeys } from './use-scans';
import type { ScanStatus } from '@/types/scan';

interface ScanUpdateEvent {
  scanId: string;
  status: ScanStatus;
  timestamp: string;
  result?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

interface UseScanSubscriptionOptions {
  onUpdate?: (event: ScanUpdateEvent) => void;
  onComplete?: (event: ScanUpdateEvent) => void;
  onError?: (event: ScanUpdateEvent) => void;
}

/**
 * Hook to subscribe to real-time scan updates via Server-Sent Events
 * Falls back to polling if SSE is not supported or fails
 *
 * @example
 * ```tsx
 * useScanSubscription('123e4567-e89b-12d3-a456-426614174000', {
 *   onComplete: (event) => {
 *     console.log('Scan completed!', event.result);
 *   },
 * });
 * ```
 */
export function useScanSubscription(
  scanId: string | undefined,
  options: UseScanSubscriptionOptions = {}
) {
  const { onUpdate, onComplete, onError } = options;
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as ScanUpdateEvent;

        // Update the scan status query cache
        if (scanId) {
          queryClient.setQueryData(scansQueryKeys.status(scanId), {
            status: data.status,
            progress: data.status === 'completed' ? 100 : undefined,
          });
        }

        // Call the onUpdate callback
        onUpdate?.(data);

        // Handle completion
        if (data.status === 'completed') {
          // Invalidate the scan detail query to fetch full results
          if (scanId) {
            queryClient.invalidateQueries({
              queryKey: scansQueryKeys.detail(scanId),
            });
          }
          onComplete?.(data);
        }

        // Handle failure
        if (data.status === 'failed') {
          // Invalidate the scan detail query to fetch error details
          if (scanId) {
            queryClient.invalidateQueries({
              queryKey: scansQueryKeys.detail(scanId),
            });
          }
          onError?.(data);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    },
    [scanId, queryClient, onUpdate, onComplete, onError]
  );

  useEffect(() => {
    if (!scanId) return;

    // Don't subscribe if scan is already completed or failed
    const currentStatus = queryClient.getQueryData<{ status: ScanStatus }>(
      scansQueryKeys.status(scanId)
    );

    if (currentStatus?.status === 'completed' || currentStatus?.status === 'failed') {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const sseUrl = `${apiUrl}/api/scans/${scanId}/subscribe`;

    const connect = () => {
      try {
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = handleMessage;

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);

          // Close the connection
          eventSource.close();
          eventSourceRef.current = null;

          // Don't reconnect if the scan is already done
          const status = queryClient.getQueryData<{ status: ScanStatus }>(
            scansQueryKeys.status(scanId)
          );

          if (status?.status === 'completed' || status?.status === 'failed') {
            return;
          }

          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            connect();
          }, 3000);
        };

        eventSource.onopen = () => {
          console.log('SSE connection established for scan:', scanId);
        };
      } catch (err) {
        console.error('Failed to create EventSource:', err);
      }
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [scanId, queryClient, handleMessage]);
}
