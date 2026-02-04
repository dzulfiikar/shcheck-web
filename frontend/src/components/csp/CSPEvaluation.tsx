import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  AlertOctagon,
  FileJson,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CSPEvaluation, CSPPolicyEvaluation } from '@/types/scan';
import { useState } from 'react';

interface CSPEvaluationProps {
  evaluation: CSPEvaluation;
}

interface CSPCardProps {
  evaluation: CSPPolicyEvaluation;
}

function getEffectivenessColor(effectiveness: string): string {
  switch (effectiveness) {
    case 'strong':
      return 'text-green-600 bg-green-50 dark:bg-green-950';
    case 'moderate':
      return 'text-amber-600 bg-amber-50 dark:bg-amber-950';
    case 'weak':
      return 'text-red-600 bg-red-50 dark:bg-red-950';
    default:
      return 'text-gray-600 bg-gray-50 dark:bg-gray-900';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950';
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950';
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950';
    case 'info':
    default:
      return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950';
  }
}

function getFindingIcon(type: string) {
  switch (type) {
    case 'error':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'info':
    default:
      return <Info className="h-4 w-4 text-blue-600" />;
  }
}

function CSPCard({ evaluation }: CSPCardProps) {
  const [showDirectives, setShowDirectives] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const errors = evaluation.findings.filter((f) => f.type === 'error');
  const warnings = evaluation.findings.filter((f) => f.type === 'warning');
  const successes = evaluation.findings.filter((f) => f.type === 'success');

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <div
        className={`p-4 rounded-lg border ${getEffectivenessColor(
          evaluation.effectiveness
        )}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">CSP Effectiveness</span>
          </div>
          <Badge
            variant={
              evaluation.effectiveness === 'strong'
                ? 'default'
                : evaluation.effectiveness === 'moderate'
                ? 'secondary'
                : 'destructive'
            }
          >
            {evaluation.effectiveness.toUpperCase()}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Security Score</span>
            <span className="font-medium">{evaluation.score}/100</span>
          </div>
          <Progress value={evaluation.score} className="h-2" />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-2xl font-bold">{evaluation.directives.length}</p>
          <p className="text-xs text-muted-foreground">Directives</p>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{successes.length}</p>
          <p className="text-xs text-muted-foreground">Secure</p>
        </div>
        <div className="text-center p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <p className="text-2xl font-bold text-amber-600">{warnings.length}</p>
          <p className="text-xs text-muted-foreground">Warnings</p>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
          <p className="text-2xl font-bold text-red-600">{errors.length}</p>
          <p className="text-xs text-muted-foreground">Errors</p>
        </div>
      </div>

      {/* Unsafe Sources */}
      {evaluation.unsafeSources.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Unsafe Sources Detected
          </h4>
          <div className="flex flex-wrap gap-2">
            {evaluation.unsafeSources.map((source) => (
              <Badge key={source} variant="destructive">
                {source}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Missing Directives */}
      {evaluation.missingDirectives.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-600 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Missing Recommended Directives
          </h4>
          <div className="flex flex-wrap gap-2">
            {evaluation.missingDirectives.map((directive) => (
              <Badge key={directive} variant="outline" className="border-amber-500">
                {directive}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      {evaluation.findings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Findings</h4>
          <div className="space-y-2">
            {evaluation.findings.map((finding, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-sm ${getSeverityColor(
                  finding.severity
                )}`}
              >
                <div className="flex items-start gap-2">
                  {getFindingIcon(finding.type)}
                  <div className="flex-1">
                    <p>{finding.message}</p>
                    {finding.directive && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Directive: <code>{finding.directive}</code>
                      </p>
                    )}
                    {finding.recommendation && (
                      <p className="text-xs mt-1 font-medium">
                        Recommendation: {finding.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bypasses */}
      {evaluation.bypasses.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4" />
            Potential Bypass Techniques
          </h4>
          <div className="space-y-2">
            {evaluation.bypasses.map((bypass, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 text-sm text-red-800 dark:text-red-200"
              >
                {bypass}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directive Details - Collapsible */}
      {evaluation.directives.length > 0 && (
        <div className="border rounded-lg">
          <button
            onClick={() => setShowDirectives(!showDirectives)}
            className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors"
          >
            <span className="font-medium">Directive Details</span>
            {showDirectives ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showDirectives && (
            <div className="p-3 space-y-2 border-t">
              {evaluation.directives.map((directive) => (
                <div key={directive.name} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={directive.isSecure ? 'default' : 'destructive'}>
                      {directive.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({directive.category})
                    </span>
                  </div>
                  <code className="text-xs bg-muted p-1 rounded block">
                    {directive.value || '(no value)'}
                  </code>
                  {directive.warnings.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {directive.warnings.map((warning, i) => (
                        <span
                          key={i}
                          className="text-xs text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded"
                        >
                          {warning}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raw Policy - Collapsible */}
      <div className="border rounded-lg">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            <span className="font-medium">Raw Policy</span>
          </div>
          {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showRaw && (
          <div className="p-3 border-t">
            <code className="text-xs bg-muted p-2 rounded block whitespace-pre-wrap break-all">
              {evaluation.policy}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

export function CSPEvaluation({ evaluation }: CSPEvaluationProps) {
  const cspPolicy = evaluation.headers['content-security-policy'];
  const cspReportOnly = evaluation.headers['content-security-policy-report-only'];

  if (!cspPolicy && !cspReportOnly) {
    return (
      <Card data-testid="csp-missing">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Content Security Policy Missing
          </CardTitle>
          <CardDescription>
            No CSP header detected. This leaves the site vulnerable to XSS attacks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Security Impact
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                Without a Content-Security-Policy header, your site is vulnerable to
                Cross-Site Scripting (XSS) attacks, data injection, and other code
                execution vulnerabilities.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Recommendations</h4>
              <ul className="space-y-2 text-sm">
                {evaluation.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Learn more about CSP
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="csp-evaluation">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            CSP Evaluation Summary
          </CardTitle>
          <CardDescription>
            Content Security Policy analysis based on CSP Level 3 standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall Score</span>
                  <span className="font-medium">{evaluation.overallScore}/100</span>
                </div>
                <Progress value={evaluation.overallScore} className="h-3" />
              </div>
              <Badge
                variant={
                  evaluation.overallEffectiveness === 'strong'
                    ? 'default'
                    : evaluation.overallEffectiveness === 'moderate'
                    ? 'secondary'
                    : evaluation.overallEffectiveness === 'weak'
                    ? 'destructive'
                    : 'outline'
                }
                className="text-sm px-3 py-1"
              >
                {evaluation.overallEffectiveness.toUpperCase()}
              </Badge>
            </div>

            {evaluation.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recommendations</h4>
                <ul className="space-y-1 text-sm">
                  {evaluation.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CSP Policy Evaluation */}
      {cspPolicy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content-Security-Policy</CardTitle>
            <CardDescription>Enforced policy evaluation</CardDescription>
          </CardHeader>
          <CardContent>
            <CSPCard evaluation={cspPolicy} />
          </CardContent>
        </Card>
      )}

      {/* Report-Only Policy */}
      {cspReportOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CSP Report-Only Mode</CardTitle>
            <CardDescription>
              The site has a report-only CSP policy that logs violations without blocking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cspReportOnly.reportUri && (
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span>
                    Report URI: <code>{cspReportOnly.reportUri}</code>
                  </span>
                </div>
              )}
              {cspReportOnly.reportTo && (
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span>
                    Report To: <code>{cspReportOnly.reportTo}</code>
                  </span>
                </div>
              )}
              {!cspPolicy && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 inline mr-2" />
                  Report-only mode is active but no enforced policy exists.
                  Consider upgrading to an enforced policy.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Framework Compatibility */}
      {evaluation.frameworkCompatibility.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Framework Compatibility</CardTitle>
            <CardDescription>
              Detected framework compatibility based on CSP directives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {evaluation.frameworkCompatibility.map((fw) => (
                <Badge
                  key={fw.framework}
                  variant={fw.detected ? 'default' : 'secondary'}
                >
                  {fw.framework}: {fw.detected ? 'Compatible' : 'May need adjustments'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
