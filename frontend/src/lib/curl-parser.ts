/**
 * Curl command parser
 * Extracts URL, method, headers, cookies, and other options from curl commands
 */

export interface ParsedCurlCommand {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  cookies?: string;
  proxy?: string;
  error?: string;
}

/**
 * Parse a curl command and extract scan parameters
 * Supports common curl options: -X, --request, -H, --header, -b, --cookie,
 * -x, --proxy, --data, --data-raw
 *
 * @example
 * ```typescript
 * const result = parseCurlCommand('curl -X GET https://example.com -H "Authorization: Bearer token"');
 * // result = { url: 'https://example.com', method: 'GET', headers: { Authorization: 'Bearer token' } }
 * ```
 */
export function parseCurlCommand(command: string): ParsedCurlCommand {
  if (!command.trim()) {
    return { url: '', error: 'Empty command' };
  }

  // Normalize the command: replace newlines with spaces, collapse multiple spaces
  const normalized = command
    .replace(/\\\n/g, ' ') // Handle line continuation
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Check if it starts with curl
  if (!normalized.toLowerCase().startsWith('curl')) {
    return { url: '', error: 'Command must start with curl' };
  }

  const result: ParsedCurlCommand = {
    url: '',
  };

  const headers: Record<string, string> = {};
  const cookies: string[] = [];

  // Tokenize the command, respecting quoted strings
  const tokens = tokenize(normalized.substring(4).trim()); // Remove 'curl' prefix

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];

    switch (token) {
      case '-X':
      case '--request':
        if (nextToken) {
          result.method = nextToken.toUpperCase();
          i++; // Skip next token
        }
        break;

      case '-H':
      case '--header':
        if (nextToken) {
          const headerMatch = nextToken.match(/^([^:]+):\s*(.*)$/);
          if (headerMatch) {
            const [, name, value] = headerMatch;
            headers[name.trim()] = value.trim();
          }
          i++;
        }
        break;

      case '-b':
      case '--cookie':
        if (nextToken) {
          cookies.push(nextToken);
          i++;
        }
        break;

      case '-x':
      case '--proxy':
        if (nextToken) {
          result.proxy = nextToken;
          i++;
        }
        break;

      case '--data':
      case '--data-raw':
      case '--data-binary':
      case '-d':
        // If there's data, it's not a HEAD/GET request
        if (!result.method) {
          result.method = 'POST';
        }
        if (nextToken) {
          i++;
        }
        break;

      case '-I':
      case '--head':
        result.method = 'HEAD';
        break;

      case '-L':
      case '--location':
        // Follow redirects - just acknowledge, no specific action needed
        break;

      case '-v':
      case '--verbose':
      case '-s':
      case '--silent':
      case '-S':
      case '--show-error':
      case '-f':
      case '--fail':
        // Common flags we can ignore for our purposes
        break;

      default:
        // If it's a URL (starts with http or looks like a URL)
        if (!result.url && (token.startsWith('http://') || token.startsWith('https://'))) {
          result.url = token;
        } else if (!result.url && !token.startsWith('-') && isValidUrl(token)) {
          // Might be a URL without protocol
          result.url = token.startsWith('http') ? token : `http://${token}`;
        }
        break;
    }
  }

  // Set default method if not specified
  if (!result.method) {
    result.method = 'HEAD';
  }

  // Add collected headers
  if (Object.keys(headers).length > 0) {
    result.headers = headers;
  }

  // Add collected cookies
  if (cookies.length > 0) {
    result.cookies = cookies.join('; ');
  }

  if (!result.url) {
    return { url: '', error: 'No URL found in curl command' };
  }

  return result;
}

/**
 * Tokenize a command string respecting quoted values
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"' || char === "'") {
      if (inQuotes === null) {
        inQuotes = char;
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else if (inQuotes === char) {
        inQuotes = null;
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    } else if (char === ' ' && inQuotes === null) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Validate if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `http://${url}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a curl command from scan parameters
 * Useful for showing users the equivalent curl command
 */
export function generateCurlCommand(params: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  cookies?: string;
  proxy?: string;
}): string {
  const parts: string[] = ['curl'];

  // Add method if not GET/HEAD
  if (params.method && params.method !== 'GET' && params.method !== 'HEAD') {
    parts.push(`-X ${params.method}`);
  }

  // Add headers
  if (params.headers) {
    for (const [name, value] of Object.entries(params.headers)) {
      parts.push(`-H "${name}: ${value}"`);
    }
  }

  // Add cookies
  if (params.cookies) {
    parts.push(`-b "${params.cookies}"`);
  }

  // Add proxy
  if (params.proxy) {
    parts.push(`-x "${params.proxy}"`);
  }

  // Add URL (always last)
  parts.push(`"${params.url}"`);

  return parts.join(' ');
}
