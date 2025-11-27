import { Injectable, OnModuleInit } from '@nestjs/common';
import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';
import { ScanPortsDto, ScanPortsResult, PortScanResult, FirewallInfo, HttpServiceInfo, CertificateInfo } from '../dto/scan-ports.dto';
import { ProccesorService } from '../../proccesor/services/proccesor.service';
import { TelegramService } from '../../telegram/services/telegram.service';

@Injectable()
export class PortScannerService {
  // Стандартные порты для сканирования
  private readonly commonPorts = [
    20, 21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995,
    1723, 3306, 3389, 5900, 8080, 8443
  ];

  // Сопоставление портов и сервисов
  private readonly portServices: { [key: number]: string } = {
    20: 'FTP Data',
    21: 'FTP',
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    111: 'RPC',
    135: 'MSRPC',
    139: 'NetBIOS',
    143: 'IMAP',
    443: 'HTTPS',
    445: 'SMB',
    993: 'IMAPS',
    995: 'POP3S',
    1723: 'PPTP',
    3306: 'MySQL',
    3389: 'RDP',
    5900: 'VNC',
    8080: 'HTTP-Proxy',
    8443: 'HTTPS-Alt'
  };

  private readonly scanInterval: number = 30 * 60 * 1000; // 30 минут
  private readonly targetIp: string;

  constructor(
    private readonly proccesorService: ProccesorService,
    private readonly telegramService: TelegramService
  ) {
    // Получаем IP для сканирования из переменной окружения или используем дефолтный
    this.targetIp = process.env.SCAN_TARGET_IP || '31.128.42.239';
  }

  // async onModuleInit() {
  //   console.log(`Port Scanner Service initialized`);
  //   console.log(`Target IP: ${this.targetIp}`);
  //   console.log(`Scan interval: ${this.scanInterval / 1000 / 60} minutes`);

  //   // Запускаем первую проверку сразу
  //   await this.performScanAndAnalysis();

  //   // Затем запускаем периодическую проверку каждые 30 минут
  //   setInterval(async () => {
  //     try {
  //       await this.performScanAndAnalysis();
  //     } catch (error) {
  //       console.error('Error in periodic port scan:', error);
  //     }
  //   }, this.scanInterval);
  // }

  /**
   * Выполняет сканирование портов и анализ через нейросеть
   */
  private async performScanAndAnalysis(): Promise<void> {
    console.log(`\n[${new Date().toISOString()}] Starting port scan and analysis...`);
    
    try {
      // Сканируем порты
      const scanResult = await this.scanPorts({ 
        ip: this.targetIp,
        scanAllPorts: false, // Сканируем только стандартные порты для быстрого анализа
        timeout: 1000,
        batchSize: 100
      });

      // Выводим результаты в консоль
      this.printScanResults(scanResult);

      // Анализируем через нейросеть
      try {
        const analysisResult = await this.proccesorService.analyzePorts(scanResult);
        
        // Если найдены проблемы, отправляем в Telegram
        if (analysisResult.problems && analysisResult.problems.length > 0) {
          const significantProblems = analysisResult.problems.filter(
            p => p.severity === 'Critical' || p.severity === 'High' || p.severity === 'Medium'
          );

          if (significantProblems.length > 0) {
            await this.telegramService.sendPortSecurityAlert(scanResult, analysisResult);
          }
        } else {
          console.log('✅ Проблем с портами не обнаружено');
        }
      } catch (error) {
        console.error('Error analyzing ports with AI:', error);
      }
    } catch (error) {
      console.error('Error scanning ports:', error);
    }
  }

