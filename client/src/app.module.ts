import { Module } from '@nestjs/common';
import { LogReaderModule } from './log-reader/log-reader.module';

@Module({
  imports: [LogReaderModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
