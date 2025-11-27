import { Injectable, OnModuleInit } from "@nestjs/common";
import { systemPrompt } from "../constants/system.prompt";
import OpenAI from "openai";
import { ChatMsg } from "../interface/chat.interface";
import tools from "../tools/tools";
import { LlmResponseDto } from "../dto/llm-response.dto";
import { findServicePrompt } from "../constants/findService.prompt";
import { findDoctorPrompt } from "../constants/findDoctorPrompt.prompt";
import { logAnalysisPrompt } from "../constants/logAnalysis.prompt";
import { portAnalysisPrompt } from "../constants/portAnalysis.prompt";
import { AnalyzeLogsDto, LogAnalysisResult } from "../dto/log-analysis.dto";
import { PortAnalysisResult } from "../dto/port-analysis.dto";
import { ScanPortsResult } from "../../scanPorts/dto/scan-ports.dto";

@Injectable()
export class ProccesorService {

    private readonly openai: OpenAI | null;
    telegramService: any;
    constructor(
    ) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({
                apiKey: apiKey,
            });
        } else {
            console.warn('OPENAI_API_KEY not set. OpenAI features will be disabled.');
            this.openai = null;
        }
    }

    

    async sendMessage(messages: ChatMsg[]) {
        if (!this.openai) {
            throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
        }

        // Валидация сообщений
        const validMessages = messages.filter(msg => msg.role && msg.content);
        
        if (validMessages.length === 0) {
            throw new Error('No valid messages provided');
        }
        
        const messagesReq = [{ role: 'system', content: systemPrompt }, ...validMessages];
        
        // Отладочная информация
        console.log('Final messages array:', JSON.stringify(messagesReq, null, 2));
        
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messagesReq as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
            tools: tools as OpenAI.Chat.Completions.ChatCompletionTool[],
            tool_choice: "auto"
        }) as LlmResponseDto;
        
        if(response.choices[0].message.tool_calls) {
            return { type: response.choices[0].message.tool_calls[0].function.name, content: ''}
        }

        return {type: 'text', content: response.choices[0].message.content};
    }

    async analyzeLogs(logsDto: AnalyzeLogsDto): Promise<LogAnalysisResult> {
        if (!this.openai) {
            throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
        }

        if (!logsDto.logs || logsDto.logs.length === 0) {
            throw new Error('No logs provided for analysis');
        }

        // Формируем строку с логами для анализа
        const logsString = logsDto.logs
            .map((log, index) => {
                const logEntry = {
                    index: index + 1,
                    timestamp: log.timestamp,
                    level: log.level,
                    message: log.message,
                    ip: log.ip,
                    method: log.method,
                    path: log.path,
                    statusCode: log.statusCode,
                    userAgent: log.userAgent,
                    ...Object.fromEntries(
                        Object.entries(log).filter(([key]) => 
                            !['timestamp', 'level', 'message', 'ip', 'method', 'path', 'statusCode', 'userAgent'].includes(key)
                        )
                    )
                };
                return JSON.stringify(logEntry, null, 2);
            })
            .join('\n\n---\n\n');

        const userMessage = `Проанализируйте следующие логи на предмет угроз безопасности (DDoS, попытки взлома, ошибки):

${logsString}

Всего логов для анализа: ${logsDto.logs.length}`;

        const messagesReq = [
            { role: 'system', content: logAnalysisPrompt },
            { role: 'user', content: userMessage }
        ];

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messagesReq as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
            response_format: { type: "json_object" },
          
        }, {
            timeout: 120000 // Дополнительный таймаут на уровне запроса
        }) as LlmResponseDto;

        const content = response.choices[0].message.content;
        
        if (!content) {
            throw new Error('Empty response from LLM');
        }

        try {
            const analysisResult = JSON.parse(content) as LogAnalysisResult;
            console.log('Analysis result:', analysisResult);
            return analysisResult;
        } catch (error) {
            console.error('Failed to parse LLM response:', content);
            throw new Error('Failed to parse analysis result from LLM');
        }
    }

    async analyzePorts(scanResult: ScanPortsResult): Promise<PortAnalysisResult> {
        if (!this.openai) {
            throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
        }

        // Формируем данные для анализа
        const analysisData = {
            ip: scanResult.ip,
            scanDate: scanResult.scanDate,
            summary: scanResult.summary,
            firewall: scanResult.firewall,
            openPorts: scanResult.ports
                .filter(p => p.status === 'open')
                .map(p => ({
                    port: p.port,
                    service: p.service,
                    httpInfo: p.httpInfo ? {
                        protocol: p.httpInfo.protocol,
                        server: p.httpInfo.server,
                        poweredBy: p.httpInfo.poweredBy,
                        certificateInfo: p.httpInfo.certificateInfo ? {
                            isExpired: p.httpInfo.certificateInfo.isExpired,
                            isExpiringSoon: p.httpInfo.certificateInfo.isExpiringSoon,
                            daysUntilExpiry: p.httpInfo.certificateInfo.daysUntilExpiry,
                            subject: p.httpInfo.certificateInfo.subject
                        } : undefined
                    } : undefined
                })),
            suspiciousPorts: scanResult.firewall.suspiciousPorts || []
        };

        const userMessage = `Проанализируйте результаты сканирования портов на предмет проблем безопасности:

${JSON.stringify(analysisData, null, 2)}

Всего просканировано портов: ${scanResult.summary.totalScanned}
Открытых портов: ${scanResult.summary.open}`;

        const messagesReq = [
            { role: 'system', content: portAnalysisPrompt },
            { role: 'user', content: userMessage }
        ];

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messagesReq as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
            response_format: { type: "json_object" }
        }, {
            timeout: 120000
        }) as LlmResponseDto;

        const content = response.choices[0].message.content;
        
        if (!content) {
            throw new Error('Empty response from LLM');
        }

        try {
            const analysisResult = JSON.parse(content) as PortAnalysisResult;
            console.log('Port analysis result:', analysisResult);
            return analysisResult;
        } catch (error) {
            console.error('Failed to parse LLM response:', content);
            throw new Error('Failed to parse port analysis result from LLM');
        }
    }
}
