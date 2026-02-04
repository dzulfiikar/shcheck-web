import { describe, it, expect } from 'vitest';
import { formatDuration, formatDate } from '../formatters';

describe('formatDuration', () => {
  describe('null/undefined handling', () => {
    it('returns dash for null', () => {
      expect(formatDuration(null)).toBe('-');
    });

    it('returns dash for undefined', () => {
      expect(formatDuration(undefined)).toBe('-');
    });

    it('returns dash for zero', () => {
      expect(formatDuration(0)).toBe('-');
    });
  });

  describe('milliseconds formatting', () => {
    it('formats milliseconds less than 1000', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('formats 1 millisecond', () => {
      expect(formatDuration(1)).toBe('1ms');
    });

    it('formats 999 milliseconds', () => {
      expect(formatDuration(999)).toBe('999ms');
    });
  });

  describe('seconds formatting', () => {
    it('formats exactly 1000ms as seconds', () => {
      expect(formatDuration(1000)).toBe('1.0s');
    });

    it('formats milliseconds over 1000 as seconds', () => {
      expect(formatDuration(1500)).toBe('1.5s');
    });

    it('formats large durations as seconds', () => {
      expect(formatDuration(5000)).toBe('5.0s');
    });

    it('formats 12345ms correctly', () => {
      expect(formatDuration(12345)).toBe('12.3s');
    });

    it('rounds to one decimal place', () => {
      expect(formatDuration(1234)).toBe('1.2s');
    });
  });

  describe('edge cases', () => {
    it('handles negative numbers (though not expected)', () => {
      expect(formatDuration(-100)).toBe('-100ms');
    });

    it('handles very large durations', () => {
      expect(formatDuration(60000)).toBe('60.0s');
    });
  });
});

describe('formatDate', () => {
  describe('null/undefined handling', () => {
    it('returns dash for null', () => {
      expect(formatDate(null)).toBe('-');
    });

    it('returns dash for undefined', () => {
      expect(formatDate(undefined)).toBe('-');
    });

    it('returns dash for empty string', () => {
      expect(formatDate('')).toBe('-');
    });
  });

  describe('date formatting', () => {
    it('formats ISO date string', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatDate(dateString);

      // Should be a valid locale string
      expect(result).not.toBe('-');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats date-only string', () => {
      const dateString = '2024-06-20';
      const result = formatDate(dateString);

      expect(result).not.toBe('-');
      expect(typeof result).toBe('string');
    });

    it('formats date with timezone', () => {
      const dateString = '2024-03-10T14:30:00-05:00';
      const result = formatDate(dateString);

      expect(result).not.toBe('-');
      expect(typeof result).toBe('string');
    });
  });

  describe('locale-specific formatting', () => {
    it('returns locale-specific string', () => {
      const dateString = '2024-01-01T00:00:00Z';
      const result = formatDate(dateString);

      // The result should contain numbers (for date/time)
      expect(/\d/.test(result)).toBe(true);
    });
  });
});
