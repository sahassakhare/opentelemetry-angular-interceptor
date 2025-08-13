import { RetryConfig } from '../configuration/opentelemetry-config';

export class RetryableExporter {
  private readonly config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxAttempts: config.maxAttempts ?? 3,
      initialDelayMs: config.initialDelayMs ?? 1000,
      maxDelayMs: config.maxDelayMs ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      jitter: {
        enabled: config.jitter?.enabled ?? true,
        type: config.jitter?.type ?? 'full',
        maxJitterMs: config.jitter?.maxJitterMs ?? 5000
      }
    };
  }

  /**
   * Execute a function with retry logic and jitter
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'export'
  ): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }

        const delay = this.calculateDelayWithJitter(attempt);
        
        console.warn(
          `🔄 ${context} attempt ${attempt}/${this.config.maxAttempts} failed, retrying in ${delay}ms:`,
          error
        );

        await this.sleep(delay);
      }
    }

    throw new Error(
      `${context} failed after ${this.config.maxAttempts} attempts. Last error: ${lastError?.message}`
    );
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelayWithJitter(attempt: number): number {
    // Base exponential backoff delay
    const baseDelay = Math.min(
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1),
      this.config.maxDelayMs
    );

    if (!this.config.jitter.enabled) {
      return baseDelay;
    }

    return this.applyJitter(baseDelay);
  }

  /**
   * Apply different jitter strategies
   */
  private applyJitter(baseDelay: number): number {
    const maxJitter = Math.min(this.config.jitter.maxJitterMs || 5000, baseDelay);

    switch (this.config.jitter.type) {
      case 'full':
        // Full jitter: random delay between 0 and baseDelay
        return Math.random() * baseDelay;
      
      case 'equal':
        // Equal jitter: baseDelay/2 + random(0, baseDelay/2)
        const halfDelay = baseDelay / 2;
        return halfDelay + Math.random() * halfDelay;
      
      case 'decorrelated':
        // Decorrelated jitter: random between initialDelay and (baseDelay * 3)
        const minDelay = this.config.initialDelayMs;
        const maxDelay = Math.min(baseDelay * 3, this.config.maxDelayMs);
        return minDelay + Math.random() * (maxDelay - minDelay);
      
      default:
        return baseDelay;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return true;
    }
    
    // HTTP status codes that should be retried
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    if (error.status && retryableStatusCodes.includes(error.status)) {
      return true;
    }

    // Don't retry on 4xx client errors (except 408, 429)
    if (error.status && error.status >= 400 && error.status < 500) {
      return false;
    }

    return true;
  }
}

/**
 * Wrapper for OTLP exporters with retry logic
 */
export class RetryableOTLPExporter {
  private retryHandler: RetryableExporter;

  constructor(
    private exporter: any,
    retryConfig?: RetryConfig
  ) {
    this.retryHandler = new RetryableExporter(retryConfig);
  }

  async export(items: any[], resultCallback: (result: any) => void): Promise<void> {
    try {
      await this.retryHandler.executeWithRetry(
        () => new Promise<void>((resolve, reject) => {
          this.exporter.export(items, (result: any) => {
            if (result.code === 0) { // SUCCESS
              resolve();
            } else {
              reject(new Error(`Export failed with code ${result.code}: ${result.error}`));
            }
          });
        }),
        'OTLP export'
      );
      
      resultCallback({ code: 0 });
    } catch (error) {
      console.error('❌ OTLP export failed after all retries:', error);
      resultCallback({ 
        code: 1, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.exporter.forceFlush?.() || Promise.resolve();
  }
}

/**
 * Wrapper for OTLP metric exporters with retry logic
 */
export class RetryableOTLPMetricExporter {
  private retryHandler: RetryableExporter;

  constructor(
    private exporter: any,
    retryConfig?: RetryConfig
  ) {
    this.retryHandler = new RetryableExporter(retryConfig);
  }

  async export(metrics: any, resultCallback: (result: any) => void): Promise<void> {
    try {
      await this.retryHandler.executeWithRetry(
        () => new Promise<void>((resolve, reject) => {
          this.exporter.export(metrics, (result: any) => {
            if (result.code === 0) { // SUCCESS
              resolve();
            } else {
              reject(new Error(`Metric export failed with code ${result.code}: ${result.error}`));
            }
          });
        }),
        'OTLP metric export'
      );
      
      resultCallback({ code: 0 });
    } catch (error) {
      console.error('❌ OTLP metric export failed after all retries:', error);
      resultCallback({ 
        code: 1, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.exporter.forceFlush?.() || Promise.resolve();
  }
}