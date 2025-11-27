import { Module } from '@nestjs/common';
import { LogReaderService } from './services/log-reader.service';

@Module({
  imports: [],
  providers: [LogReaderService],
  exports: [LogReaderService],
})
export class LogReaderModule {}

