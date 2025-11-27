export interface IPortScanResult {
  port: number;
  status: 'open' | 'closed' | 'filtered' | 'error';
  service?: string;
  responseTime?: number;
  error?: string;
}

export interface IFirewallInfo {
  hasFirewall: boolean;
  filteredPorts: number[];
  openPorts: number[];
  closedPorts: number[];
  suspiciousPorts?: number[];
}

export interface IScanPortsResult {
  ip: string;
  scanDate: string;
  ports: IPortScanResult[];
  firewall: IFirewallInfo;
  summary: {
    totalScanned: number;
    open: number;
    closed: number;
    filtered: number;
    errors: number;
  };
}

