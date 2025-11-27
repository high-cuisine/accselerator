import { LogAnalysisResult } from '../../proccesor/dto/log-analysis.dto';
import { ScanPortsResult } from '../../scanPorts/dto/scan-ports.dto';
import { PortAnalysisResult } from '../../proccesor/dto/port-analysis.dto';

export class GenerateReportDto {
  logAnalysis?: LogAnalysisResult;
  portScan?: ScanPortsResult;
  portAnalysis?: PortAnalysisResult;
  title?: string;
  description?: string;
}

