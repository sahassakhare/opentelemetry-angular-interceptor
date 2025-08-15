/**
 * Span Timeout Management - Usage Examples
 * 
 * This file demonstrates how to use the comprehensive span timeout mechanism
 * to prevent memory leaks from unclosed spans in your Angular applications.
 */

import { Component, Injectable, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, Subscription } from 'rxjs';
import { TraceContextService, SpanType } from './lib/services/trace-context.service';
import { SpanTimeoutManager } from './lib/services/span-timeout-manager.service';
import { OpenTelemetryConfig } from './lib/configuration/opentelemetry-config';

/**
 * Example 1: Basic Configuration
 * Configure span timeouts in your OpenTelemetry configuration
 */
export const exampleConfig: OpenTelemetryConfig = {
  commonConfig: {
    serviceName: 'my-angular-app',
    console: true,
    production: false
  },
  
  // NEW: Span timeout configuration
  spanTimeout: {
    enabled: true,
    httpTimeoutMs: 30000,        // 30 seconds for HTTP requests
    uiTimeoutMs: 10000,          // 10 seconds for UI interactions
    manualTimeoutMs: 60000,      // 60 seconds for manual spans
    leakDetectionIntervalMs: 60000,  // Check for leaks every minute
    memoryMonitoring: true,
    maxActiveSpans: 1000         // Maximum concurrent spans
  },
  
  otelcolConfig: {
    url: 'http://localhost:4318/v1/traces'
  }
};

/**
 * Example 2: Using TraceContextService with timeout management
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  
  constructor(
    private traceContext: TraceContextService,
    private http: HttpClient
  ) {}

  // UI interaction with automatic timeout management
  searchUsers(query: string): Observable<any[]> {
    return this.traceContext.withTraceContextAsync(
      'user-search',
      async () => {
        // This span will automatically timeout after 10 seconds (UI default)
        // or you can specify custom timeout: 
        // async () => { ... }, { query }, 15000
        console.log('Searching for users:', query);
        const results = await this.http.get<any[]>(`/api/users/search?q=${query}`).toPromise();
        return results || [];
      },
      { query, operation: 'search' } // Additional attributes
    );
  }

  // Manual span with custom timeout
  processUserData(userData: any[]): Promise<any[]> {
    const span = this.traceContext.createManualSpan(
      'process-user-data',
      { userCount: userData.length },
      120000 // Custom 2-minute timeout
    );

    if (!span) return Promise.resolve(userData);

    return new Promise((resolve, reject) => {
      try {
        // Simulate long-running operation
        setTimeout(() => {
          span.setAttributes({ processed: true });
          this.traceContext.endSpan(span); // Manual cleanup
          resolve(userData.map(user => ({ ...user, processed: true })));
        }, 5000);
      } catch (error) {
        span.recordException(error as Error);
        this.traceContext.endSpan(span); // Cleanup on error
        reject(error);
      }
    });
  }
}

/**
 * Example 3: Component with span management and monitoring
 */
