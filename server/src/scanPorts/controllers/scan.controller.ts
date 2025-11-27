import { Body, Controller, Post } from "@nestjs/common";
import { ScanPortsDto, ScanPortsResult } from "../dto/scan-ports.dto";
import { PortScannerService } from "../services/port-scanner.service";

@Controller('scans')
export class ScanController {
    constructor(private readonly portScannerService: PortScannerService) {}

    @Post('scan')
    async scanPorts(@Body() scanDto: ScanPortsDto): Promise<ScanPortsResult> {
        return this.portScannerService.scanPorts(scanDto);
    }
}