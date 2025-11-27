export interface PortProblem {
  type: 'Critical Port' | 'SSL Issue' | 'HTTP Issue' | 'Firewall Issue';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  ports: number[];
  recommendations: string[];
}

export interface PortAnalysisSummary {
  totalPorts: number;
  openPorts: number;
  problemsFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface PortAnalysisResult {
  problems: PortProblem[];
  summary: PortAnalysisSummary;
}

