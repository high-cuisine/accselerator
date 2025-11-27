import { Module } from '@nestjs/common';
import { PortScannerService } from './services/port-scanner.service';
import { ProccesorModule } from '../proccesor/proccesor.module';
import { TelegramModule } from '../telegram/telegram.module';
import { ScanController } from './controllers/scan.controller';

@Module({
  imports: [ProccesorModule, TelegramModule],
  providers: [PortScannerService],
  exports: [PortScannerService],
  controllers: [ScanController]
})
export class ScanPortsModule {}

