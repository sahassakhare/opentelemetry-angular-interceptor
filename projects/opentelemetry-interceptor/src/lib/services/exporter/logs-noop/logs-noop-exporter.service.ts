import { Injectable } from '@angular/core';
import { LogRecordExporter, LogRecord } from '@opentelemetry/sdk-logs';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ILogsExporter } from '../exporter.interface';

/**
 * No-op LogRecordExporter implementation
 * Discards all logs without processing them
 */
class NoopLogRecordExporter implements LogRecordExporter {
  
  export(logs: LogRecord[], resultCallback: (result: ExportResult) => void): void {
    // No-op: do nothing, just return success
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * OpenTelemetry No-op Logs Exporter Service
 * Provides a no-op exporter that discards all logs
 */
@Injectable()
export class LogsNoopExporterService implements ILogsExporter {
  
  /**
   * Create and configure no-op logs exporter
   * @returns LogRecordExporter that discards all logs
   */
  getExporter(): LogRecordExporter {
    return new NoopLogRecordExporter();
  }
}