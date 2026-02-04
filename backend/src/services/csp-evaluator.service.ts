/**
 * CSP Evaluator Service
 *
 * Evaluates Content-Security-Policy headers against CSP Level 3 standards.
 * Provides detailed analysis of CSP configuration with security recommendations.
 *
 * Based on:
 * - CSP Level 3: https://www.w3.org/TR/CSP3/
 * - Google CSP Evaluator: https://github.com/google/csp-evaluator
 * - MDN CSP Documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */

export type CSPSeverity = 'high' | 'medium' | 'low' | 'info';
export type CSPDirectiveCategory = 'fetch' | 'document' | 'navigation' | 'reporting' | 'other';

export interface CSPDirectiveInfo {
  name: string;
  category: CSPDirectiveCategory;
  description: string;
  required: boolean;
  recommended: boolean;
}

export interface CSPFinding {
  type: 'error' | 'warning' | 'info' | 'success';
  severity: CSPSeverity;
  message: string;
  directive?: string;
  recommendation?: string;
}

export interface CSPDirectiveEvaluation {
  name: string;
  value: string;
  sources: string[];
  isSecure: boolean;
  warnings: string[];
  category: CSPDirectiveCategory;
}

export interface CSPFrameworkDetection {
  framework: string;
  detected: boolean;
  requiredDirectives: string[];
}

export interface CSPPolicyEvaluation {
  policy: string;
  directives: CSPDirectiveEvaluation[];
  findings: CSPFinding[];
  score: number; // 0-100
  effectiveness: 'weak' | 'moderate' | 'strong';
  missingDirectives: string[];
  unsafeSources: string[];
  bypasses: string[];
}

export interface CSPReportOnlyEvaluation {
  reportOnly: boolean;
  reportUri?: string;
  reportTo?: string;
}

export interface CSPEvaluation {
  headers: {
    'content-security-policy'?: CSPPolicyEvaluation;
    'content-security-policy-report-only'?: CSPReportOnlyEvaluation;
  };
  overallScore: number;
  overallEffectiveness: 'none' | 'weak' | 'moderate' | 'strong';
  recommendations: string[];
  bypassTechniques: string[];
  frameworkCompatibility: CSPFrameworkDetection[];
}

// CSP Level 3 Directives with metadata
const CSP_DIRECTIVES: Record<string, CSPDirectiveInfo> = {
  // Fetch directives
  'default-src': {
    name: 'default-src',
    category: 'fetch',
    description: 'Default policy for fetching resources',
    required: true,
    recommended: true,
  },
  'script-src': {
    name: 'script-src',
    category: 'fetch',
    description: 'Valid sources for JavaScript',
    required: false,
    recommended: true,
  },
  'style-src': {
    name: 'style-src',
    category: 'fetch',
    description: 'Valid sources for stylesheets',
    required: false,
    recommended: true,
  },
  'img-src': {
    name: 'img-src',
    category: 'fetch',
    description: 'Valid sources for images',
    required: false,
    recommended: true,
  },
  'connect-src': {
    name: 'connect-src',
    category: 'fetch',
    description: 'Valid sources for fetch, WebSocket, EventSource',
    required: false,
    recommended: true,
  },
  'font-src': {
    name: 'font-src',
    category: 'fetch',
    description: 'Valid sources for fonts',
    required: false,
    recommended: true,
  },
  'object-src': {
    name: 'object-src',
    category: 'fetch',
    description: 'Valid sources for plugins (object, embed)',
    required: false,
    recommended: true,
  },
  'media-src': {
    name: 'media-src',
    category: 'fetch',
    description: 'Valid sources for audio and video',
    required: false,
    recommended: false,
  },
  'frame-src': {
    name: 'frame-src',
    category: 'fetch',
    description: 'Valid sources for frames/iframes',
    required: false,
    recommended: true,
  },
  'worker-src': {
    name: 'worker-src',
    category: 'fetch',
    description: 'Valid sources for Worker scripts',
    required: false,
    recommended: false,
  },
  'manifest-src': {
    name: 'manifest-src',
    category: 'fetch',
    description: 'Valid sources for web app manifests',
    required: false,
    recommended: false,
  },
  // Document directives
  'base-uri': {
    name: 'base-uri',
    category: 'document',
    description: 'Restricts URLs that can be used in base element',
    required: false,
    recommended: true,
  },
  'sandbox': {
    name: 'sandbox',
    category: 'document',
    description: 'Enables sandbox for the resource',
    required: false,
    recommended: false,
  },
  // Navigation directives
  'form-action': {
    name: 'form-action',
    category: 'navigation',
    description: 'Restricts URLs that can be used as form actions',
    required: false,
    recommended: true,
  },
  'frame-ancestors': {
    name: 'frame-ancestors',
    category: 'navigation',
    description: 'Specifies valid parents that may embed the page',
    required: false,
    recommended: true,
  },
  // Reporting directives
  'report-uri': {
    name: 'report-uri',
    category: 'reporting',
    description: 'URI to send violation reports (deprecated)',
    required: false,
    recommended: false,
  },
  'report-to': {
    name: 'report-to',
    category: 'reporting',
    description: 'Reporting group for violation reports',
    required: false,
    recommended: true,
  },
  // Other directives
  'upgrade-insecure-requests': {
    name: 'upgrade-insecure-requests',
    category: 'other',
    description: 'Upgrades HTTP URLs to HTTPS',
    required: false,
    recommended: true,
  },
  'block-all-mixed-content': {
    name: 'block-all-mixed-content',
    category: 'other',
    description: 'Blocks all mixed content (deprecated)',
    required: false,
    recommended: false,
  },
};

