import { treaty } from '@elysiajs/eden';
import type { App } from '../../../backend/src/index';

/**
 * Eden Treaty API client for type-safe API calls
 * Connects to the backend ElysiaJS API
 *
 * Usage:
 * - api.api.scans.get() -> GET /api/scans
 * - api.api.scans.post({ body }) -> POST /api/scans
 * - api.api.scans({ id }).get() -> GET /api/scans/:id
 * - api.api.scans({ id }).status.get() -> GET /api/scans/:id/status
 * - api.api.scans({ id }).delete() -> DELETE /api/scans/:id
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = treaty<App>(API_BASE_URL, {
  fetch: {
    credentials: 'include',
  },
});

/**
 * Helper type to extract response data from Eden Treaty responses
 */
export type InferEdenResponse<T> = T extends { data: infer D } ? D : never;

/**
 * Helper to extract error message from Eden Treaty error
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    if ('value' in error && error.value && typeof error.value === 'object') {
      if ('message' in error.value && typeof error.value.message === 'string') {
        return error.value.message;
      }
    }
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  return 'An unexpected error occurred';
}
