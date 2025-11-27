import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PdfReportService } from '../services/pdf-report.service';
import { GenerateReportDto } from '../dto/generate-report.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly pdfReportService: PdfReportService) {}

  @Post('generate')
  async generateReport(
    @Body() dto: GenerateReportDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const pdfBuffer = await this.pdfReportService.generateReport(dto);

      const filename = `security-report-${new Date().toISOString().split('T')[0]}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Ошибка при генерации PDF отчета',
        error: error.message,
      });
    }
  }
}

