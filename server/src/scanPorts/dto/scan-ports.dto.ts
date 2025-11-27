export class ScanPortsDto {
  ip: string;
  ports?: number[]; // Опциональный список портов для сканирования. Если не указан, сканируются все порты (1-65535)
  timeout?: number; // Таймаут для каждого порта в миллисекундах (по умолчанию 1000)
  batchSize?: number; // Размер батча для параллельного сканирования (по умолчанию 500)
  scanAllPorts?: boolean; // Если true, сканируются все порты 1-65535 (по умолчанию true)
}

export interface CertificateInfo {
  subject: string; // CN, O, OU и т.д.
  issuer: string; // Кто выдал сертификат
  validFrom: string; // Дата начала действия
  validTo: string; // Дата окончания действия
  daysUntilExpiry: number; // Дней до истечения
  isExpired: boolean; // Истек ли сертификат
  isExpiringSoon: boolean; // Истекает ли скоро (менее 30 дней)
  fingerprint: string; // Отпечаток сертификата
  serialNumber: string; // Серийный номер
  algorithm: string; // Алгоритм подписи
  keySize?: number; // Размер ключа
  san?: string[]; // Subject Alternative Names (альтернативные домены)
  error?: string; // Ошибка при получении сертификата
}

export interface HttpServiceInfo {
  protocol: 'http' | 'https';
  statusCode?: number;
  statusMessage?: string;
  server?: string; // Server header
  poweredBy?: string; // X-Powered-By header
  contentType?: string; // Content-Type header
  title?: string; // HTML title если есть
  headers?: Record<string, string>; // Все заголовки
  redirectUrl?: string; // URL редиректа если есть
  certificateInfo?: CertificateInfo; // Информация о SSL сертификате (только для HTTPS)
  error?: string;
}

export interface PortScanResult {
  port: number;
  status: 'open' | 'closed' | 'filtered' | 'error';
  service?: string; // Определенный сервис на порту
  responseTime?: number; // Время отклика в миллисекундах
  error?: string;
  httpInfo?: HttpServiceInfo; // Информация о HTTP/HTTPS сервисе если обнаружен
}

export interface FirewallInfo {
  hasFirewall: boolean;
  filteredPorts: number[]; // Порты, которые могут быть заблокированы фаерволом
  openPorts: number[];
  closedPorts: number[];
  suspiciousPorts?: number[]; // Порты, которые могут быть подозрительными
}

export interface ScanPortsResult {
  ip: string;
  scanDate: string;
  ports: PortScanResult[];
  firewall: FirewallInfo;
  summary: {
    totalScanned: number;
    open: number;
    closed: number;
    filtered: number;
    errors: number;
  };
}

