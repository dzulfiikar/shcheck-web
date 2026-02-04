import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Create mock function and state
const mockMutate = vi.fn();

// Mock the useCreateScan hook with a factory that returns dynamic values
vi.mock('@/hooks/use-create-scan', () => ({
  useCreateScan: () => ({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}));

// Import after mocks are set up
import { ScanForm } from '../scan-form';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ScanForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form fields', () => {
      render(<ScanForm />, { wrapper });

      // Check for main form elements
      expect(screen.getByLabelText(/target url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/port \(optional\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/http method/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start scan/i })).toBeInTheDocument();
    });

    it('renders options checkboxes', () => {
      render(<ScanForm />, { wrapper });

      expect(screen.getByLabelText(/show information disclosure headers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show caching headers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show deprecated headers/i)).toBeInTheDocument();
    });

    it('renders advanced options collapsible', () => {
      render(<ScanForm />, { wrapper });

      expect(screen.getByRole('button', { name: /advanced options/i })).toBeInTheDocument();
    });

    it('renders card header with title and description', () => {
      render(<ScanForm />, { wrapper });

      expect(screen.getByText('New Security Scan')).toBeInTheDocument();
      expect(screen.getByText(/enter a url to scan its security headers/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('shows error when target URL is empty', async () => {
      render(<ScanForm />, { wrapper });

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      // Wait for React state update
      await waitFor(() => {
        expect(screen.getByText('Target URL is required')).toBeInTheDocument();
      });
    });

    it('accepts valid http URL', async () => {
      render(<ScanForm />, { wrapper });

      const targetInput = screen.getByLabelText(/target url/i);
      await userEvent.clear(targetInput);
      await userEvent.type(targetInput, 'http://example.com');

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      // Wait for any state updates
      await waitFor(() => {
        expect(screen.queryByText(/target url is required/i)).not.toBeInTheDocument();
      });
    });

    it('accepts valid https URL', async () => {
      render(<ScanForm />, { wrapper });

      const targetInput = screen.getByLabelText(/target url/i);
      await userEvent.clear(targetInput);
      await userEvent.type(targetInput, 'https://example.com');

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/target url is required/i)).not.toBeInTheDocument();
      });
    });

    it('clears error when user starts typing in target field', async () => {
      render(<ScanForm />, { wrapper });

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      // First verify error appears
      await waitFor(() => {
        expect(screen.getByText('Target URL is required')).toBeInTheDocument();
      });

      // Type to clear error
      const targetInput = screen.getByLabelText(/target url/i);
      await userEvent.type(targetInput, 'h');

      // Verify error is cleared
      await waitFor(() => {
        expect(screen.queryByText('Target URL is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      render(<ScanForm />, { wrapper });

      const targetInput = screen.getByLabelText(/target url/i);
      await userEvent.clear(targetInput);
      await userEvent.type(targetInput, 'https://example.com');

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            target: 'https://example.com',
            method: 'HEAD',
            showInformation: false,
            showCaching: false,
            showDeprecated: false,
          }),
          expect.any(Object)
        );
      });
    });

    it('submits form with options enabled', async () => {
      render(<ScanForm />, { wrapper });

      const targetInput = screen.getByLabelText(/target url/i);
      await userEvent.clear(targetInput);
      await userEvent.type(targetInput, 'https://example.com');

      // Enable options
      const infoCheckbox = screen.getByLabelText(/show information disclosure headers/i);
      const cachingCheckbox = screen.getByLabelText(/show caching headers/i);
      const deprecatedCheckbox = screen.getByLabelText(/show deprecated headers/i);

      await userEvent.click(infoCheckbox);
      await userEvent.click(cachingCheckbox);
      await userEvent.click(deprecatedCheckbox);

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            target: 'https://example.com',
            showInformation: true,
            showCaching: true,
            showDeprecated: true,
          }),
          expect.any(Object)
        );
      });
    });

    it('submits form with port value', async () => {
      render(<ScanForm />, { wrapper });

      const targetInput = screen.getByLabelText(/target url/i);
      await userEvent.clear(targetInput);
      await userEvent.type(targetInput, 'https://example.com');

      const portInput = screen.getByLabelText(/port \(optional\)/i);
      await userEvent.clear(portInput);
      await userEvent.type(portInput, '8080');

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            target: 'https://example.com',
            port: 8080,
          }),
          expect.any(Object)
        );
      });
    });

    it('does not submit when validation fails', async () => {
      render(<ScanForm />, { wrapper });

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Target URL is required')).toBeInTheDocument();
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Advanced Options', () => {
    it('expands advanced options when clicked', async () => {
      render(<ScanForm />, { wrapper });

      const advancedButton = screen.getByRole('button', { name: /advanced options/i });
      await userEvent.click(advancedButton);

      expect(await screen.findByLabelText(/cookies/i)).toBeInTheDocument();
      expect(await screen.findByLabelText(/proxy url/i)).toBeInTheDocument();
    });

    it('submits form with cookies and proxy', async () => {
      render(<ScanForm />, { wrapper });

      const targetInput = screen.getByLabelText(/target url/i);
      await userEvent.clear(targetInput);
      await userEvent.type(targetInput, 'https://example.com');

      // Expand advanced options
      const advancedButton = screen.getByRole('button', { name: /advanced options/i });
      await userEvent.click(advancedButton);

      const cookiesInput = await screen.findByLabelText(/cookies/i);
      const proxyInput = await screen.findByLabelText(/proxy url/i);

      await userEvent.type(cookiesInput, 'sessionId=abc123');
      await userEvent.type(proxyInput, 'http://proxy.example.com:8080');

      const submitButton = screen.getByRole('button', { name: /start scan/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            target: 'https://example.com',
            cookies: 'sessionId=abc123',
            proxy: 'http://proxy.example.com:8080',
          }),
          expect.any(Object)
        );
      });
    });
  });
});