  /**
   * Выводит результаты сканирования в консоль
   */
  private printScanResults(res: ScanPortsResult): void {
      console.log('\n========== РЕЗУЛЬТАТЫ СКАНИРОВАНИЯ ПОРТОВ ==========');
      console.log(`IP адрес: ${res.ip}`);
      console.log(`Дата сканирования: ${res.scanDate}`);
      console.log(`\n📊 Статистика:`);
      console.log(`  Всего просканировано: ${res.summary.totalScanned}`);
      console.log(`  Открытых: ${res.summary.open}`);
      console.log(`  Закрытых: ${res.summary.closed}`);
      console.log(`  Заблокированных фаерволом: ${res.summary.filtered}`);
      console.log(`  Ошибок: ${res.summary.errors}`);
      
      console.log(`\n🔥 Фаервол: ${res.firewall.hasFirewall ? 'Обнаружен' : 'Не обнаружен'}`);
      if (res.firewall.suspiciousPorts && res.firewall.suspiciousPorts.length > 0) {
        console.log(`  ⚠️  Подозрительные порты: ${res.firewall.suspiciousPorts.join(', ')}`);
      }

      const openPorts = res.ports.filter(p => p.status === 'open');
      if (openPorts.length > 0) {
        console.log(`\n✅ ОТКРЫТЫЕ ПОРТЫ (${openPorts.length}):`);
        console.log('─'.repeat(80));
        
        openPorts.forEach(port => {
          console.log(`\n🔓 Порт ${port.port}`);
          console.log(`   Сервис: ${port.service || 'Неизвестно'}`);
          if (port.responseTime) {
            console.log(`   Время отклика: ${port.responseTime}мс`);
          }
          
          if (port.httpInfo) {
            console.log(`   🌐 HTTP/HTTPS сервис обнаружен:`);
            console.log(`      Протокол: ${port.httpInfo.protocol.toUpperCase()}`);
            if (port.httpInfo.statusCode) {
              console.log(`      Статус: ${port.httpInfo.statusCode} ${port.httpInfo.statusMessage || ''}`);
            }
            if (port.httpInfo.server) {
              console.log(`      Сервер: ${port.httpInfo.server}`);
            }
            if (port.httpInfo.poweredBy) {
              console.log(`      Технология: ${port.httpInfo.poweredBy}`);
            }
            if (port.httpInfo.contentType) {
              console.log(`      Content-Type: ${port.httpInfo.contentType}`);
            }
            if (port.httpInfo.title) {
              console.log(`      Заголовок страницы: ${port.httpInfo.title}`);
            }
            if (port.httpInfo.redirectUrl) {
              console.log(`      Редирект на: ${port.httpInfo.redirectUrl}`);
            }
            if (port.httpInfo.headers) {
              const importantHeaders = ['x-frame-options', 'x-content-type-options', 'strict-transport-security', 'content-security-policy'];
              const foundHeaders = importantHeaders.filter(h => port.httpInfo?.headers?.[h]);
              if (foundHeaders.length > 0) {
                console.log(`      Важные заголовки безопасности:`);
                foundHeaders.forEach(h => {
                  console.log(`        ${h}: ${port.httpInfo?.headers?.[h]}`);
                });
              }
            }
            
            // Информация о SSL сертификате (только для HTTPS)
            if (port.httpInfo.certificateInfo) {
              const cert = port.httpInfo.certificateInfo;
              console.log(`   🔒 SSL/TLS Сертификат:`);
              console.log(`      Subject: ${cert.subject}`);
              console.log(`      Issuer: ${cert.issuer}`);
              console.log(`      Действителен с: ${new Date(cert.validFrom).toLocaleString('ru-RU')}`);
              console.log(`      Действителен до: ${new Date(cert.validTo).toLocaleString('ru-RU')}`);
              
              if (cert.isExpired) {
                console.log(`      ⚠️  СТАТУС: ИСТЕК (${Math.abs(cert.daysUntilExpiry)} дней назад)`);
              } else if (cert.isExpiringSoon) {
                console.log(`      ⚠️  СТАТУС: Истекает через ${cert.daysUntilExpiry} дней`);
              } else {
                console.log(`      ✅ СТАТУС: Действителен (осталось ${cert.daysUntilExpiry} дней)`);
              }
              
              console.log(`      Отпечаток: ${cert.fingerprint}`);
              console.log(`      Серийный номер: ${cert.serialNumber}`);
              console.log(`      Алгоритм: ${cert.algorithm}`);
              if (cert.keySize) {
                console.log(`      Размер ключа: ${cert.keySize} бит`);
              }
              if (cert.san && cert.san.length > 0) {
                console.log(`      SAN (альтернативные домены): ${cert.san.join(', ')}`);
              }
              if (cert.error) {
                console.log(`      ⚠️  Ошибка: ${cert.error}`);
              }
            }
          } else {
            console.log(`   ℹ️  HTTP/HTTPS сервис не обнаружен`);
          }
        });
      } else {
        console.log(`\n❌ Открытых портов не обнаружено`);
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
  }
  // Подозрительные порты (часто используемые для вредоносной активности)
  private readonly suspiciousPorts = [4444, 5555, 6666, 6667, 12345, 31337];

  /**
   * Главная функция для сканирования портов
   * @param scanDto - DTO с IP адресом и опциональными параметрами
   * @returns Результат сканирования портов с информацией о фаерволе
   */
  async scanPorts(scanDto: ScanPortsDto): Promise<ScanPortsResult> {
    const { ip, ports, timeout = 1000, batchSize = 500, scanAllPorts = true } = scanDto;

    // Валидация IP адреса
    if (!this.isValidIP(ip)) {
      throw new Error(`Invalid IP address: ${ip}`);
    }

    // Определяем список портов для сканирования
    let portsToScan: number[];
    if (ports && ports.length > 0) {
      portsToScan = ports;
    } else if (scanAllPorts) {
      // Генерируем все порты от 1 до 65535
      portsToScan = Array.from({ length: 65535 }, (_, i) => i + 1);
    } else {
      portsToScan = this.commonPorts;
    }

    console.log(`Начинаем сканирование ${portsToScan.length} портов на IP ${ip}...`);

    // Сканируем порты батчами для оптимизации
    const results: PortScanResult[] = [];
    const totalBatches = Math.ceil(portsToScan.length / batchSize);

    for (let i = 0; i < portsToScan.length; i += batchSize) {
      const batch = portsToScan.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`Сканируем батч ${batchNumber}/${totalBatches} (порты ${batch[0]}-${batch[batch.length - 1]})...`);
      
      const scanPromises = batch.map(port => this.scanPort(ip, port, timeout));
      const batchResults = await Promise.all(scanPromises);
      results.push(...batchResults);

      // Выводим прогресс
      const openPorts = results.filter(r => r.status === 'open').length;
      console.log(`Прогресс: ${results.length}/${portsToScan.length} портов просканировано. Открытых портов: ${openPorts}`);
    }

    // Проверяем открытые порты на наличие HTTP/HTTPS сервисов
    console.log('Проверяем открытые порты на наличие HTTP/HTTPS сервисов...');
    const openPortsResults = results.filter(r => r.status === 'open');
    for (const result of openPortsResults) {
      const httpInfo = await this.checkHttpService(ip, result.port, timeout);
      if (httpInfo) {
        result.httpInfo = httpInfo;
        console.log(`Порт ${result.port}: обнаружен ${httpInfo.protocol.toUpperCase()} сервис (${httpInfo.server || 'неизвестный сервер'})`);
      }
    }

    // Анализируем результаты для определения фаервола
    const firewallInfo = this.analyzeFirewall(results);

    // Подсчитываем статистику
    const summary = {
      totalScanned: results.length,
      open: results.filter(r => r.status === 'open').length,
      closed: results.filter(r => r.status === 'closed').length,
      filtered: results.filter(r => r.status === 'filtered').length,
      errors: results.filter(r => r.status === 'error').length
    };

    return {
      ip,
      scanDate: new Date().toISOString(),
      ports: results,
      firewall: firewallInfo,
      summary
    };
  }

