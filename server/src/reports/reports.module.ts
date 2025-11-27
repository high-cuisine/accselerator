import { Module } from '@nestjs/common';
import { ReportController } from './controllers/report.controller';
import { PdfReportService } from './services/pdf-report.service';

@Module({
  controllers: [ReportController],
  providers: [PdfReportService],
  exports: [PdfReportService],
})
export class ReportsModule {}

