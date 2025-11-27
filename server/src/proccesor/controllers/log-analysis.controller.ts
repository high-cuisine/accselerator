import { Controller, Post, Body } from '@nestjs/common';
import { ProccesorService } from '../services/proccesor.service';
import { TelegramService } from '../../telegram/services/telegram.service';
import { AnalyzeLogsDto, LogAnalysisResult } from '../dto/log-analysis.dto';

@Controller('logs')
export class LogAnalysisController {
  constructor(
    private readonly proccesorService: ProccesorService,
    private readonly telegramService: TelegramService
  ) {}

  @Post('analyze')
  async analyzeLogs(@Body() logsDto: AnalyzeLogsDto): Promise<string> {

    console.log('new request');
    this.proccesorService.analyzeLogs(logsDto).then(result => {
      if (result.patterns && result.patterns.length > 0) {
        const significantThreats = result.patterns.filter(
          pattern => pattern.severity === 'Critical' || pattern.severity === 'High' || pattern.severity === 'Medium'
        );
        
        // Отправляем только если есть серьезные угрозы
        if (significantThreats.length > 0) {
          const filteredResult = {
            ...result,
            patterns: significantThreats,
            summary: {
              ...result.summary,
              threatsFound: significantThreats.length,
              lowCount: 0 // Не учитываем Low в отправке
            }
          };
          this.telegramService.sendSecurityAlert(filteredResult);
        }
      }
    });
    
    
    
    return 'ok';
  }
}

