import { Module } from "@nestjs/common";
import { ProccesorService } from "./services/proccesor.service";
import { LogAnalysisController } from "./controllers/log-analysis.controller";
import { TelegramModule } from "../telegram/telegram.module";

@Module({
    imports: [TelegramModule],
    controllers: [LogAnalysisController],
    providers: [ProccesorService],
    exports: [ProccesorService]
})
export class ProccesorModule {}