// Insecure CSP sources that weaken policy
const INSECURE_SOURCES = [
  { pattern: /'unsafe-inline'/, name: "'unsafe-inline'", risk: 'Allows inline scripts/styles - XSS risk' },
  { pattern: /'unsafe-eval'/, name: "'unsafe-eval'", risk: 'Allows eval() and similar - XSS risk' },
  { pattern: /'wasm-unsafe-eval'/, name: "'wasm-unsafe-eval'", risk: 'Allows WebAssembly compilation' },
  { pattern: /data:/, name: 'data:', risk: 'Allows data: URLs - XSS risk in some contexts' },
  { pattern: /blob:/, name: 'blob:', risk: 'Allows blob: URLs - potential security concern' },
  { pattern: /javascript:/, name: 'javascript:', risk: 'JavaScript protocol handlers - XSS risk' },
  { pattern: /\*/, name: "'*' (wildcard)", risk: 'Allows any source - completely bypasses CSP' },
  { pattern: /https?:/, name: 'http: (without TLS)', risk: 'Allows unencrypted HTTP connections' },
];

// Known CSP bypasses
const KNOWN_BYPASSES: Array<{
  name: string;
  condition: (directives: Record<string, string>) => boolean;
  description: string;
  severity: CSPSeverity;
}> = [
  {
    name: 'JSONP Bypass',
    condition: (d) => {
      const scriptSrc = d['script-src'] || d['default-src'] || '';
      return scriptSrc.includes('googleapis.com') ||
             scriptSrc.includes('ajax.googleapis.com') ||
             scriptSrc.includes('gstatic.com');
    },
    description: 'Whitelisted Google domains can be used for JSONP-based CSP bypass',
    severity: 'medium',
  },
  {
    name: 'Angular Template Injection',
    condition: (d) => {
      const scriptSrc = d['script-src'] || '';
      return scriptSrc.includes('cdnjs.cloudflare.com') || scriptSrc.includes('unpkg.com');
    },
    description: 'CDNs may host vulnerable Angular versions that enable CSP bypass',
    severity: 'medium',
  },
  {
    name: 'object-src Missing',
    condition: (d) => {
      const objectSrc = d['object-src'];
      const defaultSrc = d['default-src'] || '';
      return !objectSrc && (!defaultSrc || defaultSrc.includes("'none'"));
    },
    description: 'Missing object-src allows plugin execution via data: or other sources',
    severity: 'high',
  },
  {
    name: 'base-uri Missing',
    condition: (d) => !d['base-uri'],
    description: 'Missing base-uri allows attackers to change base URL, potentially hijacking relative URLs',
    severity: 'medium',
  },
  {
    name: 'strict-dynamic with unsafe-inline',
    condition: (d) => {
      const scriptSrc = d['script-src'] || '';
      return scriptSrc.includes("'strict-dynamic'") && scriptSrc.includes("'unsafe-inline'");
    },
    description: "'strict-dynamic' ignores 'unsafe-inline' in modern browsers, but fallback may allow inline scripts",
    severity: 'low',
  },
];

