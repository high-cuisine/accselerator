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

export interface AnalyzeLogsDto {
  logs: LogEntry[];
}

