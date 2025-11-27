import { Injectable } from '@nestjs/common';
import { GenerateReportDto } from '../dto/generate-report.dto';
import { LogAnalysisResult } from '../../proccesor/dto/log-analysis.dto';
import { ScanPortsResult } from '../../scanPorts/dto/scan-ports.dto';
import { PortAnalysisResult } from '../../proccesor/dto/port-analysis.dto';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfReportService {
  /**
   * Генерирует PDF отчет на основе переданных данных
   */
  async generateReport(dto: GenerateReportDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          autoFirstPage: true,
        });

        // Регистрируем стандартные шрифты для кириллицы
        // Используем встроенные шрифты pdfkit, которые поддерживают Unicode
        doc.registerFont('normal', 'Helvetica');
        doc.registerFont('bold', 'Helvetica-Bold');
        doc.registerFont('italic', 'Helvetica-Oblique');

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Титульная страница
        this.addTitlePage(doc, dto);

        // Содержание
        this.addTableOfContents(doc, dto);

        // Executive Summary
        this.addExecutiveSummary(doc, dto);

        // Introduction
        this.addIntroduction(doc);

        // Testing Methodology
        this.addMethodology(doc);

        // Scope
        this.addScope(doc, dto);

        // Detailed Findings
        if (dto.logAnalysis) {
          this.addDetailedFindings(doc, dto.logAnalysis);
        }

        // Port Scanning Results
        if (dto.portScan) {
          this.addPortScanSection(doc, dto.portScan);
        }

        // Port Security Analysis
        if (dto.portAnalysis) {
          this.addPortAnalysisSection(doc, dto.portAnalysis);
        }

        // Risk Assessment
        this.addRiskAssessment(doc, dto);

        // Recommendations
        this.addRecommendations(doc, dto);

        // Conclusion
        this.addConclusion(doc, dto);

        // Appendices
        this.addAppendices(doc, dto);

        // Добавляем футер перед завершением документа
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addTitlePage(doc: any, dto: GenerateReportDto): void {
    const currentDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Заголовок
    doc
      .fontSize(32)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('PENETRATION TESTING REPORT', { align: 'center' })
      .moveDown(1);

    doc
      .fontSize(20)
      .font('Helvetica')
      .fillColor('#2c3e50')
      .text(dto.title || 'Security Assessment', { align: 'center' })
      .moveDown(2);

    // Информация о тестировании
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('Report Date:', { align: 'center' })
      .fontSize(14)
      .text(currentDate, { align: 'center' })
      .moveDown(1.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('Classification: CONFIDENTIAL', { align: 'center' })
      .moveDown(2);

    // Статистика
    if (dto.logAnalysis) {
      const summary = dto.logAnalysis.summary;
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('Executive Summary', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#34495e')
        .text(`Total Vulnerabilities Found: ${summary.threatsFound}`, { align: 'center' })
        .text(`Critical: ${summary.criticalCount} | High: ${summary.highCount} | Medium: ${summary.mediumCount} | Low: ${summary.lowCount}`, { align: 'center' })
        .moveDown(2);
    }

    // Подпись
    doc
      .fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor('#7f8c8d')
      .text('This report contains sensitive security information', { align: 'center' })
      .text('and should be handled according to your organization\'s security policies.', { align: 'center' });

    doc.addPage();
  }

  private addTableOfContents(doc: any, dto: GenerateReportDto): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('Table of Contents', { underline: true })
      .moveDown(1);

    const sections = [
      '1. Executive Summary',
      '2. Introduction',
      '3. Testing Methodology',
      '4. Scope',
      '5. Detailed Findings',
    ];

    if (dto.portScan) {
      sections.push('6. Port Scanning Results');
    }

    if (dto.portAnalysis) {
      sections.push('7. Port Security Analysis');
    }

    sections.push(
      '8. Risk Assessment',
      '9. Recommendations',
      '10. Conclusion',
      '11. Appendices'
    );

    doc.fontSize(11).font('Helvetica').fillColor('#34495e');
    sections.forEach((section) => {
      doc.text(section, { indent: 20 }).moveDown(0.3);
    });

    doc.addPage();
  }

  private addExecutiveSummary(doc: any, dto: GenerateReportDto): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('1. Executive Summary', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('This penetration testing report presents the findings from a comprehensive security assessment conducted on the target application and infrastructure. The assessment was performed using automated scanning tools, manual testing techniques, and log analysis to identify security vulnerabilities and potential attack vectors.')
      .moveDown(0.5);

    if (dto.logAnalysis) {
      const summary = dto.logAnalysis.summary;
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('Key Findings:')
        .moveDown(0.3);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#34495e')
        .text(`• Total security issues identified: ${summary.threatsFound}`, { indent: 20 })
        .text(`• Critical vulnerabilities: ${summary.criticalCount}`, { indent: 20 })
        .text(`• High severity issues: ${summary.highCount}`, { indent: 20 })
        .text(`• Medium severity issues: ${summary.mediumCount}`, { indent: 20 })
        .text(`• Low severity issues: ${summary.lowCount}`, { indent: 20 })
        .moveDown(0.5);

      if (summary.criticalCount > 0 || summary.highCount > 0) {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#e74c3c')
          .text('Immediate Action Required:', { indent: 20 })
          .moveDown(0.3);

        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#34495e')
          .text('Critical and high-severity vulnerabilities have been identified that require immediate attention. These issues pose significant security risks and could potentially lead to system compromise, data breaches, or service disruption.', { indent: 40 })
          .moveDown(0.5);
      }
    }

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('This report provides detailed information about each vulnerability, including technical descriptions, proof-of-concept examples, risk assessments, and remediation recommendations. It is recommended that all identified issues be addressed according to their severity and business impact.')
      .moveDown(1);

    doc.addPage();
  }

  private addIntroduction(doc: any): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('2. Introduction', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('2.1 Purpose', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The purpose of this penetration testing engagement was to identify security vulnerabilities in the target application and infrastructure. The assessment was conducted to evaluate the security posture of the system and provide actionable recommendations for improving security controls.')
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('2.2 Objectives', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The primary objectives of this assessment were:', { indent: 20 })
      .text('• Identify security vulnerabilities and misconfigurations', { indent: 40 })
      .text('• Assess the effectiveness of existing security controls', { indent: 40 })
      .text('• Evaluate the risk level of identified vulnerabilities', { indent: 40 })
      .text('• Provide detailed remediation recommendations', { indent: 40 })
      .text('• Validate compliance with security best practices', { indent: 40 })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('2.3 Report Structure', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('This report is organized into the following sections:', { indent: 20 })
      .text('• Executive Summary: High-level overview of findings and recommendations', { indent: 40 })
      .text('• Testing Methodology: Description of tools and techniques used', { indent: 40 })
      .text('• Detailed Findings: Comprehensive analysis of each vulnerability', { indent: 40 })
      .text('• Risk Assessment: Evaluation of business impact and risk levels', { indent: 40 })
      .text('• Recommendations: Detailed remediation guidance for each issue', { indent: 40 })
      .moveDown(1);

    doc.addPage();
  }

  private addMethodology(doc: any): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('3. Testing Methodology', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('3.1 Testing Approach', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The penetration testing was conducted using a combination of automated scanning tools and manual testing techniques. The assessment followed industry-standard methodologies including OWASP Testing Guide and PTES (Penetration Testing Execution Standard).')
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('3.2 Tools and Techniques', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The following tools and techniques were utilized during the assessment:', { indent: 20 })
      .text('• Automated vulnerability scanners for initial reconnaissance', { indent: 40 })
      .text('• Port scanning and service enumeration', { indent: 40 })
      .text('• Log analysis and pattern detection', { indent: 40 })
      .text('• Manual security testing and verification', { indent: 40 })
      .text('• Security configuration review', { indent: 40 })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('3.3 Testing Phases', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The assessment was conducted in the following phases:', { indent: 20 })
      .text('1. Reconnaissance: Information gathering and target identification', { indent: 40 })
      .text('2. Scanning: Port scanning, service enumeration, and vulnerability detection', { indent: 40 })
      .text('3. Analysis: Log analysis, pattern detection, and threat identification', { indent: 40 })
      .text('4. Exploitation: Verification of vulnerabilities and impact assessment', { indent: 40 })
      .text('5. Reporting: Documentation of findings and recommendations', { indent: 40 })
      .moveDown(1);

    doc.addPage();
  }

  private addScope(doc: any, dto: GenerateReportDto): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('4. Scope', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('4.1 In-Scope Systems', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The following systems and components were included in the assessment scope:', { indent: 20 });

    if (dto.portScan) {
      doc.text(`• Target IP Address: ${dto.portScan.ip}`, { indent: 40 });
    }

    doc
      .text('• Application services and endpoints', { indent: 40 })
      .text('• Network infrastructure and ports', { indent: 40 })
      .text('• Log files and system events', { indent: 40 })
      .text('• Security configurations', { indent: 40 })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('4.2 Testing Limitations', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The following limitations applied to this assessment:', { indent: 20 })
      .text('• Testing was conducted during business hours with minimal impact', { indent: 40 })
      .text('• Certain destructive testing techniques were not employed', { indent: 40 })
      .text('• Social engineering and physical security were out of scope', { indent: 40 })
      .text('• Testing duration was limited to the agreed timeframe', { indent: 40 })
      .moveDown(1);

    doc.addPage();
  }

  private addDetailedFindings(doc: any, analysis: LogAnalysisResult): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('5. Detailed Findings', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('This section provides detailed information about each security vulnerability identified during the assessment. Each finding includes a description, severity rating, technical details, proof-of-concept examples, and remediation recommendations.')
      .moveDown(0.8);

    if (analysis.patterns && analysis.patterns.length > 0) {
      analysis.patterns.forEach((pattern, index) => {
        this.addVulnerabilityDetail(doc, pattern, index + 1);
        doc.moveDown(0.5);
      });
    }

    doc.addPage();
  }

  private addVulnerabilityDetail(doc: any, pattern: any, number: number): void {
    const severityColor = this.getSeverityColor(pattern.severity);
    const cvssScore = this.getCVSSScore(pattern.severity);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(severityColor)
      .text(`${number}. ${pattern.type} [${pattern.severity}]`, { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('5.' + number + '.1 Overview', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text(this.sanitizeText(pattern.description))
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('5.' + number + '.2 Severity Assessment', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text(`Severity Level: ${pattern.severity}`, { indent: 20 })
      .text(`CVSS Score: ${cvssScore}`, { indent: 20 })
      .text(`Occurrences: ${pattern.count}`, { indent: 20 })
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('5.' + number + '.3 Technical Details', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The vulnerability was identified through automated log analysis and pattern detection. The following technical details provide insight into the nature and scope of the issue:')
      .moveDown(0.3);

    if (pattern.examples && pattern.examples.length > 0) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#7f8c8d')
        .text('Proof of Concept:', { indent: 20 })
        .moveDown(0.2);

      pattern.examples.slice(0, 3).forEach((example: string) => {
        const shortExample = example.length > 100 ? example.substring(0, 100) + '...' : example;
        doc
          .fontSize(9)
          .font('Helvetica-Oblique')
          .fillColor('#7f8c8d')
          .text(`• ${shortExample}`, { indent: 30 });
      });
      doc.moveDown(0.5);
    }

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('5.' + number + '.4 Impact Assessment', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text(this.getImpactDescription(pattern.severity), { indent: 20 })
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('5.' + number + '.5 Remediation', { underline: true })
      .moveDown(0.3);

    if (pattern.recommendations && pattern.recommendations.length > 0) {
      pattern.recommendations.forEach((rec: string) => {
        doc
          .fontSize(11)
          .font('Helvetica')
          .fillColor('#2ecc71')
          .text(`• ${this.sanitizeText(rec)}`, { indent: 20 });
      });
    } else {
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#34495e')
        .text('• Review and implement security best practices for this type of vulnerability', { indent: 20 })
        .text('• Conduct security code review and testing', { indent: 20 })
        .text('• Update security controls and monitoring', { indent: 20 });
    }

    doc.moveDown(1);
  }

  private addRiskAssessment(doc: any, dto: GenerateReportDto): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('8. Risk Assessment', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('This section provides an overall risk assessment based on the identified vulnerabilities and their potential impact on the organization.')
      .moveDown(0.8);

    if (dto.logAnalysis) {
      const summary = dto.logAnalysis.summary;
      
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('8.1 Overall Risk Level', { underline: true })
        .moveDown(0.3);

      let overallRisk = 'Low';
      if (summary.criticalCount > 0) {
        overallRisk = 'Critical';
      } else if (summary.highCount > 0) {
        overallRisk = 'High';
      } else if (summary.mediumCount > 0) {
        overallRisk = 'Medium';
      }

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#34495e')
        .text(`Based on the identified vulnerabilities, the overall risk level is assessed as: ${overallRisk}`, { indent: 20 })
        .moveDown(0.8);

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('8.2 Risk Matrix', { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#34495e')
        .text('The following risk matrix summarizes the distribution of vulnerabilities by severity:', { indent: 20 })
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#e74c3c')
        .text(`Critical: ${summary.criticalCount} vulnerabilities`, { indent: 40 })
        .fillColor('#f39c12')
        .text(`High: ${summary.highCount} vulnerabilities`, { indent: 40 })
        .fillColor('#3498db')
        .text(`Medium: ${summary.mediumCount} vulnerabilities`, { indent: 40 })
        .fillColor('#2ecc71')
        .text(`Low: ${summary.lowCount} vulnerabilities`, { indent: 40 })
        .moveDown(0.8);
    }

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('8.3 Business Impact', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The identified vulnerabilities could potentially impact the organization in the following ways:', { indent: 20 })
      .text('• Data breach and unauthorized access to sensitive information', { indent: 40 })
      .text('• Service disruption and availability issues', { indent: 40 })
      .text('• Reputation damage and loss of customer trust', { indent: 40 })
      .text('• Regulatory compliance violations', { indent: 40 })
      .text('• Financial losses due to security incidents', { indent: 40 })
      .moveDown(1);

    doc.addPage();
  }

  private addRecommendations(doc: any, dto: GenerateReportDto): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('9. Recommendations', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('This section provides prioritized recommendations for addressing the identified security vulnerabilities.')
      .moveDown(0.8);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#e74c3c')
      .text('9.1 Immediate Actions (Critical & High)', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The following actions should be taken immediately:', { indent: 20 })
      .text('• Patch all critical and high-severity vulnerabilities within 48 hours', { indent: 40 })
      .text('• Implement additional monitoring and alerting for critical systems', { indent: 40 })
      .text('• Review and strengthen access controls', { indent: 40 })
      .text('• Conduct emergency security review of affected systems', { indent: 40 })
      .moveDown(0.8);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#f39c12')
      .text('9.2 Short-term Actions (Medium)', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The following actions should be completed within 30 days:', { indent: 20 })
      .text('• Address all medium-severity vulnerabilities', { indent: 40 })
      .text('• Implement security best practices and hardening guidelines', { indent: 40 })
      .text('• Enhance security monitoring and logging', { indent: 40 })
      .text('• Conduct security awareness training for development teams', { indent: 40 })
      .moveDown(0.8);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#3498db')
      .text('9.3 Long-term Actions (Low & General)', { underline: true })
      .moveDown(0.3);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('The following actions should be planned for the next quarter:', { indent: 20 })
      .text('• Establish regular security assessment schedule', { indent: 40 })
      .text('• Implement security development lifecycle (SDLC)', { indent: 40 })
      .text('• Deploy automated security testing tools', { indent: 40 })
      .text('• Establish incident response procedures', { indent: 40 })
      .text('• Conduct regular security training and awareness programs', { indent: 40 })
      .moveDown(1);

    doc.addPage();
  }

  private addConclusion(doc: any, dto: GenerateReportDto): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('10. Conclusion', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('This penetration testing assessment has identified several security vulnerabilities that require attention. While some issues are critical and need immediate remediation, the overall security posture can be significantly improved by implementing the recommendations provided in this report.')
      .moveDown(0.5);

    if (dto.logAnalysis) {
      const summary = dto.logAnalysis.summary;
      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#34495e')
        .text(`The assessment identified ${summary.threatsFound} security issues across various severity levels. It is recommended that all identified vulnerabilities be addressed according to their severity and business impact, with priority given to critical and high-severity issues.`)
        .moveDown(0.5);
    }

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('Regular security assessments should be conducted to ensure ongoing security and compliance. It is also recommended to establish a security testing program that includes both automated scanning and manual testing on a regular basis.')
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('For questions or clarifications regarding this report, please contact the security team.')
      .moveDown(1);

    doc.addPage();
  }

  private addAppendices(doc: any, dto: GenerateReportDto): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('11. Appendices', { underline: true })
      .moveDown(0.8);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('Appendix A: Glossary', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('CVSS: Common Vulnerability Scoring System', { indent: 20 })
      .text('DDoS: Distributed Denial of Service', { indent: 20 })
      .text('RCE: Remote Code Execution', { indent: 20 })
      .text('SQLi: SQL Injection', { indent: 20 })
      .text('XSS: Cross-Site Scripting', { indent: 20 })
      .moveDown(0.8);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('Appendix B: References', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#34495e')
      .text('• OWASP Top 10 - https://owasp.org/www-project-top-ten/', { indent: 20 })
      .text('• PTES - Penetration Testing Execution Standard', { indent: 20 })
      .text('• CVSS v3.1 Specification', { indent: 20 })
      .text('• NIST Cybersecurity Framework', { indent: 20 })
      .moveDown(0.8);

    if (dto.logAnalysis && dto.logAnalysis.summary) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('Appendix C: Testing Statistics', { underline: true })
        .moveDown(0.5);

      const summary = dto.logAnalysis.summary;
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#34495e')
        .text(`Total logs analyzed: ${summary.totalLogs}`, { indent: 20 })
        .text(`Total vulnerabilities found: ${summary.threatsFound}`, { indent: 20 })
        .text(`Critical: ${summary.criticalCount}`, { indent: 20 })
        .text(`High: ${summary.highCount}`, { indent: 20 })
        .text(`Medium: ${summary.mediumCount}`, { indent: 20 })
        .text(`Low: ${summary.lowCount}`, { indent: 20 });
    }
  }

  private getCVSSScore(severity: string): string {
    switch (severity) {
      case 'Critical':
        return '9.0 - 10.0';
      case 'High':
        return '7.0 - 8.9';
      case 'Medium':
        return '4.0 - 6.9';
      case 'Low':
        return '0.1 - 3.9';
      default:
        return 'N/A';
    }
  }

  private getImpactDescription(severity: string): string {
    switch (severity) {
      case 'Critical':
        return 'This vulnerability could lead to complete system compromise, unauthorized access to sensitive data, or service disruption. Immediate remediation is required.';
      case 'High':
        return 'This vulnerability poses a significant security risk and could result in unauthorized access or data exposure. Should be addressed as soon as possible.';
      case 'Medium':
        return 'This vulnerability could be exploited under certain conditions and may lead to limited security impact. Should be addressed within a reasonable timeframe.';
      case 'Low':
        return 'This vulnerability has minimal security impact but should still be addressed as part of security best practices.';
      default:
        return 'Impact assessment pending.';
    }
  }

  private addDescription(doc: any, description: string): void {
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#333333')
      .text(description)
      .moveDown(1);
  }


  private addLogAnalysisSection(doc: any, analysis: LogAnalysisResult): void {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('Security Log Analysis', { underline: true })
      .moveDown(0.5);

    // Статистика
    const summary = analysis.summary;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('Summary Statistics:')
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#34495e')
      .text(`Total logs processed: ${summary.totalLogs}`, { indent: 20 })
      .text(`Threats found: ${summary.threatsFound}`, { indent: 20 })
      .text(`Critical: ${summary.criticalCount}`, { indent: 20 })
      .text(`High: ${summary.highCount}`, { indent: 20 })
      .text(`Medium: ${summary.mediumCount}`, { indent: 20 })
      .text(`Low: ${summary.lowCount}`, { indent: 20 })
      .moveDown(0.5);

    // Обнаруженные паттерны
    if (analysis.patterns && analysis.patterns.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('Detected Threat Patterns:')
        .moveDown(0.3);

      analysis.patterns.forEach((pattern, index) => {
        const severityColor = this.getSeverityColor(pattern.severity);
        
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(severityColor)
          .text(`${index + 1}. ${pattern.type} [${pattern.severity}]`, { indent: 20 })
          .moveDown(0.2);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#34495e')
          .text(`Description: ${this.sanitizeText(pattern.description)}`, { indent: 30 })
          .text(`Count: ${pattern.count}`, { indent: 30 })
          .moveDown(0.2);

        if (pattern.examples && pattern.examples.length > 0) {
          doc
            .fontSize(9)
            .font('Helvetica-Oblique')
            .fillColor('#7f8c8d')
            .text('Examples:', { indent: 30 });
          
          pattern.examples.slice(0, 2).forEach((example) => {
            const shortExample = example.length > 80 ? example.substring(0, 80) + '...' : example;
            doc.text(`• ${shortExample}`, { indent: 40 });
          });
          doc.moveDown(0.2);
        }

        if (pattern.recommendations && pattern.recommendations.length > 0) {
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#27ae60')
            .text('Recommendations:', { indent: 30 });
          
          pattern.recommendations.slice(0, 3).forEach((rec) => {
            doc
              .font('Helvetica')
              .fillColor('#2ecc71')
              .text(`• ${this.sanitizeText(rec)}`, { indent: 40 });
          });
        }

        doc.moveDown(0.5);
      });
    }

    doc.moveDown(0.5);
  }

  private addPortScanSection(doc: any, scanResult: ScanPortsResult): void {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('Port Scanning', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#34495e')
      .text(`IP Address: ${scanResult.ip}`)
      .text(`Scan Date: ${new Date(scanResult.scanDate).toLocaleString('en-US')}`)
      .moveDown(0.3);

    // Статистика сканирования
    const summary = scanResult.summary;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('Scan Statistics:')
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#34495e')
      .text(`Total ports: ${summary.totalScanned}`, { indent: 20 })
      .text(`Open: ${summary.open}`, { indent: 20 })
      .text(`Closed: ${summary.closed}`, { indent: 20 })
      .text(`Filtered: ${summary.filtered}`, { indent: 20 })
      .text(`Errors: ${summary.errors}`, { indent: 20 })
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#34495e')
      .text(`Firewall: ${scanResult.firewall.hasFirewall ? 'Detected' : 'Not detected'}`)
      .moveDown(0.5);

    // Открытые порты
    const openPorts = scanResult.ports.filter((p) => p.status === 'open');
    if (openPorts.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('Open Ports:')
        .moveDown(0.3);

      openPorts.slice(0, 20).forEach((port) => {
        let portInfo = `Port ${port.port} - ${port.status}`;
        if (port.service) {
          portInfo += ` (${port.service})`;
        }
        if (port.responseTime) {
          portInfo += ` [${port.responseTime}ms]`;
        }
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#34495e')
          .text(portInfo, { indent: 20 });
      });

      if (openPorts.length > 20) {
        doc
          .fontSize(9)
          .font('Helvetica-Oblique')
          .fillColor('#7f8c8d')
          .text(`... and ${openPorts.length - 20} more ports`, { indent: 20 });
      }

      doc.moveDown(0.5);
    }
  }

  private addPortAnalysisSection(doc: any, analysis: PortAnalysisResult): void {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('Port Security Analysis', { underline: true })
      .moveDown(0.5);

    // Статистика
    const summary = analysis.summary;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('Analysis Statistics:')
      .moveDown(0.3);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#34495e')
      .text(`Total ports: ${summary.totalPorts}`, { indent: 20 })
      .text(`Open ports: ${summary.openPorts}`, { indent: 20 })
      .text(`Problems found: ${summary.problemsFound}`, { indent: 20 })
      .text(`Critical: ${summary.criticalCount}`, { indent: 20 })
      .text(`High: ${summary.highCount}`, { indent: 20 })
      .text(`Medium: ${summary.mediumCount}`, { indent: 20 })
      .text(`Low: ${summary.lowCount}`, { indent: 20 })
      .moveDown(0.5);

    // Обнаруженные проблемы
    if (analysis.problems && analysis.problems.length > 0) {
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2c3e50')
        .text('Detected Problems:')
        .moveDown(0.3);

      analysis.problems.forEach((problem, index) => {
        const severityColor = this.getSeverityColor(problem.severity);
        
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor(severityColor)
          .text(`${index + 1}. ${problem.type} [${problem.severity}]`, { indent: 20 })
          .moveDown(0.2);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#34495e')
          .text(`Description: ${this.sanitizeText(problem.description)}`, { indent: 30 })
          .text(`Ports: ${problem.ports.join(', ')}`, { indent: 30 })
          .moveDown(0.2);

        if (problem.recommendations && problem.recommendations.length > 0) {
          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#27ae60')
            .text('Recommendations:', { indent: 30 });
          
          problem.recommendations.forEach((rec) => {
            doc
              .font('Helvetica')
              .fillColor('#2ecc71')
              .text(`• ${this.sanitizeText(rec)}`, { indent: 40 });
          });
        }

        doc.moveDown(0.5);
      });
    }

    doc.moveDown(0.5);
  }

  private addFooter(doc: any): void {
    try {
      // Получаем диапазон страниц, которые уже созданы в буфере
      const range = doc.bufferedPageRange();
      
      if (range && range.count > 0) {
        const startPage = range.start;
        const endPage = range.start + range.count - 1;
        
        // Добавляем футер на каждую доступную страницу
        for (let i = startPage; i <= endPage; i++) {
          try {
            // Переключаемся на страницу только если она доступна
            if (i >= startPage && i <= endPage) {
              doc.switchToPage(i);
              const currentPage = i - startPage + 1;
              doc
                .fontSize(8)
                .font('Helvetica')
                .fillColor('#999999')
                .text(
                  `Page ${currentPage}`,
                  doc.page.width - 100,
                  doc.page.height - 30,
                  { align: 'right' }
                );
            }
          } catch (error) {
            // Пропускаем страницы, которые не могут быть обработаны
            // Это нормально, так как некоторые страницы могут быть еще не полностью созданы
            continue;
          }
        }
      }
    } catch (error) {
      // Если возникла ошибка при добавлении футера, просто продолжаем
      // Футер не критичен для работы отчета
      console.warn('Error adding footer:', error);
    }
  }

  /**
   * Удаляет кириллицу из текста, оставляя только ASCII символы
   * Это необходимо для корректного отображения в PDF со стандартными шрифтами
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    
    // Удаляем все не-ASCII символы (включая кириллицу)
    // Оставляем только буквы, цифры, пробелы и основные знаки препинания
    return text
      .replace(/[^\x00-\x7F]/g, '') // Удаляем все не-ASCII символы
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .trim();
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'Critical':
        return '#e74c3c';
      case 'High':
        return '#f39c12';
      case 'Medium':
        return '#3498db';
      case 'Low':
        return '#2ecc71';
      default:
        return '#34495e';
    }
  }
}

