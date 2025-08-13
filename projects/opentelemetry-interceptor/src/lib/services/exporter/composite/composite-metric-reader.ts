import { 
  MetricReader, 
  MetricProducer, 
  CollectionResult
} from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';

/**
 * Composite MetricReader that manages multiple underlying readers
 * Each reader operates independently with its own export schedule
 */
export class CompositeMetricReader extends MetricReader {
  
  constructor(private readers: MetricReader[]) {
    super();
  }

  /**
   * Set metric producer for all readers
   */
  setMetricProducer(metricProducer: MetricProducer): void {
    this.readers.forEach(reader => {
      reader.setMetricProducer(metricProducer);
    });
  }

  /**
   * Collect metrics from all readers
   * Note: This is typically not called directly as readers collect on their own schedules
   */
  protected async onCollect(): Promise<CollectionResult> {
    // For composite readers, we don't collect directly
    // Each reader handles its own collection and export
    return { resourceMetrics: { resource: new Resource({}), scopeMetrics: [] }, errors: [] };
  }

  /**
   * Force flush all readers
   */
  protected async onForceFlush(options?: any): Promise<void> {
    const flushPromises = this.readers.map(reader => 
      reader.forceFlush(options).catch(error => {
        console.warn('Error flushing metric reader:', error);
      })
    );

    await Promise.allSettled(flushPromises);
  }

  /**
   * Shutdown all readers
   */
  protected async onShutdown(options?: any): Promise<void> {
    const shutdownPromises = this.readers.map(reader => 
      reader.shutdown(options).catch(error => {
        console.warn('Error shutting down metric reader:', error);
      })
    );

    await Promise.allSettled(shutdownPromises);
  }

  /**
   * Get all underlying readers
   */
  getReaders(): MetricReader[] {
    return [...this.readers];
  }

  /**
   * Add a reader to the composite
   */
  addReader(reader: MetricReader): void {
    this.readers.push(reader);
    
    // If we already have a metric producer, set it on the new reader
    if ((this as any)._metricProducer) {
      reader.setMetricProducer((this as any)._metricProducer);
    }
  }

  /**
   * Remove a reader from the composite
   */
  async removeReader(reader: MetricReader): Promise<void> {
    const index = this.readers.indexOf(reader);
    if (index > -1) {
      this.readers.splice(index, 1);
      await reader.shutdown().catch(error => {
        console.warn('Error shutting down removed metric reader:', error);
      });
    }
  }
}