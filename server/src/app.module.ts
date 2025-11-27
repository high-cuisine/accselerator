import { Module } from '@nestjs/common';
import { ScanPortsModule } from './scanPorts/scan-ports.module';
import { ProccesorModule } from './proccesor/proccesor.module';
import { TelegramModule } from './telegram/telegram.module';
import { ReportsModule } from './reports/reports.module';
import { ScanController } from './scanPorts/controllers/scan.controller';

@Module({
  imports: [ScanPortsModule, ProccesorModule, TelegramModule, ReportsModule],
  controllers: [ScanController],
  providers: [],
})
export class AppModule {}
