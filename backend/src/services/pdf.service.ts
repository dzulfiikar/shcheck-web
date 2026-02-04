import PDFDocument from 'pdfkit';
import type { ScanResult } from '../db/schema.js';
import type { ScanResponse } from '../types/scan.types.js';
import type { CSPEvaluation } from './csp-evaluator.service.js';

/**
 * PDF Service for generating professional scan reports
 * Styled to match the shadcn/ui web interface design
 */
export class PDFService {
  // Color palette matching the web UI (Tailwind colors)
  private readonly colors = {
    // Primary colors
    primary: '#0f172a',      // slate-900
    primaryForeground: '#f8fafc', // slate-50

    // Status colors
    success: '#22c55e',      // green-500
    successBg: '#f0fdf4',    // green-50
    successDark: '#15803d',  // green-700

    danger: '#ef4444',       // red-500
    dangerBg: '#fef2f2',     // red-50
    dangerDark: '#b91c1c',   // red-700

    warning: '#eab308',      // yellow-500
    warningBg: '#fefce8',    // yellow-50

    info: '#3b82f6',         // blue-500
    infoBg: '#eff6ff',       // blue-50

    // UI colors
    background: '#ffffff',
    foreground: '#0f172a',   // slate-900
    muted: '#f1f5f9',        // slate-100
    mutedForeground: '#64748b', // slate-500
    border: '#e2e8f0',       // slate-200
    card: '#ffffff',
    cardForeground: '#0f172a',

    // Text colors
    textPrimary: '#0f172a',  // slate-900
    textSecondary: '#475569', // slate-600
    textMuted: '#64748b',    // slate-500
  };

  // Design system constants for consistent spacing and typography
  private readonly spacing = {
    pageMargin: 40,
    sectionGap: 24,
    cardPadding: 16,
    elementGap: 12,
    smallGap: 8,
    badgePadding: { x: 12, y: 6 },
  };

  private readonly typography = {
    hero: { size: 28, font: 'Helvetica-Bold', lineHeight: 34 },
    h1: { size: 22, font: 'Helvetica-Bold', lineHeight: 28 },
    h2: { size: 16, font: 'Helvetica-Bold', lineHeight: 22 },
    h3: { size: 13, font: 'Helvetica-Bold', lineHeight: 18 },
    body: { size: 10, font: 'Helvetica', lineHeight: 14 },
    small: { size: 9, font: 'Helvetica', lineHeight: 12 },
    label: { size: 11, font: 'Helvetica-Bold', lineHeight: 14 },
    statValue: { size: 36, font: 'Helvetica-Bold', lineHeight: 42 },
    badge: { size: 9, font: 'Helvetica-Bold', lineHeight: 12 },
  };

