import { describe, it, expect } from 'vitest';
import { parseCurlCommand, generateCurlCommand } from '../curl-parser';

describe('parseCurlCommand', () => {
  it('should parse a simple curl command', () => {
    const result = parseCurlCommand('curl https://example.com');

    expect(result.url).toBe('https://example.com');
    expect(result.method).toBe('HEAD');
    expect(result.error).toBeUndefined();
  });

  it('should parse curl command with method', () => {
    const result = parseCurlCommand('curl -X POST https://api.example.com/users');

    expect(result.url).toBe('https://api.example.com/users');
    expect(result.method).toBe('POST');
  });

  it('should parse curl command with --request flag', () => {
    const result = parseCurlCommand('curl --request PUT https://api.example.com/users/1');

    expect(result.url).toBe('https://api.example.com/users/1');
    expect(result.method).toBe('PUT');
  });

  it('should parse curl command with headers', () => {
    const result = parseCurlCommand(
      'curl -H "Authorization: Bearer token123" -H "Content-Type: application/json" https://api.example.com'
    );

    expect(result.url).toBe('https://api.example.com');
    expect(result.headers).toEqual({
      Authorization: 'Bearer token123',
      'Content-Type': 'application/json',
    });
  });

  it('should parse curl command with cookies', () => {
    const result = parseCurlCommand('curl -b "sessionId=abc123; auth=xyz789" https://example.com');

    expect(result.url).toBe('https://example.com');
    expect(result.cookies).toBe('sessionId=abc123; auth=xyz789');
  });

  it('should parse curl command with proxy', () => {
    const result = parseCurlCommand('curl -x http://proxy.example.com:8080 https://example.com');

    expect(result.url).toBe('https://example.com');
    expect(result.proxy).toBe('http://proxy.example.com:8080');
  });

  it('should detect POST method from --data flag', () => {
    const result = parseCurlCommand('curl --data "name=test" https://api.example.com/users');

    expect(result.url).toBe('https://api.example.com/users');
    expect(result.method).toBe('POST');
  });

  it('should detect HEAD method from -I flag', () => {
    const result = parseCurlCommand('curl -I https://example.com');

    expect(result.url).toBe('https://example.com');
    expect(result.method).toBe('HEAD');
  });

  it('should handle multiline curl commands', () => {
    const result = parseCurlCommand(`curl \\
      -X POST \\
      -H "Authorization: Bearer token" \\
      https://api.example.com`);

    expect(result.url).toBe('https://api.example.com');
    expect(result.method).toBe('POST');
    expect(result.headers?.Authorization).toBe('Bearer token');
  });

  it('should return error for empty command', () => {
    const result = parseCurlCommand('');

    expect(result.error).toBe('Empty command');
  });

  it('should return error for command not starting with curl', () => {
    const result = parseCurlCommand('wget https://example.com');

    expect(result.error).toBe('Command must start with curl');
  });

  it('should return error when no URL found', () => {
    const result = parseCurlCommand('curl -X GET');

    expect(result.error).toBe('No URL found in curl command');
  });

  it('should parse complex curl command with multiple options', () => {
    const command = `
      curl -X POST \\
        -H "Authorization: Bearer token123" \\
        -H "Content-Type: application/json" \\
        -b "sessionId=abc" \\
        -x http://proxy:8080 \\
        https://api.example.com/users
    `;

    const result = parseCurlCommand(command);

    expect(result.url).toBe('https://api.example.com/users');
    expect(result.method).toBe('POST');
    expect(result.headers).toEqual({
      Authorization: 'Bearer token123',
      'Content-Type': 'application/json',
    });
    expect(result.cookies).toBe('sessionId=abc');
    expect(result.proxy).toBe('http://proxy:8080');
  });

  it('should handle single quotes in headers', () => {
    const result = parseCurlCommand("curl -H 'Authorization: Bearer token' https://example.com");

    expect(result.url).toBe('https://example.com');
    expect(result.headers?.Authorization).toBe('Bearer token');
  });

  it('should ignore common curl flags', () => {
    const result = parseCurlCommand('curl -v -s -S -f -L https://example.com');

    expect(result.url).toBe('https://example.com');
    expect(result.error).toBeUndefined();
  });
});

describe('generateCurlCommand', () => {
  it('should generate simple curl command', () => {
    const result = generateCurlCommand({ url: 'https://example.com' });

    expect(result).toBe('curl "https://example.com"');
  });

  it('should generate curl command with method', () => {
    const result = generateCurlCommand({
      url: 'https://api.example.com',
      method: 'POST',
    });

    expect(result).toBe('curl -X POST "https://api.example.com"');
  });

  it('should not include -X for GET/HEAD methods', () => {
    const getResult = generateCurlCommand({
      url: 'https://example.com',
      method: 'GET',
    });
    const headResult = generateCurlCommand({
      url: 'https://example.com',
      method: 'HEAD',
    });

    expect(getResult).toBe('curl "https://example.com"');
    expect(headResult).toBe('curl "https://example.com"');
  });

  it('should generate curl command with headers', () => {
    const result = generateCurlCommand({
      url: 'https://api.example.com',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
    });

    expect(result).toBe(
      'curl -H "Authorization: Bearer token" -H "Content-Type: application/json" "https://api.example.com"'
    );
  });

  it('should generate curl command with cookies', () => {
    const result = generateCurlCommand({
      url: 'https://example.com',
      cookies: 'sessionId=abc; auth=xyz',
    });

    expect(result).toBe('curl -b "sessionId=abc; auth=xyz" "https://example.com"');
  });

  it('should generate curl command with proxy', () => {
    const result = generateCurlCommand({
      url: 'https://example.com',
      proxy: 'http://proxy:8080',
    });

    expect(result).toBe('curl -x "http://proxy:8080" "https://example.com"');
  });

  it('should generate complex curl command', () => {
    const result = generateCurlCommand({
      url: 'https://api.example.com/users',
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      cookies: 'sessionId=abc',
      proxy: 'http://proxy:8080',
    });

    expect(result).toBe(
      'curl -X POST -H "Authorization: Bearer token" -H "Content-Type: application/json" -b "sessionId=abc" -x "http://proxy:8080" "https://api.example.com/users"'
    );
  });
});