  /**
   * Сканирует один порт
   */
  private async scanPort(ip: string, port: number, timeout: number): Promise<PortScanResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();

      // Устанавливаем таймаут (для закрытых портов используем меньший таймаут для ускорения)
      const effectiveTimeout = timeout;
      socket.setTimeout(effectiveTimeout);

      socket.on('connect', () => {
        const responseTime = Date.now() - startTime;
        socket.destroy();
        resolve({
          port,
          status: 'open',
          service: this.portServices[port],
          responseTime
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        // Если таймаут, порт может быть заблокирован фаерволом
        resolve({
          port,
          status: 'filtered',
          service: this.portServices[port]
        });
      });

      socket.on('error', (err: NodeJS.ErrnoException) => {
        socket.destroy();
        
        // Определяем статус порта на основе кода ошибки
        let status: 'closed' | 'filtered' | 'error' = 'closed';
        let errorMessage: string | undefined;

        if (err.code === 'ECONNREFUSED') {
          status = 'closed';
        } else if (err.code === 'ETIMEDOUT' || err.code === 'EHOSTUNREACH') {
          status = 'filtered';
        } else {
          status = 'error';
          errorMessage = err.message;
        }

        resolve({
          port,
          status,
          service: this.portServices[port],
          error: errorMessage
        });
      });

      // Пытаемся подключиться
      socket.connect(port, ip);
    });
  }

  /**
   * Анализирует результаты сканирования для определения наличия фаервола
   */
  private analyzeFirewall(results: PortScanResult[]): FirewallInfo {
    const openPorts = results.filter(r => r.status === 'open').map(r => r.port);
    const closedPorts = results.filter(r => r.status === 'closed').map(r => r.port);
    const filteredPorts = results.filter(r => r.status === 'filtered').map(r => r.port);

    // Если много портов имеют статус 'filtered', вероятно есть фаервол
    const hasFirewall = filteredPorts.length > openPorts.length + closedPorts.length / 2;

    // Определяем подозрительные порты
    const suspiciousPorts = results
      .filter(r => 
        r.status === 'open' && 
        (this.suspiciousPorts.includes(r.port) || !this.portServices[r.port])
      )
      .map(r => r.port);

    return {
      hasFirewall,
      filteredPorts,
      openPorts,
      closedPorts,
      suspiciousPorts: suspiciousPorts.length > 0 ? suspiciousPorts : undefined
    };
  }

  /**
   * Проверяет наличие HTTP/HTTPS сервиса на порту
   */
  private async checkHttpService(ip: string, port: number, timeout: number): Promise<HttpServiceInfo | null> {
    // Сначала пробуем HTTPS
    const httpsInfo = await this.tryHttps(ip, port, timeout);
    if (httpsInfo) {
      return httpsInfo;
    }

    // Затем пробуем HTTP
    const httpInfo = await this.tryHttp(ip, port, timeout);
    if (httpInfo) {
      return httpInfo;
    }

    return null;
  }

  /**
   * Пытается подключиться по HTTPS
   */
  private async tryHttps(ip: string, port: number, timeout: number): Promise<HttpServiceInfo | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const options = {
        hostname: ip,
        port: port,
        path: '/',
        method: 'GET',
        timeout: timeout,
        rejectUnauthorized: false, // Игнорируем ошибки сертификата для сканирования
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PortScanner/1.0)',
          'Accept': '*/*'
        }
      };

      const req = https.request(options, async (res) => {
        const responseTime = Date.now() - startTime;
        const headers: Record<string, string> = {};
        
        // Собираем все заголовки
        Object.keys(res.headers).forEach(key => {
          const value = res.headers[key];
          headers[key] = Array.isArray(value) ? value.join(', ') : value || '';
        });

        // Получаем информацию о сертификате
        const socket = res.socket as tls.TLSSocket;
        let certificateInfo: CertificateInfo | undefined;
        if (socket && socket.getPeerCertificate) {
          try {
            const cert = socket.getPeerCertificate(true);
            if (cert && Object.keys(cert).length > 0) {
              certificateInfo = await this.analyzeCertificate(cert);
            }
          } catch (err) {
            // Игнорируем ошибки получения сертификата
          }
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
          // Ограничиваем размер тела ответа
          if (body.length > 10000) {
            res.destroy();
          }
        });

        res.on('end', () => {
          // Извлекаем title из HTML если есть
          let title: string | undefined;
          if (body) {
            const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
              title = titleMatch[1].trim();
            }
          }

          resolve({
            protocol: 'https',
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            server: res.headers['server'] as string,
            poweredBy: res.headers['x-powered-by'] as string,
            contentType: res.headers['content-type'] as string,
            title,
            headers,
            certificateInfo
          });
        });
      });

      req.on('error', () => {
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    });
  }

  /**
   * Пытается подключиться по HTTP
   */
  private async tryHttp(ip: string, port: number, timeout: number): Promise<HttpServiceInfo | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const options = {
        hostname: ip,
        port: port,
        path: '/',
        method: 'GET',
        timeout: timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PortScanner/1.0)',
          'Accept': '*/*'
        }
      };

      const req = http.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        const headers: Record<string, string> = {};
        
        // Собираем все заголовки
        Object.keys(res.headers).forEach(key => {
          const value = res.headers[key];
          headers[key] = Array.isArray(value) ? value.join(', ') : value || '';
        });

        // Проверяем редирект
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
          const location = res.headers['location'] as string;
          if (location) {
            resolve({
              protocol: 'http',
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              server: res.headers['server'] as string,
              poweredBy: res.headers['x-powered-by'] as string,
              contentType: res.headers['content-type'] as string,
              redirectUrl: location,
              headers
            });
            res.destroy();
            return;
          }
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
          // Ограничиваем размер тела ответа
          if (body.length > 10000) {
            res.destroy();
          }
        });

        res.on('end', () => {
          // Извлекаем title из HTML если есть
          let title: string | undefined;
          if (body) {
            const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
              title = titleMatch[1].trim();
            }
          }

          resolve({
            protocol: 'http',
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            server: res.headers['server'] as string,
            poweredBy: res.headers['x-powered-by'] as string,
            contentType: res.headers['content-type'] as string,
            title,
            headers
          });
        });
      });

      req.on('error', () => {
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    });
  }

  /**
   * Анализирует SSL/TLS сертификат
   */
  private async analyzeCertificate(cert: tls.PeerCertificate): Promise<CertificateInfo> {
    try {
      const now = new Date();
      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);
      const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = now > validTo;
      const isExpiringSoon = !isExpired && daysUntilExpiry < 30;

      // Парсим subject и issuer
      const parseDN = (dn: string | undefined): string => {
        if (!dn) return 'Не указано';
        if (typeof dn !== 'string') return 'Не указано';
        // Формат: /CN=example.com/O=Organization
        const parts = dn.split('/').filter(p => p);
        return parts.join(', ') || dn;
      };

      // Извлекаем SAN (Subject Alternative Names)
      let san: string[] | undefined;
      if (cert.subjectaltname) {
        let sanStr = '';
        if (typeof cert.subjectaltname === 'string') {
          sanStr = cert.subjectaltname;
        } else {
          // subjectaltname может быть массивом строк
          const sanArray = cert.subjectaltname as unknown;
          if (Array.isArray(sanArray)) {
            sanStr = (sanArray as string[]).join(', ');
          }
        }
        
        if (sanStr) {
          san = sanStr
            .split(',')
            .map(name => name.trim())
            .filter(name => name.length > 0);
        }
      }

      const subjectStr = typeof cert.subject === 'string' ? cert.subject : '';
      const issuerStr = typeof cert.issuer === 'string' ? cert.issuer : '';

      return {
        subject: parseDN(subjectStr),
        issuer: parseDN(issuerStr),
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        daysUntilExpiry,
        isExpired,
        isExpiringSoon,
        fingerprint: cert.fingerprint256 || cert.fingerprint || 'Неизвестно',
        serialNumber: cert.serialNumber || 'Неизвестно',
        algorithm: 'Неизвестно', // signatureAlgorithm не доступен в PeerCertificate
        keySize: cert.modulus ? cert.modulus.length * 8 : undefined,
        san
      };
    } catch (error) {
      return {
        subject: 'Ошибка при анализе',
        issuer: 'Ошибка при анализе',
        validFrom: '',
        validTo: '',
        daysUntilExpiry: 0,
        isExpired: false,
        isExpiringSoon: false,
        fingerprint: '',
        serialNumber: '',
        algorithm: '',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Валидация IP адреса
   */
  private isValidIP(ip: string): boolean {
    // Простая валидация IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) {
      return false;
    }

    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
}

