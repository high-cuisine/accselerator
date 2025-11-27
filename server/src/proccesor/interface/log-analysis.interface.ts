export interface ILogAnalysisResult {
  patterns: ISecurityPattern[];
  summary: IAnalysisSummary;
}

export interface ISecurityPattern {
  type: 'DDoS' | 'Hacking Attempt' | 'Error' | 'Anomaly';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  count: number;
  examples: string[];
  recommendations: string[];
}

export interface IAnalysisSummary {
  totalLogs: number;
  threatsFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

