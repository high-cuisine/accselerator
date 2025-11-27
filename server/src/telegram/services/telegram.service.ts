import { Injectable, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { SendMessageDto, TelegramConfig } from '../dto/telegram-message.dto';
import { ScanPortsResult } from '../../scanPorts/dto/scan-ports.dto';
import { PortAnalysisResult } from '../../proccesor/dto/port-analysis.dto';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly config: TelegramConfig;
  private readonly httpClient: AxiosInstance;
  private readonly apiUrl: string;

  constructor() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const defaultChatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not set. Telegram alerts will be disabled.');
    }
    if (!defaultChatId) {
      console.warn('TELEGRAM_CHAT_ID not set. Telegram alerts will be disabled.');
    }

    this.config = {
      botToken: botToken || '',
      defaultChatId: defaultChatId || ''
    };

    this.apiUrl = `https://api.telegram.org/bot${this.config.botToken}`;

    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async onModuleInit() {
    if (this.config.botToken && this.config.defaultChatId) {
      console.log('Telegram Service initialized');
      console.log(`Default chat ID: ${this.config.defaultChatId}`);
      
      // Проверяем доступность бота
      try {
        const me = await this.httpClient.get('/getMe');
        console.log(`Telegram bot connected: @${me.data.result.username}`);

        const currentTime = new Date().toLocaleString('ru-RU', {
          timeZone: 'Europe/Moscow',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

//         this.sendMessage({
//           chatId: '1042650482',
//           text: `🚨 <b>КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: Обнаружены угрозы безопасности!</b>


// 📊 <b>ОБЩАЯ СТАТИСТИКА АНАЛИЗА</b>


// 📅 <b>Время обнаружения:</b> ${currentTime}
// 📈 <b>Всего обработано логов:</b> <code>22</code>
// ⚠️ <b>Найдено угроз:</b> <b>1</b>

// <b>Распределение по критичности:</b>
// 🔴 <b>Критические:</b> <code>1</code>
// 🟠 Высокие: <code>0</code>
// 🟡 Средние: <code>0</code>
// 🟢 Низкие: <code>0</code>


// 🔍 <b>ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ОБ УГРОЗАХ</b>


// 🔴 <b>DDoS Атака</b> [<code>CRITICAL</code>]

// <b>📋 Описание угрозы:</b>
// Обнаружен потенциал распределенной атаки типа DDoS (Distributed Denial of Service) с аномально высокими значениями входящего трафика. Система зафиксировала пиковую нагрузку в <b>1200 запросов в секунду</b>, что значительно превышает нормальные показатели.

// <b>🌐 Характеристики атаки:</b>
// • Источник: множественные IP-адреса из различных географических регионов
// • Тип трафика: HTTP/HTTPS запросы
// • Продолжительность: активная фаза
// • Статус защиты: активированы протоколы митигации

// <b>📊 Статистика обнаружения:</b>
// • Количество инцидентов: <code>1</code>
// • Время первого обнаружения: <code>2025-11-14 18:00:10 UTC</code>
// • Уровень угрозы: <code>КРИТИЧЕСКИЙ</code>

// <b>📝 Примеры логов:</b>
// <code>2025-11-14T18:00:10Z WARN [System] High number of requests detected: 1200 requests per second</code>

// <code>2025-11-14T18:00:10Z WARN [System] Server under potential DDoS attack, activating mitigation protocols...</code>

// <b>🛡️ Рекомендации по устранению:</b>
// 1. <b>Немедленные действия:</b>
//    • Усилить меры по защите от DDoS-атак на уровне сетевой инфраструктуры
//    • Активировать дополнительные фильтры и rate limiting правила
//    • Проверить и обновить конфигурацию WAF (Web Application Firewall)

// 2. <b>Анализ и оптимизация:</b>
//    • Провести детальный анализ источников атаки и паттернов запросов
//    • Оптимизировать обработку большого количества одновременных запросов
//    • Рассмотреть возможность масштабирования ресурсов для обработки пиковых нагрузок

// 3. <b>Мониторинг:</b>
//    • Настроить автоматические алерты при превышении пороговых значений
//    • Внедрить систему непрерывного мониторинга сетевого трафика
//    • Регулярно проверять логи на наличие подозрительной активности


// ⚡ <b>СТАТУС СИСТЕМЫ</b>


// ✅ Система мониторинга: <b>Активна</b>
// 🔄 Автоматическая защита: <b>Включена</b>
// 📡 Канал уведомлений: <b>Telegram</b>

// <i>Это автоматическое сообщение системы безопасности. Для получения дополнительной информации обратитесь к администратору.</i>`,
//           parseMode: 'HTML'
//         })
      } catch (error) {
        console.error('Failed to connect to Telegram bot:', error);
      }
    } else {
      console.warn('Telegram bot not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.');
    }
  }

  /**
   * Отправляет сообщение в Telegram
   */
  async sendMessage(dto: SendMessageDto): Promise<boolean> {
    if (!this.config.botToken) {
      console.warn('Telegram bot token not configured. Message not sent.');
      return false;
    }

    const chatId = dto.chatId || this.config.defaultChatId;
    
    if (!chatId) {
      console.warn('Telegram chat ID not configured. Message not sent.');
      return false;
    }

    try {
      const response = await this.httpClient.post('/sendMessage', {
        chat_id: chatId,
        text: dto.text,
        parse_mode: dto.parseMode || 'HTML',
        disable_notification: dto.disableNotification || false,
      });

      console.log(`Telegram message sent to chat ${chatId}`);
      return true;
    } catch (error: any) {
      console.error('Failed to send Telegram message:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Отправляет алерт о найденных угрозах безопасности
   */
  async sendSecurityAlert(analysisResult: any, chatId?: string): Promise<boolean> {
    if (!analysisResult || !analysisResult.patterns || analysisResult.patterns.length === 0) {
      return false;
    }

    const patterns = analysisResult.patterns;
    const summary = analysisResult.summary;

    let message = `🚨 <b>Обнаружены угрозы безопасности!</b>\n\n`;
    message += `📊 <b>Статистика:</b>\n`;
    message += `Всего логов: ${summary.totalLogs}\n`;
    message += `Найдено угроз: ${summary.threatsFound}\n`;
    message += `Критических: ${summary.criticalCount}\n`;
    message += `Высоких: ${summary.highCount}\n`;
    message += `Средних: ${summary.mediumCount}\n`;
    message += `Низких: ${summary.lowCount}\n\n`;

    message += `🔍 <b>Обнаруженные паттерны:</b>\n\n`;

    patterns.forEach((pattern: any, index: number) => {
      const severityEmoji = this.getSeverityEmoji(pattern.severity);
      message += `${severityEmoji} <b>${pattern.type}</b> (${pattern.severity})\n`;
      message += `   Описание: ${pattern.description}\n`;
      message += `   Количество: ${pattern.count}\n`;
      
      if (pattern.examples && pattern.examples.length > 0) {
        message += `   Примеры:\n`;
        pattern.examples.slice(0, 2).forEach((example: string) => {
          const shortExample = example.length > 100 ? example.substring(0, 100) + '...' : example;
          message += `   • <code>${this.escapeHtml(shortExample)}</code>\n`;
        });
      }
      
      if (pattern.recommendations && pattern.recommendations.length > 0) {
        message += `   Рекомендации:\n`;
        pattern.recommendations.slice(0, 2).forEach((rec: string) => {
          message += `   • ${rec}\n`;
        });
      }
      
      message += `\n`;
    });

    return await this.sendMessage({
      chatId: chatId || this.config.defaultChatId,
      text: message,
      parseMode: 'HTML',
      disableNotification: summary.criticalCount > 0 || summary.highCount > 0, // Уведомление только для критических/высоких
    });
  }

  /**
   * Отправляет алерт о проблемах с портами
   */
  async sendPortSecurityAlert(scanResult: ScanPortsResult, analysisResult: PortAnalysisResult, chatId?: string): Promise<boolean> {
    if (!analysisResult || !analysisResult.problems || analysisResult.problems.length === 0) {
      return false;
    }

    const problems = analysisResult.problems;
    const summary = analysisResult.summary;

    let message = `🔒 <b>Обнаружены проблемы безопасности портов!</b>\n\n`;
    message += `🌐 <b>IP адрес:</b> ${scanResult.ip}\n`;
    message += `📅 <b>Дата сканирования:</b> ${new Date(scanResult.scanDate).toLocaleString('ru-RU')}\n\n`;
    
    message += `📊 <b>Статистика сканирования:</b>\n`;
    message += `Всего портов: ${scanResult.summary.totalScanned}\n`;
    message += `Открытых: ${scanResult.summary.open}\n`;
    message += `Фаервол: ${scanResult.firewall.hasFirewall ? 'Обнаружен' : 'Не обнаружен'}\n\n`;

    message += `⚠️ <b>Найдено проблем:</b> ${summary.problemsFound}\n`;
    message += `Критических: ${summary.criticalCount}\n`;
    message += `Высоких: ${summary.highCount}\n`;
    message += `Средних: ${summary.mediumCount}\n`;
    message += `Низких: ${summary.lowCount}\n\n`;

    message += `🔍 <b>Обнаруженные проблемы:</b>\n\n`;

    problems.forEach((problem: any, index: number) => {
      const severityEmoji = this.getSeverityEmoji(problem.severity);
      message += `${severityEmoji} <b>${problem.type}</b> (${problem.severity})\n`;
      message += `   Описание: ${problem.description}\n`;
      message += `   Порты: ${problem.ports.join(', ')}\n`;
      
      if (problem.recommendations && problem.recommendations.length > 0) {
        message += `   Рекомендации:\n`;
        problem.recommendations.forEach((rec: string) => {
          message += `   • ${rec}\n`;
        });
      }
      
      message += `\n`;
    });

    return await this.sendMessage({
      chatId: chatId || this.config.defaultChatId,
      text: message,
      parseMode: 'HTML',
      disableNotification: summary.criticalCount === 0 && summary.highCount === 0, // Уведомление только для критических/высоких
    });
  }

  /**
   * Отправляет простое текстовое сообщение
   */
  async sendText(text: string, chatId?: string): Promise<boolean> {
    return await this.sendMessage({
      chatId: chatId || this.config.defaultChatId,
      text,
      parseMode: 'HTML',
    });
  }

  /**
   * Получает эмодзи для уровня серьезности
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'Critical':
        return '🔴';
      case 'High':
        return '🟠';
      case 'Medium':
        return '🟡';
      case 'Low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  /**
   * Экранирует HTML символы
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

