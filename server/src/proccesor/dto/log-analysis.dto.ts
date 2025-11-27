export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  ip?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  userAgent?: string;
  [key: string]: any;
}

export interface SecurityPattern {
  type: 'DDoS' | 'Hacking Attempt' | 'Error' | 'Anomaly';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  count: number;
  examples: string[];
  recommendations: string[];
}

export interface AnalysisSummary {
  totalLogs: number;
  threatsFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface LogAnalysisResult {
  patterns: SecurityPattern[];
  summary: AnalysisSummary;
}

export class AnalyzeLogsDto {
  logs: LogEntry[];
}