  /**
   * Generate a professional PDF report for a single scan
   */
  async generateScanReport(scan: ScanResponse): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          info: {
            Title: `Security Scan Report - ${scan.target}`,
            Author: 'shcheck-web',
            Subject: 'Security Header Scan Report',
            Keywords: 'security, headers, csp, scan',
          }
        });

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.addSingleScanReport(doc, scan);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate a professional PDF report for multiple scans
   */
  async generateBulkReport(scans: ScanResponse[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          info: {
            Title: 'Bulk Security Scan Report',
            Author: 'shcheck-web',
            Subject: 'Security Header Bulk Scan Report',
          }
        });

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.addBulkReportCover(doc, scans);

        // Add each scan
        scans.forEach((scan) => {
          doc.addPage();
          this.addScanContent(doc, scan, true);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add cover page for bulk report
   */
  private addBulkReportCover(doc: PDFKit.PDFDocument, scans: ScanResponse[]): void {
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);
    const centerX = this.spacing.pageMargin + pageWidth / 2;

    // Header banner with gradient-like effect
    doc.rect(0, 0, doc.page.width, 180)
       .fill(this.colors.primary);

    // Logo icon (shield representation)
    this.drawShieldIcon(doc, centerX - 25, 40, 50, this.colors.primaryForeground);

    // Title
    doc.fontSize(this.typography.hero.size)
       .font(this.typography.hero.font)
       .fillColor(this.colors.primaryForeground)
       .text('Security Header Scan Report', this.spacing.pageMargin, 105, { align: 'center', width: pageWidth });

    doc.fontSize(14)
       .font('Helvetica')
       .fillColor(this.colors.primaryForeground)
       .opacity(0.8)
       .text('Bulk Scan Summary', this.spacing.pageMargin, 140, { align: 'center', width: pageWidth });

    // Reset opacity
    doc.opacity(1);

    // Metadata card
    const completed = scans.filter(s => s.status === 'completed').length;
    const failed = scans.filter(s => s.status === 'failed').length;
    const pending = scans.filter(s => s.status === 'pending' || s.status === 'processing').length;

    const metaY = 210;
    this.drawCard(doc, this.spacing.pageMargin, metaY, pageWidth, 110, 'Report Overview');

    const metaContentY = metaY + this.spacing.cardPadding + this.typography.h3.lineHeight;
    doc.fontSize(this.typography.body.size)
       .font(this.typography.body.font)
       .fillColor(this.colors.textSecondary);

    doc.text(`Generated: ${new Date().toLocaleString()}`,
      this.spacing.pageMargin + this.spacing.cardPadding,
      metaContentY);
    doc.text(`Total Scans: ${scans.length}`,
      this.spacing.pageMargin + this.spacing.cardPadding,
      metaContentY + this.typography.body.lineHeight + this.spacing.smallGap);
    doc.text(`Report ID: BULK-${Date.now().toString(36).toUpperCase()}`,
      this.spacing.pageMargin + this.spacing.cardPadding,
      metaContentY + (this.typography.body.lineHeight + this.spacing.smallGap) * 2);

    // Summary statistics cards
    const cardY = metaY + 140;
    const gap = 16;
    const cardWidth = (pageWidth - (gap * 2)) / 3;

    this.drawStatCard(doc, this.spacing.pageMargin, cardY, cardWidth, 'Completed', completed.toString(), this.colors.success);
    this.drawStatCard(doc, this.spacing.pageMargin + cardWidth + gap, cardY, cardWidth, 'Failed', failed.toString(), this.colors.danger);
    this.drawStatCard(doc, this.spacing.pageMargin + (cardWidth + gap) * 2, cardY, cardWidth, 'Pending', pending.toString(), this.colors.warning);

    // Footer note
    doc.fontSize(this.typography.body.size)
       .font(this.typography.body.font)
       .fillColor(this.colors.textMuted)
       .text('Individual scan reports follow on subsequent pages.',
         this.spacing.pageMargin,
         cardY + 130,
         { align: 'center', width: pageWidth });
  }

  /**
   * Add complete single scan report
   */
  private addSingleScanReport(doc: PDFKit.PDFDocument, scan: ScanResponse): void {
    this.addScanHeader(doc, scan);

    const result = scan.result as ScanResult | null | undefined;

    if (!result) {
      doc.fontSize(12)
         .fillColor(this.colors.textMuted)
         .text('No scan results available.', 40, 250);
      return;
    }

    let yPos = 200;

    // Summary section with stats cards
    yPos = this.addSummarySection(doc, 40, yPos, result);
    yPos += 20;

    // CSP Evaluation section
    if (result.cspEvaluation) {
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }
      yPos = this.addCSPSection(doc, 40, yPos, result.cspEvaluation);
      yPos += 20;
    }

    // Present Headers section
    if (yPos > 600) {
      doc.addPage();
      yPos = 50;
    }
    yPos = this.addPresentHeadersSection(doc, 40, yPos, result.present);
    yPos += 20;

    // Missing Headers section
    if (yPos > 600) {
      doc.addPage();
      yPos = 50;
    }
    yPos = this.addMissingHeadersSection(doc, 40, yPos, result.missing);

    // Information Disclosure section
    if (result.informationDisclosure && Object.keys(result.informationDisclosure).length > 0) {
      if (yPos > 600) {
        doc.addPage();
        yPos = 50;
      }
      yPos += 20;
      yPos = this.addInfoDisclosureSection(doc, 40, yPos, result.informationDisclosure);
    }

    // Caching Headers section
    if (result.caching && Object.keys(result.caching).length > 0) {
      if (yPos > 600) {
        doc.addPage();
        yPos = 50;
      }
      yPos += 20;
      yPos = this.addCachingSection(doc, 40, yPos, result.caching);
    }

    // Footer
    this.addFooter(doc);
  }

  /**
   * Add styled header for single scan report
   */
  private addScanHeader(doc: PDFKit.PDFDocument, scan: ScanResponse): void {
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);

    // Header banner
    doc.rect(0, 0, doc.page.width, 160)
       .fill(this.colors.primary);

    // Shield icon
    const centerX = doc.page.width / 2;
    this.drawShieldIcon(doc, centerX - 20, 30, 40, this.colors.primaryForeground);

    // Title
    doc.fontSize(this.typography.h1.size)
       .font(this.typography.h1.font)
       .fillColor(this.colors.primaryForeground)
       .text('Security Header Scan Report', this.spacing.pageMargin, 80, { align: 'center', width: pageWidth });

    // Target URL
    doc.fontSize(this.typography.label.size)
       .font('Helvetica')
       .fillColor(this.colors.primaryForeground)
       .opacity(0.9)
       .text(scan.target, this.spacing.pageMargin, 112, { align: 'center', width: pageWidth });

    doc.opacity(1);

    // Metadata row
    const metaY = 140;
    const statusColor = this.getStatusColor(scan.status);

    doc.fontSize(this.typography.small.size)
       .font(this.typography.small.font)
       .fillColor(this.colors.primaryForeground)
       .text('Status: ', this.spacing.pageMargin + this.spacing.cardPadding, metaY);

    // Status badge in header
    const statusLabel = scan.status.toUpperCase();
    const badgePaddingX = 12;
    const badgeHeight = 20;
    const badgeY = metaY - 4;
    const badgeX = this.spacing.pageMargin + this.spacing.cardPadding + 35;

    doc.roundedRect(badgeX, badgeY, doc.widthOfString(statusLabel) + (badgePaddingX * 2), badgeHeight, 10)
       .fill(statusColor);

    this.drawCenteredBadgeText(
      doc, statusLabel, badgeX, badgeY,
      doc.widthOfString(statusLabel) + (badgePaddingX * 2), badgeHeight,
      this.typography.badge.size, this.typography.badge.font, '#ffffff'
    );

    // Date and duration - aligned in a row
    const metaBaseX = this.spacing.pageMargin + 180;
    doc.fontSize(this.typography.small.size)
       .font(this.typography.small.font)
       .fillColor(this.colors.primaryForeground)
       .opacity(0.85)
       .text(`Created: ${new Date(scan.createdAt).toLocaleString()}`, metaBaseX, metaY)
       .text(`ID: ${scan.id.slice(0, 8)}`, metaBaseX + 160, metaY);

    if (scan.duration) {
      doc.text(`Duration: ${Math.round(scan.duration / 1000)}s`, metaBaseX + 280, metaY);
    }

    doc.opacity(1);
  }

  /**
   * Add summary section with stat cards
   */
  private addSummarySection(doc: PDFKit.PDFDocument, x: number, y: number, result: ScanResult): number {
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);

    // Section title with consistent typography
    doc.fontSize(this.typography.h2.size)
       .font(this.typography.h2.font)
       .fillColor(this.colors.textPrimary)
       .text('Summary', x, y);

    // Underline for section title
    const underlineY = y + this.typography.h2.lineHeight + 4;
    doc.rect(x, underlineY, pageWidth, 1.5)
       .fill(this.colors.border);

    const safeCount = result.summary?.safe || Object.keys(result.present).length;
    const unsafeCount = result.summary?.unsafe || result.missing.length;
    const total = safeCount + unsafeCount;

    // Three stat cards with consistent gap
    const gap = 16;
    const cardWidth = (pageWidth - (gap * 2)) / 3;
    const cardY = underlineY + this.spacing.sectionGap - 8;

    this.drawStatCard(doc, x, cardY, cardWidth, 'Present', safeCount.toString(), this.colors.success, 'security headers found');
    this.drawStatCard(doc, x + cardWidth + gap, cardY, cardWidth, 'Missing', unsafeCount.toString(), this.colors.danger, 'headers not configured');
    this.drawStatCard(doc, x + (cardWidth + gap) * 2, cardY, cardWidth, 'Total', total.toString(), this.colors.primary, 'headers checked');

    return cardY + 110;
  }

  /**
   * Add CSP evaluation section
   */
  private addCSPSection(doc: PDFKit.PDFDocument, x: number, y: number, csp: CSPEvaluation): number {
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);

    // Section title with consistent typography
    doc.fontSize(this.typography.h2.size)
       .font(this.typography.h2.font)
       .fillColor(this.colors.textPrimary)
       .text('CSP Evaluation', x, y);

    // Underline for section title
    const underlineY = y + this.typography.h2.lineHeight + 4;
    doc.rect(x, underlineY, pageWidth, 1.5)
       .fill(this.colors.border);

    let yPos = underlineY + this.spacing.elementGap;

    // Overall score card
    const scoreColor = csp.overallScore >= 70 ? this.colors.success :
                       csp.overallScore >= 40 ? this.colors.warning : this.colors.danger;

    const cardHeight = 85;
    this.drawCard(doc, x, yPos, pageWidth, cardHeight, 'Content Security Policy Assessment');

    const contentY = yPos + this.typography.h3.lineHeight + this.spacing.cardPadding + 4;

    // Score display with proper alignment
    doc.fontSize(this.typography.statValue.size)
       .font(this.typography.statValue.font)
       .fillColor(scoreColor)
       .text(csp.overallScore.toString(), x + this.spacing.cardPadding, contentY);

    doc.fontSize(this.typography.label.size)
       .font(this.typography.label.font)
       .fillColor(this.colors.textMuted)
       .text('/100', x + this.spacing.cardPadding + 55, contentY + 16);

    // Effectiveness badge with centered text
    const effectivenessLabel = csp.overallEffectiveness.toUpperCase();
    const badgePaddingX = 14;
    const badgeHeight = 26;
    const badgeY = contentY + 5;
    const badgeX = x + this.spacing.cardPadding + 80;
    const effWidth = doc.widthOfString(effectivenessLabel) + (badgePaddingX * 2);

    doc.roundedRect(badgeX, badgeY, effWidth, badgeHeight, 13)
       .fill(scoreColor);

    this.drawCenteredBadgeText(
      doc, effectivenessLabel, badgeX, badgeY, effWidth, badgeHeight,
      this.typography.label.size, this.typography.label.font, '#ffffff'
    );

    // Progress bar with aligned position
    const progressBarWidth = 180;
    const progressBarHeight = 10;
    const progressY = contentY + 10;
    doc.roundedRect(x + pageWidth - progressBarWidth - this.spacing.cardPadding, progressY, progressBarWidth, progressBarHeight, 5)
       .fill(this.colors.muted);

    // Progress bar fill
    const progressWidth = (csp.overallScore / 100) * progressBarWidth;
    doc.roundedRect(x + pageWidth - progressBarWidth - this.spacing.cardPadding, progressY, progressWidth, progressBarHeight, 5)
       .fill(scoreColor);

    yPos += cardHeight + this.spacing.sectionGap;

    // Individual CSP headers
    if (csp.headers['content-security-policy']) {
      const policy = csp.headers['content-security-policy'];

      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      this.drawCard(doc, x, yPos, pageWidth, 55, 'Enforced CSP Policy');

      doc.fontSize(this.typography.body.size)
         .font(this.typography.body.font)
         .fillColor(this.colors.textSecondary)
         .text(`Score: ${policy.score}/100 • Directives: ${policy.directives.length}`,
           x + this.spacing.cardPadding,
           yPos + this.typography.h3.lineHeight + this.spacing.elementGap);

      yPos += 75;

      // Recommendations
      if (csp.recommendations.length > 0 && yPos < 600) {
        doc.fontSize(this.typography.h3.size)
           .font(this.typography.h3.font)
           .fillColor(this.colors.textPrimary)
           .text('Recommendations', x + this.spacing.cardPadding, yPos);

        yPos += this.typography.h3.lineHeight + this.spacing.smallGap;
        doc.fontSize(this.typography.body.size)
           .font(this.typography.body.font)
           .fillColor(this.colors.textSecondary);

        csp.recommendations.forEach((rec, index) => {
          if (yPos > 720) {
            doc.addPage();
            yPos = 50;
          }
          const numWidth = doc.widthOfString(`${index + 1}. `);
          doc.text(`${index + 1}.`, x + this.spacing.cardPadding, yPos);
          doc.text(rec, x + this.spacing.cardPadding + numWidth, yPos, { width: pageWidth - this.spacing.cardPadding * 2 - numWidth });
          yPos += this.typography.body.lineHeight + 6;
        });
      }
    }

    return yPos;
  }

  /**
   * Add present headers section
   */
  private addPresentHeadersSection(doc: PDFKit.PDFDocument, x: number, y: number, present: Record<string, string>): number {
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);
    const entries = Object.entries(present);

    if (entries.length === 0) {
      this.drawCard(doc, x, y, pageWidth, 60, 'Present Headers (0)');
      doc.fontSize(this.typography.body.size)
         .font(this.typography.body.font)
         .fillColor(this.colors.textMuted)
         .text('No security headers found.', x + this.spacing.cardPadding, y + this.typography.h3.lineHeight + this.spacing.elementGap);
      return y + 80;
    }

    // Section title with count badge
    const title = 'Present Headers';
    doc.fontSize(this.typography.h2.size)
       .font(this.typography.h2.font)
       .fillColor(this.colors.textPrimary)
       .text(title, x, y);

    // Count badge with centered text
    const countStr = entries.length.toString();
    const badgePaddingX = 10;
    const badgeHeight = 22;
    const countWidth = doc.widthOfString(countStr) + (badgePaddingX * 2);
    const titleWidth = doc.widthOfString(title);
    const countBadgeX = x + titleWidth + this.spacing.elementGap;

    doc.roundedRect(countBadgeX, y - 1, countWidth, badgeHeight, 11)
       .fill(this.colors.success);

    this.drawCenteredBadgeText(
      doc, countStr, countBadgeX, y - 1, countWidth, badgeHeight,
      this.typography.label.size, this.typography.label.font, '#ffffff'
    );

    // Underline
    const underlineY = y + this.typography.h2.lineHeight + 6;
    doc.rect(x, underlineY, pageWidth, 1.5)
       .fill(this.colors.border);

    let yPos = underlineY + this.spacing.elementGap;

    // Header table with dynamic row heights for wrapping values
    const headerBadgeHeight = 22;
    const valueMaxWidth = pageWidth - (this.spacing.elementGap * 2);

    entries.forEach(([header, value], index) => {
      // Calculate dynamic row height based on wrapped text
      const valueHeight = this.calculateTextHeight(
        doc, value, valueMaxWidth,
        this.typography.small.size, this.typography.small.font,
        this.typography.small.lineHeight
      );

      // Calculate actual height needed for the value text
      doc.fontSize(this.typography.small.size)
         .font(this.typography.small.font);
      const textHeight = doc.heightOfString(value, {
        width: valueMaxWidth,
        lineGap: 2
      });

      // Row height: badge + spacing + actual text height + bottom padding
      const rowHeight = headerBadgeHeight + 10 + textHeight + 12;

      if (yPos + rowHeight > 750) {
        doc.addPage();
        yPos = 50;
      }

      // Alternating row background - use calculated row height
      if (index % 2 === 0) {
        doc.rect(x, yPos - 4, pageWidth, rowHeight)
           .fill(this.colors.muted);
      }

      // Header name badge with centered text
      const headerBadgePadding = 10;
      const headerBadgeWidth = doc.widthOfString(header) + (headerBadgePadding * 2);
      const headerBadgeX = x + this.spacing.elementGap;
      const headerBadgeY = yPos + 4;

      doc.roundedRect(headerBadgeX, headerBadgeY, headerBadgeWidth, headerBadgeHeight, 4)
         .fill(this.colors.success);

      this.drawCenteredBadgeText(
        doc, header, headerBadgeX, headerBadgeY, headerBadgeWidth, headerBadgeHeight,
        this.typography.badge.size, this.typography.badge.font, '#ffffff'
      );

      // Header value with dynamic wrapping
      doc.fontSize(this.typography.small.size)
         .font(this.typography.small.font)
         .fillColor(this.colors.textSecondary)
         .text(value, x + this.spacing.elementGap, yPos + headerBadgeHeight + 12, {
           width: valueMaxWidth,
           lineGap: 2
         });

      // Advance yPos by the actual calculated row height
      yPos += rowHeight;
    });

    return yPos;
  }

  /**
   * Add missing headers section
   */
  private addMissingHeadersSection(doc: PDFKit.PDFDocument, x: number, y: number, missing: string[]): number {
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);

    if (missing.length === 0) {
      this.drawCard(doc, x, y, pageWidth, 70, 'Missing Headers');

      // Success message with proper padding
      const messageY = y + this.typography.h3.lineHeight + this.spacing.cardPadding + 8;
      doc.roundedRect(x + this.spacing.cardPadding, messageY, pageWidth - (this.spacing.cardPadding * 2), 30, 6)
         .fill(this.colors.successBg);
      doc.fontSize(this.typography.body.size)
         .font(this.typography.body.font)
         .fillColor(this.colors.successDark)
         .text('All recommended headers are present!', x + this.spacing.cardPadding + this.spacing.elementGap, messageY + 9);

      return y + 100;
    }

    // Section title with count badge
    const title = 'Missing Headers';
    doc.fontSize(this.typography.h2.size)
       .font(this.typography.h2.font)
       .fillColor(this.colors.textPrimary)
       .text(title, x, y);

    // Count badge with centered text
    const countStr = missing.length.toString();
    const badgePaddingX = 10;
    const badgeHeight = 22;
    const countWidth = doc.widthOfString(countStr) + (badgePaddingX * 2);
    const titleWidth = doc.widthOfString(title);
    const countBadgeX = x + titleWidth + this.spacing.elementGap;

    doc.roundedRect(countBadgeX, y - 1, countWidth, badgeHeight, 11)
       .fill(this.colors.danger);

    this.drawCenteredBadgeText(
      doc, countStr, countBadgeX, y - 1, countWidth, badgeHeight,
      this.typography.label.size, this.typography.label.font, '#ffffff'
    );

    // Underline
    const underlineY = y + this.typography.h2.lineHeight + 6;
    doc.rect(x, underlineY, pageWidth, 1.5)
       .fill(this.colors.border);

    let yPos = underlineY + this.spacing.elementGap;

    // Missing headers as badges with centered text
    let currentX = x;
    const missingBadgeHeight = 26;
    const missingBadgePaddingX = 14;
    const gap = 10;

    missing.forEach((header) => {
      const badgeWidth = doc.widthOfString(header) + (missingBadgePaddingX * 2);

      if (currentX + badgeWidth > x + pageWidth) {
        currentX = x;
        yPos += missingBadgeHeight + gap;
      }

      if (yPos > 750) {
        doc.addPage();
        yPos = 50;
        currentX = x;
      }

      doc.roundedRect(currentX, yPos, badgeWidth, missingBadgeHeight, 4)
         .fill(this.colors.danger);

      this.drawCenteredBadgeText(
        doc, header, currentX, yPos, badgeWidth, missingBadgeHeight,
        this.typography.badge.size, this.typography.badge.font, '#ffffff'
      );

      currentX += badgeWidth + gap;
    });

    return yPos + missingBadgeHeight + this.spacing.sectionGap;
  }

  /**
   * Add information disclosure section
   */
  private addInfoDisclosureSection(doc: PDFKit.PDFDocument, x: number, y: number, info: Record<string, string>): number {
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);
    const entries = Object.entries(info);

    // Calculate dynamic card height based on content
    const rowHeight = 32;
    const cardHeight = this.typography.h3.lineHeight + this.spacing.cardPadding + this.spacing.elementGap +
                        (entries.length * rowHeight) + this.spacing.cardPadding;

    this.drawCard(doc, x, y, pageWidth, cardHeight, 'Information Disclosure');

    doc.fontSize(this.typography.body.size)
       .font(this.typography.body.font)
       .fillColor(this.colors.textMuted)
       .text('Headers that may reveal sensitive information about the server',
         x + this.spacing.cardPadding,
         y + this.typography.h3.lineHeight + this.spacing.cardPadding);

    let yPos = y + this.typography.h3.lineHeight + this.spacing.cardPadding + this.spacing.elementGap + this.typography.body.lineHeight;

    entries.forEach(([header, value]) => {
      if (yPos > 720) {
        doc.addPage();
        yPos = 50;
      }

      // Header badge with centered text
      const badgeHeight = 22;
      const badgePaddingX = 10;
      const badgeWidth = doc.widthOfString(header) + (badgePaddingX * 2);
      const badgeX = x + this.spacing.cardPadding;

      doc.roundedRect(badgeX, yPos, badgeWidth, badgeHeight, 4)
         .stroke(this.colors.border);

      this.drawCenteredBadgeText(
        doc, header, badgeX, yPos, badgeWidth, badgeHeight,
        this.typography.badge.size, this.typography.badge.font, this.colors.textPrimary
      );

      // Value with proper alignment and wrapping
      const valueX = x + 160;
      doc.fontSize(this.typography.small.size)
         .font(this.typography.small.font)
         .fillColor(this.colors.textSecondary)
         .text(value, valueX, yPos + 5, {
           width: pageWidth - (valueX - x) - this.spacing.cardPadding,
           lineGap: 1
         });

      yPos += rowHeight;
    });

    return yPos + this.spacing.sectionGap;
  }

  /**
   * Add caching headers section
   */
  private addCachingSection(doc: PDFKit.PDFDocument, x: number, y: number, caching: Record<string, string>): number {
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);
    const entries = Object.entries(caching);

    // Calculate dynamic card height based on content
    const rowHeight = 32;
    const cardHeight = this.typography.h3.lineHeight + this.spacing.cardPadding + this.spacing.elementGap +
                        (entries.length * rowHeight) + this.spacing.cardPadding;

    this.drawCard(doc, x, y, pageWidth, cardHeight, 'Caching Headers');

    doc.fontSize(this.typography.body.size)
       .font(this.typography.body.font)
       .fillColor(this.colors.textMuted)
       .text('Cache control and expiration headers',
         x + this.spacing.cardPadding,
         y + this.typography.h3.lineHeight + this.spacing.cardPadding);

    let yPos = y + this.typography.h3.lineHeight + this.spacing.cardPadding + this.spacing.elementGap + this.typography.body.lineHeight;

    entries.forEach(([header, value]) => {
      if (yPos > 720) {
        doc.addPage();
        yPos = 50;
      }

      // Header badge with centered text
      const badgeHeight = 22;
      const badgePaddingX = 10;
      const badgeWidth = doc.widthOfString(header) + (badgePaddingX * 2);
      const badgeX = x + this.spacing.cardPadding;

      doc.roundedRect(badgeX, yPos, badgeWidth, badgeHeight, 4)
         .fill(this.colors.muted);

      this.drawCenteredBadgeText(
        doc, header, badgeX, yPos, badgeWidth, badgeHeight,
        this.typography.badge.size, this.typography.badge.font, this.colors.textPrimary
      );

      // Value with proper alignment and wrapping
      const valueX = x + 160;
      doc.fontSize(this.typography.small.size)
         .font(this.typography.small.font)
         .fillColor(this.colors.textSecondary)
         .text(value, valueX, yPos + 5, {
           width: pageWidth - (valueX - x) - this.spacing.cardPadding,
           lineGap: 1
         });

      yPos += rowHeight;
    });

    return yPos + this.spacing.sectionGap;
  }

  /**
   * Add scan content for bulk reports (compact version)
   */
  private addScanContent(doc: PDFKit.PDFDocument, scan: ScanResponse, _isBulk = false): void {
    const result = scan.result as ScanResult | null | undefined;
    const pageWidth = doc.page.width - (this.spacing.pageMargin * 2);

    // Compact header for bulk with improved typography
    doc.fontSize(this.typography.h2.size)
       .font(this.typography.h2.font)
       .fillColor(this.colors.textPrimary)
       .text(`Scan: ${scan.id.slice(0, 8)}`, this.spacing.pageMargin, 50);

    doc.fontSize(this.typography.body.size)
       .font(this.typography.body.font)
       .fillColor(this.colors.textMuted)
       .text(`Target: ${scan.target}`, this.spacing.pageMargin, 78)
       .text(`Status: ${scan.status} | Created: ${new Date(scan.createdAt).toLocaleString()}`,
         this.spacing.pageMargin, 96);

    doc.rect(this.spacing.pageMargin, 115, pageWidth, 1)
       .fill(this.colors.border);

    if (!result) {
      doc.fontSize(this.typography.body.size)
         .font(this.typography.body.font)
         .fillColor(this.colors.textMuted)
         .text('No results available.', this.spacing.pageMargin, 130);
      return;
    }

    let yPos = 135;

    // Compact summary with consistent spacing
    const safeCount = result.summary?.safe || Object.keys(result.present).length;
    const unsafeCount = result.summary?.unsafe || result.missing.length;

    doc.fontSize(this.typography.label.size)
       .font(this.typography.label.font)
       .fillColor(this.colors.success)
       .text(`Present: ${safeCount}`, this.spacing.pageMargin, yPos);
    doc.fillColor(this.colors.danger)
       .text(`Missing: ${unsafeCount}`, this.spacing.pageMargin + 120, yPos);

    yPos += this.spacing.sectionGap + 4;

    // Headers list (compact) with improved layout
    if (Object.keys(result.present).length > 0) {
      doc.fontSize(this.typography.label.size)
         .font(this.typography.label.font)
         .fillColor(this.colors.textPrimary)
         .text('Present Headers:', this.spacing.pageMargin, yPos);
      yPos += this.typography.label.lineHeight + this.spacing.smallGap;

      doc.fontSize(this.typography.small.size)
         .font(this.typography.small.font)
         .fillColor(this.colors.textSecondary);

      Object.entries(result.present).forEach(([header, value]) => {
        if (yPos > 750) {
          doc.addPage();
          yPos = 50;
        }
        const truncatedValue = value.length > 60 ? `${value.substring(0, 60)}...` : value;
        doc.text(`• ${header}: ${truncatedValue}`,
          this.spacing.pageMargin + this.spacing.elementGap, yPos);
        yPos += this.typography.small.lineHeight + 4;
      });
    }

    yPos += this.spacing.elementGap;

    if (result.missing.length > 0) {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(this.typography.label.size)
         .font(this.typography.label.font)
         .fillColor(this.colors.textPrimary)
         .text('Missing Headers:', this.spacing.pageMargin, yPos);
      yPos += this.typography.label.lineHeight + this.spacing.smallGap;

      doc.fontSize(this.typography.small.size)
         .font(this.typography.small.font)
         .fillColor(this.colors.danger);

      result.missing.forEach(header => {
        if (yPos > 750) {
          doc.addPage();
          yPos = 50;
        }
        doc.text(`• ${header}`, this.spacing.pageMargin + this.spacing.elementGap, yPos);
        yPos += this.typography.small.lineHeight + 4;
      });
    }
  }

  /**
   * Draw a card container
   */
  private drawCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, title: string): void {
    // Card background with consistent border radius
    doc.roundedRect(x, y, width, height, 8)
       .fillAndStroke(this.colors.card, this.colors.border);

    // Card title with consistent typography
    doc.fontSize(this.typography.h3.size)
       .font(this.typography.h3.font)
       .fillColor(this.colors.textPrimary)
       .text(title, x + this.spacing.cardPadding, y + 10);
  }

  /**
   * Draw a stat card with value and label
   */
  private drawStatCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string, color: string, description?: string): void {
    const cardHeight = description ? 110 : 90;

    // Card background
    doc.roundedRect(x, y, width, cardHeight, 8)
       .fill(this.colors.muted);

    // Value with consistent typography
    doc.fontSize(this.typography.statValue.size)
       .font(this.typography.statValue.font)
       .fillColor(color)
       .text(value, x + this.spacing.cardPadding, y + 12);

    // Label with consistent typography
    doc.fontSize(this.typography.label.size)
       .font(this.typography.label.font)
       .fillColor(this.colors.textPrimary)
       .text(label, x + this.spacing.cardPadding, y + 58);

    // Description with consistent typography
    if (description) {
      doc.fontSize(this.typography.small.size)
         .font(this.typography.small.font)
         .fillColor(this.colors.textMuted)
         .text(description, x + this.spacing.cardPadding, y + 76, { width: width - (this.spacing.cardPadding * 2) });
    }
  }

  /**
   * Draw shield icon
   */
  private drawShieldIcon(doc: PDFKit.PDFDocument, x: number, y: number, size: number, color: string): void {
    const centerX = x + size / 2;
    const topY = y;
    const bottomY = y + size;
    const width = size * 0.8;

    doc.save();

    // Shield shape
    const path = [
      'M', centerX, topY,
      'C', centerX + width/2, topY + size * 0.1, centerX + width/2, topY + size * 0.3, centerX + width/2, topY + size * 0.5,
      'C', centerX + width/2, topY + size * 0.7, centerX + width/4, bottomY - size * 0.1, centerX, bottomY,
      'C', centerX - width/4, bottomY - size * 0.1, centerX - width/2, topY + size * 0.7, centerX - width/2, topY + size * 0.5,
      'C', centerX - width/2, topY + size * 0.3, centerX - width/2, topY + size * 0.1, centerX, topY,
      'Z'
    ].join(' ');

    doc.path(path)
       .fill(color);

    // Inner checkmark
    doc.strokeColor('#ffffff')
       .lineWidth(2)
       .moveTo(centerX - size * 0.15, topY + size * 0.45)
       .lineTo(centerX - size * 0.02, topY + size * 0.6)
       .lineTo(centerX + size * 0.2, topY + size * 0.3)
       .stroke();

    doc.restore();
  }

  /**
   * Add footer to page
   */
  private addFooter(doc: PDFKit.PDFDocument): void {
    const pageHeight = doc.page.height;
    const pageWidth = doc.page.width;

    doc.fontSize(this.typography.small.size - 1)
       .font(this.typography.small.font)
       .fillColor(this.colors.textMuted)
       .text(
         `Generated by shcheck-web on ${new Date().toLocaleString()}`,
         this.spacing.pageMargin,
         pageHeight - 50,
         { align: 'center', width: pageWidth - (this.spacing.pageMargin * 2) }
       );
  }

  /**
   * Get color for status
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return this.colors.success;
      case 'failed':
        return this.colors.danger;
      case 'pending':
        return this.colors.info;
      case 'processing':
        return this.colors.warning;
      default:
        return this.colors.mutedForeground;
    }
  }

  /**
   * Draw centered text in a badge/rectangle
   * Calculates proper vertical centering based on font metrics
   */
  private drawCenteredBadgeText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    font: string,
    color: string
  ): void {
    doc.fontSize(fontSize)
       .font(font)
       .fillColor(color);

    const textWidth = doc.widthOfString(text);
    const textHeight = doc.currentLineHeight();
    const ascent = doc._font.ascender / 1000 * fontSize;
    const descent = Math.abs(doc._font.descender) / 1000 * fontSize;

    // Calculate center position accounting for font baseline
    const centerX = x + (width - textWidth) / 2;
    const centerY = y + (height - textHeight) / 2 + (ascent - descent) / 2 - ascent * 0.1;

    doc.text(text, centerX, centerY);
  }

  /**
   * Calculate text height with wrapping
   * Returns the height needed for text with given width
   */
  private calculateTextHeight(
    doc: PDFKit.PDFDocument,
    text: string,
    width: number,
    fontSize: number,
    font: string,
    lineHeight?: number
  ): number {
    doc.fontSize(fontSize).font(font);
    const lh = lineHeight || doc.currentLineHeight();
    const lines = doc.heightOfString(text, { width, lineGap: 0 });
    return Math.max(lines, lh);
  }
}

export const pdfService = new PDFService();
