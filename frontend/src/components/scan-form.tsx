import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronUp, Loader2, Terminal, Link as LinkIcon } from 'lucide-react';
import { useCreateScan } from '@/hooks/use-create-scan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { parseCurlCommand } from '@/lib/curl-parser';
import type { CreateScanRequest, HttpMethod } from '@/types/scan';

type FormErrors = Partial<Record<keyof CreateScanRequest, string>>;

const HTTP_METHODS: HttpMethod[] = ['HEAD', 'GET', 'POST', 'PUT', 'DELETE'];

/**
 * Validates a URL string
 * Must be a valid http or https URL
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates the scan form data
 * Returns an object with error messages for invalid fields
 */
function validateForm(data: CreateScanRequest): FormErrors {
  const errors: FormErrors = {};

  // Target URL is required
  if (!data.target || data.target.trim() === '') {
    errors.target = 'Target URL is required';
  } else if (!isValidUrl(data.target)) {
    errors.target = 'Please enter a valid URL (http:// or https://)';
  }

  // Port must be between 1-65535 if provided
  if (data.port !== undefined && data.port !== null) {
    if (data.port < 1 || data.port > 65535) {
      errors.port = 'Port must be between 1 and 65535';
    }
  }

  return errors;
}

/**
 * ScanForm component
 * Form for creating a new security header scan
 */
