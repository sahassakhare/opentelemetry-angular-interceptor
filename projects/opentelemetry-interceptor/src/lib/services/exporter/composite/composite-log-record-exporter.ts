import { LogRecordExporter, LogRecord } from '@opentelemetry/sdk-logs';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';

/**
 * Composite LogRecordExporter that forwards logs to multiple underlying exporters
 * Supports both parallel and fallback strategies
 */
export class CompositeLogRecordExporter implements LogRecordExporter {
  
  constructor(
    private exporters: LogRecordExporter[],
    private strategy: 'parallel' | 'fallback' = 'parallel'
  ) {}

  /**
   * Export logs to all configured exporters
   */
  export(logs: LogRecord[], resultCallback: (result: ExportResult) => void): void {
    if (this.exporters.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    if (this.strategy === 'parallel') {
      this.exportParallel(logs, resultCallback);
    } else {
      this.exportFallback(logs, resultCallback);
    }
  }

  /**
   * Export to all exporters in parallel
   * Success if at least one succeeds, failure if all fail
   */
  private exportParallel(logs: LogRecord[], resultCallback: (result: ExportResult) => void): void {
    let completedCount = 0;
    let successCount = 0;
    let lastError: any;

    const handleResult = (result: ExportResult) => {
      completedCount++;
      
      if (result.code === ExportResultCode.SUCCESS) {
        successCount++;
      } else {
        lastError = result.error;
      }

      // All exporters completed
      if (completedCount === this.exporters.length) {
        if (successCount > 0) {
          resultCallback({ code: ExportResultCode.SUCCESS });
        } else {
          resultCallback({ 
            code: ExportResultCode.FAILED, 
            error: lastError || new Error('All log exporters failed')
          });
        }
      }
    };

    // Start all exports
    this.exporters.forEach(exporter => {
      try {
        exporter.export(logs, handleResult);
      } catch (error) {
        handleResult({ 
          code: ExportResultCode.FAILED, 
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    });
  }

  /**
   * Export to exporters in sequence, stopping on first success
   * Used for fallback scenarios
   */
  private exportFallback(logs: LogRecord[], resultCallback: (result: ExportResult) => void): void {
    let currentIndex = 0;

    const tryNextExporter = () => {
      if (currentIndex >= this.exporters.length) {
        resultCallback({ 
          code: ExportResultCode.FAILED, 
          error: new Error('All fallback log exporters failed')
        });
        return;
      }

      const exporter = this.exporters[currentIndex];
      currentIndex++;

      try {
        exporter.export(logs, (result) => {
          if (result.code === ExportResultCode.SUCCESS) {
            resultCallback(result);
          } else {
            // Try next exporter
            tryNextExporter();
          }
        });
      } catch (error) {
        // Try next exporter on exception
        tryNextExporter();
      }
    };

    tryNextExporter();
  }

  /**
   * Shutdown all exporters
   */
  async shutdown(): Promise<void> {
    const shutdownPromises = this.exporters.map(exporter => 
      exporter.shutdown().catch(error => {
        console.warn('Error shutting down log exporter:', error);
      })
    );

    await Promise.allSettled(shutdownPromises);
  }

  /**
   * Force flush all exporters
   */
  async forceFlush(): Promise<void> {
    if (this.exporters.some(exporter => 'forceFlush' in exporter)) {
      const flushPromises = this.exporters.map(exporter => {
        if ('forceFlush' in exporter && typeof exporter.forceFlush === 'function') {
          return (exporter as any).forceFlush().catch((error: any) => {
            console.warn('Error flushing log exporter:', error);
          });
        }
        return Promise.resolve();
      });

      await Promise.allSettled(flushPromises);
    }
  }
}