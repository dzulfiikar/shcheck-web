import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../scan/StatusBadge';
import type { ScanStatus } from '@/types/scan';

describe('StatusBadge', () => {
  describe('Rendering', () => {
    it('renders pending status', () => {
      render(<StatusBadge status="pending" />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders processing status', () => {
      render(<StatusBadge status="processing" />);

      expect(screen.getByText('Processing')).toBeInTheDocument();
    });

    it('renders completed status', () => {
      render(<StatusBadge status="completed" />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('renders failed status', () => {
      render(<StatusBadge status="failed" />);

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('applies blue styling for pending status', () => {
      const { container } = render(<StatusBadge status="pending" />);
      const badge = container.firstChild as HTMLElement;

      expect(badge).toHaveClass('bg-blue-500');
    });

    it('applies yellow styling with animation for processing status', () => {
      const { container } = render(<StatusBadge status="processing" />);
      const badge = container.firstChild as HTMLElement;

      expect(badge).toHaveClass('animate-pulse');
      expect(badge).toHaveClass('bg-yellow-500');
    });

    it('applies green styling for completed status', () => {
      const { container } = render(<StatusBadge status="completed" />);
      const badge = container.firstChild as HTMLElement;

      expect(badge).toHaveClass('bg-green-500');
    });

    it('applies destructive styling for failed status', () => {
      const { container } = render(<StatusBadge status="failed" />);
      const badge = container.firstChild as HTMLElement;

      expect(badge).toHaveClass('bg-destructive');
    });
  });

  describe('Loading Indicator', () => {
    it('shows spinner for processing status', () => {
      const { container } = render(<StatusBadge status="processing" />);

      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('does not show spinner for pending status', () => {
      const { container } = render(<StatusBadge status="pending" />);

      const spinner = container.querySelector('svg');
      expect(spinner).not.toBeInTheDocument();
    });

    it('does not show spinner for completed status', () => {
      const { container } = render(<StatusBadge status="completed" />);

      const spinner = container.querySelector('svg');
      expect(spinner).not.toBeInTheDocument();
    });

    it('does not show spinner for failed status', () => {
      const { container } = render(<StatusBadge status="failed" />);

      const spinner = container.querySelector('svg');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('All Status Variants', () => {
    const statuses: ScanStatus[] = ['pending', 'processing', 'completed', 'failed'];

    statuses.forEach((status) => {
      it(`renders ${status} status correctly`, () => {
        const { container } = render(<StatusBadge status={status} />);

        expect(container.firstChild).toBeInTheDocument();
        expect(container.firstChild?.textContent).toBe(
          status.charAt(0).toUpperCase() + status.slice(1)
        );
      });
    });
  });

  describe('Hover States', () => {
    it('has hover class for pending status', () => {
      const { container } = render(<StatusBadge status="pending" />);
      const badge = container.firstChild as HTMLElement;

      expect(badge).toHaveClass('hover:bg-blue-600');
    });

    it('has hover class for processing status', () => {
      const { container } = render(<StatusBadge status="processing" />);
      const badge = container.firstChild as HTMLElement;

      expect(badge).toHaveClass('hover:bg-yellow-600');
    });

    it('has hover class for completed status', () => {
      const { container } = render(<StatusBadge status="completed" />);
      const badge = container.firstChild as HTMLElement;

      expect(badge).toHaveClass('hover:bg-green-600');
    });
  });
});