export function ScanForm() {
  const navigate = useNavigate();
  const { mutate, isPending, isSuccess, isError, error } = useCreateScan();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'url' | 'curl'>('url');
  const [curlCommand, setCurlCommand] = useState('');
  const [curlError, setCurlError] = useState('');
  const [formData, setFormData] = useState<CreateScanRequest>({
    target: '',
    method: 'HEAD',
    showInformation: false,
    showCaching: false,
    showDeprecated: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [cookies, setCookies] = useState('');
  const [proxy, setProxy] = useState('');
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    // If there are errors, don't submit
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Prepare submission data
    const submitData: CreateScanRequest = {
      ...formData,
    };

    // Add optional fields only if they have values
    if (cookies.trim()) {
      submitData.cookies = cookies.trim();
    }
    if (proxy.trim()) {
      submitData.proxy = proxy.trim();
    }
    if (Object.keys(customHeaders).length > 0) {
      submitData.headers = customHeaders;
    }

    // Submit the form
    mutate(submitData, {
      onSuccess: (response) => {
        // Reset form after successful submission
        setFormData({
          target: '',
          method: 'HEAD',
          showInformation: false,
          showCaching: false,
          showDeprecated: false,
        });
        setCookies('');
        setProxy('');
        setCustomHeaders({});
        setCurlCommand('');
        setInputMode('url');
        setIsAdvancedOpen(false);

        // Navigate to the scan detail page
        navigate({
          to: '/scans/$id',
          params: { id: response.jobId },
        });
      },
    });
  };

  const handleInputChange = (field: keyof CreateScanRequest, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePortChange = (value: string) => {
    if (value === '') {
      handleInputChange('port', undefined);
      return;
    }
    const portNum = parseInt(value, 10);
    if (!isNaN(portNum)) {
      handleInputChange('port', portNum);
    }
  };

  const handleCurlChange = (value: string) => {
    setCurlCommand(value);
    setCurlError('');

    if (!value.trim()) {
      return;
    }

    const parsed = parseCurlCommand(value);

    if (parsed.error) {
      setCurlError(parsed.error);
      return;
    }

    if (parsed.url) {
      setFormData((prev) => ({
        ...prev,
        target: parsed.url,
        ...(parsed.method && { method: parsed.method as HttpMethod }),
      }));

      if (parsed.cookies) {
        setCookies(parsed.cookies);
      }

      if (parsed.proxy) {
        setProxy(parsed.proxy);
      }

      if (parsed.headers) {
        setCustomHeaders(parsed.headers);
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl" data-testid="scan-form">
      <CardHeader>
        <CardTitle>New Security Scan</CardTitle>
        <CardDescription>
          Enter a URL to scan its security headers. We'll analyze the headers and provide a detailed report.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" data-testid="scan-form-form">
          {/* Input Mode Toggle */}
          <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg" data-testid="input-mode-toggle">
            <Button
              type="button"
              variant={inputMode === 'url' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setInputMode('url')}
              className="flex-1"
              data-testid="url-mode-button"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              URL
            </Button>
            <Button
              type="button"
              variant={inputMode === 'curl' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setInputMode('curl')}
              className="flex-1"
              data-testid="curl-mode-button"
            >
              <Terminal className="h-4 w-4 mr-2" />
              cURL
            </Button>
          </div>

          {/* URL Input Mode */}
          {inputMode === 'url' && (
            <div className="space-y-4" data-testid="url-input-section">
              {/* Target URL */}
              <div className="space-y-2" data-testid="target-field">
                <Label htmlFor="target">
                  Target URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="target"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.target}
                  onChange={(e) => handleInputChange('target', e.target.value)}
                  disabled={isPending}
                  aria-invalid={!!errors.target}
                  aria-describedby={errors.target ? 'target-error' : undefined}
                  data-testid="target-input"
                />
                {errors.target && (
                  <p id="target-error" className="text-sm text-destructive" data-testid="target-error">
                    {errors.target}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* cURL Input Mode */}
          {inputMode === 'curl' && (
            <div className="space-y-4" data-testid="curl-input-section">
              {/* cURL Command Input */}
              <div className="space-y-2" data-testid="curl-field">
                <Label htmlFor="curl-command">
                  cURL Command <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="curl-command"
                  placeholder="curl -X GET https://example.com -H 'Authorization: Bearer token'"
                  value={curlCommand}
                  onChange={(e) => handleCurlChange(e.target.value)}
                  disabled={isPending}
                  className="w-full h-24 px-3 py-2 border rounded-md bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
                  data-testid="curl-input"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a curl command to automatically extract URL, method, headers, and cookies.
                </p>
                {curlError && (
                  <p className="text-sm text-destructive" data-testid="curl-error">
                    {curlError}
                  </p>
                )}
                {formData.target && !curlError && curlCommand && (
                  <p className="text-sm text-green-600" data-testid="curl-success">
                    ✓ URL extracted: {formData.target}
                    {formData.method !== 'HEAD' && ` (${formData.method})`}
                    {Object.keys(customHeaders).length > 0 && ` • ${Object.keys(customHeaders).length} header(s)`}
                    {cookies && ' • cookies'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Port and Method row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Port */}
            <div className="space-y-2" data-testid="port-field">
              <Label htmlFor="port">Port (optional)</Label>
              <Input
                id="port"
                type="number"
                placeholder="443"
                min={1}
                max={65535}
                value={formData.port ?? ''}
                onChange={(e) => handlePortChange(e.target.value)}
                disabled={isPending}
                aria-invalid={!!errors.port}
                aria-describedby={errors.port ? 'port-error' : undefined}
                data-testid="port-input"
              />
              {errors.port && (
                <p id="port-error" className="text-sm text-destructive" data-testid="port-error">
                  {errors.port}
                </p>
              )}
            </div>

            {/* HTTP Method */}
            <div className="space-y-2" data-testid="method-field">
              <Label htmlFor="method">HTTP Method</Label>
              <Select
                value={formData.method}
                onValueChange={(value) => handleInputChange('method', value as HttpMethod)}
                disabled={isPending}
              >
                <SelectTrigger id="method" data-testid="method-select">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options checkboxes */}
          <div className="space-y-3" data-testid="options-section">
            <Label>Options</Label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center space-x-2" data-testid="showInformation-option">
                <Checkbox
                  id="showInformation"
                  checked={formData.showInformation}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    handleInputChange('showInformation', checked === true)
                  }
                  disabled={isPending}
                  data-testid="showInformation-checkbox"
                />
                <Label
                  htmlFor="showInformation"
                  className="text-sm font-normal cursor-pointer"
                >
                  Show information disclosure headers
                </Label>
              </div>

              <div className="flex items-center space-x-2" data-testid="showCaching-option">
                <Checkbox
                  id="showCaching"
                  checked={formData.showCaching}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    handleInputChange('showCaching', checked === true)
                  }
                  disabled={isPending}
                  data-testid="showCaching-checkbox"
                />
                <Label
                  htmlFor="showCaching"
                  className="text-sm font-normal cursor-pointer"
                >
                  Show caching headers
                </Label>
              </div>

              <div className="flex items-center space-x-2" data-testid="showDeprecated-option">
                <Checkbox
                  id="showDeprecated"
                  checked={formData.showDeprecated}
                  onCheckedChange={(checked: boolean | 'indeterminate') =>
                    handleInputChange('showDeprecated', checked === true)
                  }
                  disabled={isPending}
                  data-testid="showDeprecated-checkbox"
                />
                <Label
                  htmlFor="showDeprecated"
                  className="text-sm font-normal cursor-pointer"
                >
                  Show deprecated headers
                </Label>
              </div>
            </div>
          </div>

          {/* Advanced Options Collapsible */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen} data-testid="advanced-options">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex items-center gap-2 p-0 h-auto font-normal"
                disabled={isPending}
                data-testid="advanced-options-trigger"
              >
                Advanced Options
                {isAdvancedOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4" data-testid="advanced-options-content">
              {/* Cookies */}
              <div className="space-y-2" data-testid="cookies-field">
                <Label htmlFor="cookies">Cookies</Label>
                <Input
                  id="cookies"
                  type="text"
                  placeholder="sessionId=abc123; auth=xyz789"
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  disabled={isPending}
                  data-testid="cookies-input"
                />
                <p className="text-xs text-muted-foreground">
                  Cookies to send with the request (format: name=value; name2=value2)
                </p>
              </div>

              {/* Proxy */}
              <div className="space-y-2" data-testid="proxy-field">
                <Label htmlFor="proxy">Proxy URL</Label>
                <Input
                  id="proxy"
                  type="url"
                  placeholder="http://proxy.example.com:8080"
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  disabled={isPending}
                  data-testid="proxy-input"
                />
                <p className="text-xs text-muted-foreground">
                  Proxy URL to route the request through
                </p>
              </div>

              {/* Custom Headers from curl */}
              {Object.keys(customHeaders).length > 0 && (
                <div className="space-y-2" data-testid="custom-headers-field">
                  <Label>Custom Headers (from curl)</Label>
                  <div className="space-y-2">
                    {Object.entries(customHeaders).map(([name, value]) => (
                      <div key={name} className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-1 rounded">{name}</code>
                        <span className="text-muted-foreground truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomHeaders({})}
                    disabled={isPending}
                  >
                    Clear Headers
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Error message */}
          {isError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" data-testid="form-error">
              {error?.message || 'An error occurred while creating the scan'}
            </div>
          )}

          {/* Success message */}
          {isSuccess && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600" data-testid="form-success">
              Scan created successfully! Redirecting...
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
            data-testid="submit-scan"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Scan...
              </>
            ) : (
              'Start Scan'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
