import { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';

/**
 * Composite SpanExporter that forwards spans to multiple underlying exporters
 * Supports both parallel and fallback strategies
 */
export class CompositeSpanExporter implements SpanExporter {
  
  constructor(
    private exporters: SpanExporter[],
    private strategy: 'parallel' | 'fallback' = 'parallel'
  ) {}

  /**
   * Export spans to all configured exporters
   */
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this.exporters.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    if (this.strategy === 'parallel') {
      this.exportParallel(spans, resultCallback);
    } else {
      this.exportFallback(spans, resultCallback);
    }
  }

  /**
   * Export to all exporters in parallel
   * Success if at least one succeeds, failure if all fail
   */
  private exportParallel(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
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
            error: lastError || new Error('All exporters failed')
          });
        }
      }
    };

    // Start all exports
    this.exporters.forEach(exporter => {
      try {
        exporter.export(spans, handleResult);
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
  private exportFallback(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    let currentIndex = 0;

    const tryNextExporter = () => {
      if (currentIndex >= this.exporters.length) {
        resultCallback({ 
          code: ExportResultCode.FAILED, 
          error: new Error('All fallback exporters failed')
        });
        return;
      }

      const exporter = this.exporters[currentIndex];
      currentIndex++;

      try {
        exporter.export(spans, (result) => {
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
        console.warn('Error shutting down exporter:', error);
      })
    );

    await Promise.allSettled(shutdownPromises);
  }

  /**
   * Force flush all exporters
   */
  async forceFlush(): Promise<void> {
    const flushPromises = this.exporters.map(exporter => 
      exporter.forceFlush().catch(error => {
        console.warn('Error flushing exporter:', error);
      })
    );

    await Promise.allSettled(flushPromises);
  }
}