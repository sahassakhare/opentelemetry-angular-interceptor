import { Injectable } from '@angular/core';
import { LogRecordExporter } from '@opentelemetry/sdk-logs';
import { ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { ILogsExporter } from '../exporter.interface';

/**
 * OpenTelemetry Console Logs Exporter Service
 * Provides console exporter for logs
 */
@Injectable()
export class LogsConsoleExporterService implements ILogsExporter {
  
  /**
   * Create and configure console logs exporter
   * @returns LogRecordExporter configured for console output
   */
  getExporter(): LogRecordExporter {
    return new ConsoleLogRecordExporter();
  }
}