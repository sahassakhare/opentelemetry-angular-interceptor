import { Injectable, ErrorHandler, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { OpenTelemetryLogsService } from './logs.service';

@Injectable({
  providedIn: 'root'
})
export class OpenTelemetryErrorHandler implements ErrorHandler {
  private isInitialized = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() private logger: OpenTelemetryLogsService | null
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeGlobalErrorHandling();
    }
  }

  /**
   * Handle Angular errors
   */
  handleError(error: any): void {
    try {
      // Log the error
      this.logError(error, { 
        source: 'angular-error-handler',
        type: 'angular-error'
      });

      // Mark current span as error if available
      this.markSpanAsError(error);

    } catch (loggingError) {
      console.error('Error while logging error:', loggingError);
    }

    // Re-throw for default Angular error handling
    console.error('Angular Error:', error);
  }

  /**
   * Initialize global error handlers for unhandled promises and JavaScript errors
   */
  private initializeGlobalErrorHandling(): void {
    if (this.isInitialized || !isPlatformBrowser(this.platformId)) {
      return;
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason, {
        source: 'unhandled-promise-rejection',
        type: 'promise-rejection',
        promiseRejection: true
      });

      this.markSpanAsError(event.reason);
    });

    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      const error = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      };

      this.logError(error, {
        source: 'global-javascript-error',
        type: 'javascript-error',
        uncaughtError: true
      });

      this.markSpanAsError(event.error || error);
    });

    this.isInitialized = true;
    console.log('✅ Global error handlers initialized');
  }

  /**
   * Log error with context
   */
  private logError(error: any, context: Record<string, any>): void {
    if (!this.logger) return;

    let errorMessage = 'Unknown error';
    let errorDetails: any = {};

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = error.message || JSON.stringify(error);
      errorDetails = error;
    }

    this.logger.error(errorMessage, {
      ...context,
      error: errorDetails,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  /**
   * Mark current active span as error
   */
  private markSpanAsError(error: any): void {
    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        activeSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error)
        });

        activeSpan.recordException(error instanceof Error ? error : new Error(String(error)));
      }
    } catch (spanError) {
      console.warn('Failed to mark span as error:', spanError);
    }
  }
}