export class CSPEvaluator {
  /**
   * Parse a CSP policy string into a map of directives
   */
  parsePolicy(policy: string): Record<string, string> {
    const directives: Record<string, string> = {};

    // Handle multiple policies (separated by semicolons)
    const parts = policy.split(';').map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
      // First space separates directive name from values
      const spaceIndex = part.indexOf(' ');
      if (spaceIndex === -1) {
        // Directive with no value (e.g., upgrade-insecure-requests)
        directives[part.toLowerCase()] = '';
      } else {
        const name = part.slice(0, spaceIndex).toLowerCase();
        const value = part.slice(spaceIndex + 1).trim();
        directives[name] = value;
      }
    }

    return directives;
  }

  /**
   * Evaluate a single directive
   */
  evaluateDirective(name: string, value: string): CSPDirectiveEvaluation {
    const sources = value.split(/\s+/).filter(Boolean);
    const warnings: string[] = [];
    const info = CSP_DIRECTIVES[name.toLowerCase()];

    // Check for insecure sources
    for (const source of sources) {
      for (const insecure of INSECURE_SOURCES) {
        if (insecure.pattern.test(source)) {
          warnings.push(`${insecure.name} detected: ${insecure.risk}`);
        }
      }
    }

    // Check for 'none' which is secure
    const isSecure = sources.includes("'none'") ||
      (!sources.some(s => INSECURE_SOURCES.some(i => i.pattern.test(s))) &&
       sources.length > 0);

    return {
      name,
      value,
      sources,
      isSecure,
      warnings,
      category: info?.category || 'other',
    };
  }

  /**
   * Calculate effectiveness score based on directives and security
   */
  calculateScore(directives: CSPDirectiveEvaluation[], rawDirectives: Record<string, string>): number {
    let score = 0;
    const maxScore = 100;

    // Points for having CSP at all
    score += 10;

    // Points for recommended directives (30 points total)
    const recommendedDirectives = ['default-src', 'script-src', 'style-src', 'img-src', 'connect-src'];
    for (const dir of recommendedDirectives) {
      if (rawDirectives[dir]) score += 6;
    }

    // Points for security directives (30 points total)
    if (rawDirectives['object-src']) score += 10;
    if (rawDirectives['base-uri']) score += 10;
    if (rawDirectives['frame-ancestors']) score += 10;

    // Points for safe configurations (30 points total)
    for (const dir of directives) {
      if (dir.isSecure && dir.sources.includes("'none'")) {
        score += 5;
      } else if (dir.isSecure && !dir.sources.some(s => s.includes('unsafe'))) {
        score += 3;
      }
    }

    // Deductions for critical issues
    const scriptSrc = rawDirectives['script-src'] || rawDirectives['default-src'] || '';
    if (scriptSrc.includes("'unsafe-inline'") && !scriptSrc.includes("'nonce-") && !scriptSrc.includes("'sha256-")) {
      score -= 20;
    }
    if (scriptSrc.includes("'unsafe-eval'")) {
      score -= 15;
    }
    if (scriptSrc.includes('*')) {
      score -= 25;
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(maxScore, score));
  }

  /**
   * Detect potential CSP bypasses
   */
  detectBypasses(rawDirectives: Record<string, string>): string[] {
    const bypasses: string[] = [];

    for (const bypass of KNOWN_BYPASSES) {
      if (bypass.condition(rawDirectives)) {
        bypasses.push(`${bypass.name}: ${bypass.description}`);
      }
    }

    return bypasses;
  }

  /**
   * Detect framework compatibility issues
   */
  detectFrameworks(rawDirectives: Record<string, string>): CSPFrameworkDetection[] {
    const frameworks: CSPFrameworkDetection[] = [];

    // React
    const reactDirectives = ['script-src', 'style-src'];
    const hasReact = reactDirectives.every(d => rawDirectives[d]?.includes("'nonce-") || rawDirectives[d]?.includes("'unsafe-inline'"));
    frameworks.push({
      framework: 'React',
      detected: hasReact,
      requiredDirectives: reactDirectives,
    });

    // Angular
    const angularDirectives = ['script-src'];
    const hasAngular = angularDirectives.every(d =>
      rawDirectives[d]?.includes("'self'") || rawDirectives[d]?.includes("'unsafe-eval'")
    );
    frameworks.push({
      framework: 'Angular',
      detected: hasAngular,
      requiredDirectives: angularDirectives,
    });

    // Vue.js
    const vueDirectives = ['script-src', 'style-src'];
    const hasVue = vueDirectives.every(d => rawDirectives[d]?.includes("'self'") || rawDirectives[d]?.includes("'unsafe-eval'"));
    frameworks.push({
      framework: 'Vue.js',
      detected: hasVue,
      requiredDirectives: vueDirectives,
    });

    return frameworks;
  }

  /**
   * Evaluate a complete CSP policy
   */
  evaluatePolicy(policy: string): CSPPolicyEvaluation {
    const rawDirectives = this.parsePolicy(policy);
    const directives: CSPDirectiveEvaluation[] = [];
    const findings: CSPFinding[] = [];

    // Evaluate each directive
    for (const [name, value] of Object.entries(rawDirectives)) {
      const evaluation = this.evaluateDirective(name, value);
      directives.push(evaluation);

      // Add findings for warnings
      for (const warning of evaluation.warnings) {
        findings.push({
          type: 'warning',
          severity: 'medium',
          message: warning,
          directive: name,
        });
      }

      // Success for secure configurations
      if (evaluation.isSecure && evaluation.sources.includes("'none'")) {
        findings.push({
          type: 'success',
          severity: 'info',
          message: `${name} is properly restricted`,
          directive: name,
        });
      }
    }

    // Check for missing recommended directives
    const missingDirectives: string[] = [];
    const criticalDirectives = ['default-src', 'script-src', 'object-src', 'base-uri'];
    for (const dir of criticalDirectives) {
      if (!rawDirectives[dir]) {
        missingDirectives.push(dir);
        findings.push({
          type: 'warning',
          severity: dir === 'default-src' || dir === 'script-src' ? 'high' : 'medium',
          message: `Missing ${dir} directive`,
          recommendation: `Add ${dir} directive to improve security`,
        });
      }
    }

    // Detect bypasses
    const bypasses = this.detectBypasses(rawDirectives);
    for (const bypass of bypasses) {
      findings.push({
        type: 'warning',
        severity: 'medium',
        message: bypass,
      });
    }

    // Calculate unsafe sources
    const unsafeSources: string[] = [];
    for (const dir of directives) {
      for (const source of dir.sources) {
        for (const insecure of INSECURE_SOURCES) {
          if (insecure.pattern.test(source) && !unsafeSources.includes(insecure.name)) {
            unsafeSources.push(insecure.name);
          }
        }
      }
    }

    // Calculate score and effectiveness
    const score = this.calculateScore(directives, rawDirectives);
    let effectiveness: 'weak' | 'moderate' | 'strong';
    if (score >= 80) effectiveness = 'strong';
    else if (score >= 50) effectiveness = 'moderate';
    else effectiveness = 'weak';

    return {
      policy,
      directives,
      findings,
      score,
      effectiveness,
      missingDirectives,
      unsafeSources,
      bypasses,
    };
  }

  /**
   * Evaluate CSP headers from scan results
   */
  evaluate(headers: Record<string, string>): CSPEvaluation {
    // Find headers case-insensitively
    const headerEntries = Object.entries(headers);
    const cspEntry = headerEntries.find(
      ([k]) => k.toLowerCase() === 'content-security-policy'
    );
    const cspReportOnlyEntry = headerEntries.find(
      ([k]) => k.toLowerCase() === 'content-security-policy-report-only'
    );

    const cspHeader = cspEntry?.[1];
    const cspReportOnly = cspReportOnlyEntry?.[1];

    const result: CSPEvaluation = {
      headers: {},
      overallScore: 0,
      overallEffectiveness: 'none',
      recommendations: [],
      bypassTechniques: [],
      frameworkCompatibility: [],
    };

    // Evaluate main CSP policy
    if (cspHeader) {
      result.headers['content-security-policy'] = this.evaluatePolicy(cspHeader);
      result.overallScore = result.headers['content-security-policy'].score;
      result.overallEffectiveness = result.headers['content-security-policy'].effectiveness;
      result.bypassTechniques = result.headers['content-security-policy'].bypasses;
      result.frameworkCompatibility = this.detectFrameworks(
        this.parsePolicy(cspHeader)
      );
    }

    // Evaluate report-only policy
    if (cspReportOnly) {
      const reportUriMatch = cspReportOnly.match(/report-uri\s+([^;]+)/);
      const reportToMatch = cspReportOnly.match(/report-to\s+([^;]+)/);

      result.headers['content-security-policy-report-only'] = {
        reportOnly: true,
        reportUri: reportUriMatch?.[1]?.trim(),
        reportTo: reportToMatch?.[1]?.trim(),
      };

      // If no main CSP but report-only exists
      if (!cspHeader) {
        result.recommendations.push('Consider enforcing CSP in addition to report-only mode');
      }
    }

    // Generate recommendations
    this.generateRecommendations(result, cspHeader, cspReportOnly);

    return result;
  }

  /**
   * Generate security recommendations based on evaluation
   */
  private generateRecommendations(
    result: CSPEvaluation,
    cspHeader?: string,
    cspReportOnly?: string
  ): void {
    if (!cspHeader && !cspReportOnly) {
      result.recommendations.push('Implement a Content-Security-Policy header to prevent XSS attacks');
      result.recommendations.push('Start with report-only mode: Content-Security-Policy-Report-Only');
      result.overallEffectiveness = 'none';
      return;
    }

    if (cspHeader) {
      const evaluation = result.headers['content-security-policy']!;

      if (evaluation.score < 50) {
        result.recommendations.push('CSP policy is weak - avoid using unsafe-inline and wildcards');
      }

      if (evaluation.missingDirectives.includes('default-src')) {
        result.recommendations.push('Add default-src directive as a fallback for unspecified resource types');
      }

      if (evaluation.missingDirectives.includes('script-src')) {
        result.recommendations.push('Add script-src directive to control JavaScript execution');
      }

      if (evaluation.missingDirectives.includes('object-src')) {
        result.recommendations.push("Add object-src 'none' to prevent plugin-based attacks");
      }

      if (evaluation.missingDirectives.includes('base-uri')) {
        result.recommendations.push("Add base-uri directive to prevent base tag hijacking");
      }

      if (evaluation.unsafeSources.includes("'unsafe-inline'") && !evaluation.policy.includes("'nonce-")) {
        result.recommendations.push("Replace 'unsafe-inline' with nonce-based or hash-based CSP");
      }

      if (!evaluation.policy.includes('upgrade-insecure-requests')) {
        result.recommendations.push('Consider adding upgrade-insecure-requests for HTTPS migration');
      }

      if (!evaluation.policy.includes('frame-ancestors')) {
        result.recommendations.push('Add frame-ancestors directive to prevent clickjacking');
      }

      if (!evaluation.policy.includes('form-action')) {
        result.recommendations.push('Add form-action directive to restrict form submissions');
      }
    }
  }
}

// Export singleton instance
export const cspEvaluator = new CSPEvaluator();