@Component({
  selector: 'app-dashboard',
  template: `
    <div>
      <h2>Dashboard</h2>
      <div>Active Spans: {{stats.activeSpansCount}}</div>
      <div>Memory Usage: {{stats.memoryUsageBytes | number}} bytes</div>
      <div>Total Spans: {{stats.totalSpansCreated}}</div>
      <div>Timed Out: {{stats.totalSpansTimedOut}}</div>
      <div>Leaked: {{stats.leakedSpansDetected}}</div>
      
      <button (click)="performOperation()">Start Operation</button>
      <button (click)="updateTimeouts()">Update Timeouts</button>
      <button (click)="toggleTimeout()">Toggle Timeout Management</button>
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  stats = {
    activeSpansCount: 0,
    totalSpansCreated: 0,
    totalSpansCompleted: 0,
    totalSpansTimedOut: 0,
    leakedSpansDetected: 0,
    memoryUsageBytes: 0
  };

  private statsSubscription?: Subscription;

  constructor(
    private traceContext: TraceContextService,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Monitor span statistics every 5 seconds
    this.statsSubscription = interval(5000).subscribe(() => {
      this.stats = this.traceContext.getTimeoutStats();
    });
  }

  ngOnDestroy() {
    this.statsSubscription?.unsubscribe();
  }

  performOperation() {
    // This will be automatically tracked and timed out if it takes too long
    this.traceContext.withTraceContext(
      'dashboard-operation',
      () => {
        console.log('Performing dashboard operation...');
        // Simulate work
        for (let i = 0; i < 1000000; i++) {
          Math.random();
        }
        return 'Operation completed';
      },
      { operationType: 'dashboard', complexity: 'high' }
    );
  }

  updateTimeouts() {
    // Dynamically update timeout configurations
    this.traceContext.updateSpanTimeout(SpanType.HTTP, 45000);  // 45 seconds for HTTP
    this.traceContext.updateSpanTimeout(SpanType.UI, 15000);    // 15 seconds for UI
    this.traceContext.updateSpanTimeout(SpanType.MANUAL, 90000); // 90 seconds for manual
    console.log('Timeout configurations updated');
  }

  toggleTimeout() {
    // Enable/disable timeout management dynamically
    const currentStats = this.traceContext.getTimeoutStats();
    this.traceContext.setTimeoutEnabled(!currentStats.activeSpansCount);
    console.log('Timeout management toggled');
  }
}

/**
 * Example 4: Advanced usage with HTTP interceptor integration
 * 
 * HTTP requests are automatically managed by the interceptor, but you can
 * monitor and configure their timeout behavior:
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) {}

  // HTTP spans are automatically tracked by the interceptor
  // They will timeout after 30 seconds by default (configurable via spanTimeout.httpTimeoutMs)
  fetchData(): Observable<any> {
    return this.http.get('/api/data');
  }

  // For very long-running HTTP operations, you might want to create manual spans
  uploadLargeFile(file: File): Observable<any> {
    // This creates a manual span that can have a longer timeout
    const span = this.traceContext.createManualSpan(
      'file-upload',
      { 
        fileName: file.name, 
        fileSize: file.size,
        fileType: file.type 
      },
      300000 // 5 minutes timeout for large file upload
    );

    // The HTTP request will have its own span (managed by interceptor)
    // but this manual span tracks the entire upload operation
    return this.http.post('/api/upload', file).pipe(
      tap(result => {
        if (span) {
          span.addEvent('upload-completed', { result: 'success' });
          this.traceContext.endSpan(span);
        }
      }),
      catchError(error => {
        if (span) {
          span.recordException(error);
          this.traceContext.endSpan(span);
        }
        throw error;
      })
    );
  }
}

/**
 * Example 5: Memory leak prevention patterns
 */
@Injectable({
  providedIn: 'root'
})
export class LeakPreventionService {

  constructor(private traceContext: TraceContextService) {}

  // BAD: This can cause memory leaks if the span is never ended
  badExample() {
    const span = this.traceContext.createManualSpan('risky-operation');
    // ... do work but forget to end span
    // span.end(); // <-- Missing!
  }

  // GOOD: Always use try/finally or the convenience methods
  goodExample1() {
    const span = this.traceContext.createManualSpan('safe-operation');
    try {
      // ... do work
      span?.setStatus({ code: 1 });
    } catch (error) {
      span?.recordException(error as Error);
      span?.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      if (span) {
        this.traceContext.endSpan(span); // Always cleanup
      }
    }
  }

  // BEST: Use the convenience methods which handle cleanup automatically
  bestExample() {
    return this.traceContext.withTraceContext(
      'best-practice-operation',
      () => {
        // ... do work
        // Span is automatically cleaned up even if an error occurs
        return 'success';
      }
    );
  }

  // For async operations
  async bestAsyncExample() {
    return await this.traceContext.withTraceContextAsync(
      'async-operation',
      async () => {
        // ... do async work
        await new Promise(resolve => setTimeout(resolve, 1000));
        return 'async success';
      }
    );
  }
}

/**
 * Example Configuration in AppModule
 */
/*
import { NgModule } from '@angular/core';
import { OpenTelemetryInterceptorModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'my-app'
      },
      spanTimeout: {
        enabled: true,
        httpTimeoutMs: 30000,
        uiTimeoutMs: 10000,
        manualTimeoutMs: 60000,
        memoryMonitoring: true
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      }
    })
  ]
})
export class AppModule { }
*/