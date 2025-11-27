import { Injectable, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { LogEntry, AnalyzeLogsDto } from '../dto/log-entry.dto';
import { LogReaderState, FileState } from '../dto/log-reader-state.dto';

@Injectable()
export class LogReaderService implements OnModuleInit {
  private readonly logsPath: string;
  private readonly serverUrl: string;
  private readonly batchSize: number;
  private readonly watchInterval: number;
  private readonly httpClient: AxiosInstance;
  private readonly stateFilePath: string;
  private state: LogReaderState;

  constructor() {
    // Получаем путь к логам из переменной окружения или используем дефолтный
    // Для локальной разработки используем относительный путь, для Docker - абсолютный
    const defaultPath = process.env.NODE_ENV === 'production' ? '/app/logs' : path.join(process.cwd(), 'logs');
    this.logsPath = process.env.LOGS_PATH || defaultPath;
    this.serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    this.batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
    this.watchInterval = parseInt(process.env.WATCH_INTERVAL || '5000', 10);
    
    // Путь к файлу состояния
    const stateDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    this.stateFilePath = path.join(stateDir, '.log-reader-state.json');
    
    // Загружаем состояние
    this.state = this.loadState();
    
    // Создаем HTTP клиент
    this.httpClient = axios.create({
      baseURL: this.serverUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async onModuleInit() {
    console.log(`Log Reader Service initialized`);
    console.log(`Logs path: ${this.logsPath}`);
    console.log(`Server URL: ${this.serverUrl}`);
    console.log(`Batch size: ${this.batchSize}`);
    console.log(`Watch interval: ${this.watchInterval}ms`);
    console.log(`State file: ${this.stateFilePath}`);
    console.log(`Loaded state for ${Object.keys(this.state.files).length} files`);

    // Проверяем существование папки с логами
    try {
      if (!fs.existsSync(this.logsPath)) {
        console.warn(`Logs directory does not exist: ${this.logsPath}`);
        console.warn(`Creating directory...`);
        fs.mkdirSync(this.logsPath, { recursive: true });
        console.log(`Directory created successfully`);
      } else {
        console.log(`Logs directory exists: ${this.logsPath}`);
      }
    } catch (error) {
      console.error(`Failed to create logs directory: ${error}`);
      console.error(`Will try to use existing directory or wait for it to be created`);
    }

    // Запускаем обработку логов
    this.startProcessing();
  }

  /**
   * Загружает состояние обработки из файла
   */
  private loadState(): LogReaderState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const content = fs.readFileSync(this.stateFilePath, 'utf-8');
        const state = JSON.parse(content) as LogReaderState;
        console.log(`State loaded from ${this.stateFilePath}`);
        return state;
      }
    } catch (error) {
      console.warn(`Failed to load state: ${error}. Starting with empty state.`);
    }
    
    return {
      files: {},
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Сохраняет состояние обработки в файл
   */
  private saveState(): void {
    try {
      this.state.lastUpdate = new Date().toISOString();
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to save state: ${error}`);
    }
  }

  /**
   * Получает состояние файла
   */
  private getFileState(filePath: string): FileState {
    if (!this.state.files[filePath]) {
      this.state.files[filePath] = {
        filePath,
        lastPosition: 0,
        lastSize: 0,
        lastProcessed: new Date().toISOString(),
        processedLines: 0
      };
    }
    return this.state.files[filePath];
  }

  /**
   * Обновляет состояние файла после обработки
   */
  private updateFileState(filePath: string, newPosition: number, newSize: number, processedLines: number): void {
    const fileState = this.getFileState(filePath);
    fileState.lastPosition = newPosition;
    fileState.lastSize = newSize;
    fileState.lastProcessed = new Date().toISOString();
    fileState.processedLines += processedLines;
    this.saveState();
  }

  /**
   * Запускает периодическую обработку логов
   */
  private startProcessing() {
    setInterval(async () => {
      try {
        await this.processLogs();
      } catch (error) {
        console.error('Error processing logs:', error);
      }
    }, this.watchInterval);
  }

  /**
   * Обрабатывает логи из папки
   */
  private async processLogs(): Promise<void> {
    const logFiles = this.getLogFiles();
    
    if (logFiles.length === 0) {
      return;
    }

    for (const filePath of logFiles) {
      try {
        await this.processLogFile(filePath);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
  }

  /**
   * Получает список файлов логов
   */
  private getLogFiles(): string[] {
    try {
      if (!fs.existsSync(this.logsPath)) {
        return [];
      }
      const files = fs.readdirSync(this.logsPath);
      return files
        .filter(file => {
          const filePath = path.join(this.logsPath, file);
          const stat = fs.statSync(filePath);
          return stat.isFile() && (file.endsWith('.log') || file.endsWith('.txt') || file.endsWith('.json'));
        })
        .map(file => path.join(this.logsPath, file));
    } catch (error) {
      console.error('Error reading logs directory:', error);
      return [];
    }
  }

  /**
   * Читает новые строки из файла начиная с указанной позиции
   */
  private readNewLines(filePath: string, startPosition: number): { content: string; newPosition: number } {
    try {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      // Если файл уменьшился (например, был перезаписан), начинаем с начала
      if (fileSize < startPosition) {
        console.log(`File ${filePath} was truncated or rewritten. Starting from beginning.`);
        startPosition = 0;
      }

      // Если нет новых данных
      if (fileSize === startPosition) {
        return { content: '', newPosition: startPosition };
      }

      // Открываем файл и читаем с нужной позиции
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(fileSize - startPosition);
      fs.readSync(fd, buffer, 0, buffer.length, startPosition);
      fs.closeSync(fd);

      const content = buffer.toString('utf-8');
      const newPosition = startPosition + buffer.length;

      return { content, newPosition };
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return { content: '', newPosition: startPosition };
    }
  }

  /**
   * Обрабатывает один файл логов (только новые строки)
   */
  private async processLogFile(filePath: string): Promise<void> {
    const fileState = this.getFileState(filePath);
    const stat = fs.statSync(filePath);
    const currentSize = stat.size;

    // Если файл не изменился, пропускаем
    if (currentSize === fileState.lastSize && fileState.lastPosition === currentSize) {
      return;
    }

    // Читаем только новые строки
    const { content, newPosition } = this.readNewLines(filePath, fileState.lastPosition);

    if (!content || content.trim().length === 0) {
      return;
    }

    console.log(`Processing new lines from ${filePath} (position ${fileState.lastPosition} -> ${newPosition})`);

    const logs = this.parseLogs(content);

    if (logs.length === 0) {
      // Обновляем позицию даже если нет логов (чтобы не перечитывать пустые строки)
      this.updateFileState(filePath, newPosition, currentSize, 0);
      return;
    }

    console.log(`Parsed ${logs.length} new log entries from ${filePath}`);

    // Разбиваем на batch и отправляем
    const batches = this.splitIntoBatches(logs, this.batchSize);
    console.log(`Split into ${batches.length} batches`);

    let totalProcessed = 0;
    for (let i = 0; i < batches.length; i++) {
      try {
        await this.sendBatch(batches[i], i + 1, batches.length);
        totalProcessed += batches[i].length;
        
        // Обновляем состояние после каждого успешного batch
        this.updateFileState(filePath, newPosition, currentSize, batches[i].length);
      } catch (error) {
        console.error(`Error sending batch ${i + 1}:`, error);
        // Не обновляем состояние при ошибке, чтобы повторить попытку
        throw error;
      }
    }

    console.log(`Successfully processed ${totalProcessed} log entries from ${filePath}`);
  }

  /**
   * Парсит логи из строки
   */
  private parseLogs(content: string): LogEntry[] {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const logs: LogEntry[] = [];

    for (const line of lines) {
      try {
        // Пытаемся распарсить как JSON
        const log = JSON.parse(line);
        logs.push(this.normalizeLogEntry(log));
      } catch {
        // Если не JSON, пытаемся распарсить как обычный лог
        const log = this.parseTextLog(line);
        if (log) {
          logs.push(log);
        }
      }
    }

    return logs;
  }

  /**
   * Нормализует запись лога
   */
  private normalizeLogEntry(log: any): LogEntry {
    return {
      timestamp: log.timestamp || log.time || log.date || new Date().toISOString(),
      level: log.level || log.severity || log.type || 'INFO',
      message: log.message || log.msg || log.text || JSON.stringify(log),
      ip: log.ip || log.clientIp || log.remoteAddress,
      method: log.method || log.httpMethod,
      path: log.path || log.url || log.route,
      statusCode: log.statusCode || log.status || log.code,
      userAgent: log.userAgent || log.user_agent || log.ua,
      ...log
    };
  }

  /**
   * Парсит текстовый лог (простой формат)
   */
  private parseTextLog(line: string): LogEntry | null {
    // Простой парсер для стандартных форматов логов
    // Пример: 2024-01-01 12:00:00 [INFO] Message
    const timestampRegex = /(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2})/;
    const levelRegex = /\[(ERROR|WARN|INFO|DEBUG|TRACE)\]/i;
    
    const timestampMatch = line.match(timestampRegex);
    const levelMatch = line.match(levelRegex);

    if (!timestampMatch && !levelMatch) {
      return null;
    }

    return {
      timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
      level: levelMatch ? levelMatch[1].toUpperCase() : 'INFO',
      message: line
    };
  }

  /**
   * Разбивает логи на batch
   */
  private splitIntoBatches(logs: LogEntry[], batchSize: number): LogEntry[][] {
    const batches: LogEntry[][] = [];
    
    for (let i = 0; i < logs.length; i += batchSize) {
      batches.push(logs.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Отправляет batch логов на server
   */
  private async sendBatch(batch: LogEntry[], batchNumber: number, totalBatches: number): Promise<void> {
    const dto: AnalyzeLogsDto = { logs: batch };
    
    console.log(`Sending batch ${batchNumber}/${totalBatches} (${batch.length} logs) to ${this.serverUrl}/logs/analyze`);

    try {
      const response = await this.httpClient.post('/logs/analyze', dto);

      console.log(`Batch ${batchNumber}/${totalBatches} processed successfully`);
      console.log(`Found ${response.data.summary?.threatsFound || 0} threats`);
      
      if (response.data.patterns && response.data.patterns.length > 0) {
        console.log('Security patterns detected:');
        response.data.patterns.forEach((pattern: any) => {
          console.log(`  - ${pattern.type} (${pattern.severity}): ${pattern.description}`);
        });
      }
    } catch (error: any) {
      console.error(`Failed to send batch ${batchNumber}:`, error.message);
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
      }
      throw error;
    }
  }
}
