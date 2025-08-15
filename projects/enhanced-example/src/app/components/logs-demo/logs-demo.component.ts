import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OpenTelemetryLogsService, TraceContextService } from '../../../../../opentelemetry-interceptor/src/public-api';

@Component({
  selector: 'app-logs-demo',
  template: `
    <div class="container">
      <h1>Logs Demo</h1>
      <p>Demonstrate OpenTelemetry logs with automatic trace correlation</p>
      
      <div class="demo-section">
        <h2>Basic Logging</h2>
        <div class="button-group">
          <button (click)="logDebug()" class="btn btn-debug">Debug Log</button>
          <button (click)="logInfo()" class="btn btn-info">Info Log</button>
          <button (click)="logWarn()" class="btn btn-warn">Warning Log</button>
          <button (click)="logError()" class="btn btn-error">Error Log</button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Logs with Context</h2>
        <div class="button-group">
          <button (click)="logWithAttributes()" class="btn btn-primary">Log with Attributes</button>
          <button (click)="logUserAction()" class="btn btn-primary">Log User Action</button>
          <button (click)="logBusinessEvent()" class="btn btn-primary">Log Business Event</button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Trace Correlation Demo</h2>
        <p>These logs will automatically include trace_id and span_id from HTTP requests</p>
        <div class="button-group">
          <button (click)="makeHttpRequestWithLogs()" class="btn btn-success">HTTP Request + Logs</button>
          <button (click)="simulateWorkflow()" class="btn btn-success">Simulate Workflow</button>
          <button (click)="testTraceCorrelation()" class="btn btn-info">Test Trace Fix</button>
          <button (click)="testPhase2Enhancement()" class="btn btn-warning">Test Phase 2 (Enhanced)</button>
        </div>
      </div>

      <div class="demo-section">
        <h2>PII Redaction Demo</h2>
        <p>These logs will have sensitive data automatically redacted</p>
        <div class="button-group">
          <button (click)="logWithPII()" class="btn btn-warning">Log with PII (redacted)</button>
          <button (click)="logSensitiveData()" class="btn btn-warning">Log Sensitive Data</button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Console Bridge Demo</h2>
        <p>These console calls are automatically captured as OTEL logs</p>
        <div class="button-group">
          <button (click)="useConsoleLog()" class="btn btn-secondary">console.log</button>
          <button (click)="useConsoleWarn()" class="btn btn-secondary">console.warn</button>
          <button (click)="useConsoleError()" class="btn btn-secondary">console.error</button>
        </div>
      </div>

      <div class="instructions">
        <h3>Check the Results:</h3>
        <ul>
          <li><strong>Browser Console:</strong> See console output with OTEL log formatting</li>
          <li><strong>Network Tab:</strong> Check HTTP requests to /v1/logs endpoint</li>
          <li><strong>OTEL Collector:</strong> If running, logs will be sent to collector</li>
          <li><strong>Trace Correlation:</strong> Each log includes trace_id and span_id</li>
        </ul>
      </div>

      <div class="back-nav">
        <a routerLink="/" class="btn btn-outline">Back to Home</a>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }
    
    .demo-section {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #007bff;
    }
    
    .demo-section h2 {
      margin-top: 0;
      color: #333;
    }
    
    .button-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 15px 0;
    }
    
    .btn {
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
    }
    
    .btn-debug { background: #6c757d; color: white; }
    .btn-info { background: #17a2b8; color: white; }
    .btn-warn { background: #ffc107; color: black; }
    .btn-error { background: #dc3545; color: white; }
    .btn-primary { background: #007bff; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-warning { background: #fd7e14; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-outline { background: transparent; border: 2px solid #007bff; color: #007bff; }
    
    .btn:hover {
      opacity: 0.8;
      transform: translateY(-1px);
    }
    
    .instructions {
      background: #e8f5e9;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    
    .instructions h3 {
      color: #2e7d32;
      margin-top: 0;
    }
    
    .instructions ul {
      margin: 10px 0;
    }
    
    .back-nav {
      text-align: center;
      margin: 40px 0;
    }
  `]
})
export class LogsDemoComponent implements OnInit {
  
  constructor(
    private otelLogs: OpenTelemetryLogsService,
    private http: HttpClient,
    private traceContext: TraceContextService
  ) {}

  ngOnInit() {
    this.otelLogs.info('Logs Demo component initialized', {
      component: 'LogsDemoComponent',
      route: '/logs',
      timestamp: new Date().toISOString()
    });
  }

  // Basic logging methods (Enhanced with Phase 2)
  logDebug() {
    // Use enhanced trace context for UI interactions
    this.traceContext.withTraceContext('debug-log-action', () => {
      this.otelLogs.debug('This is a debug message (Phase 2 Enhanced)', {
        level: 'debug',
        source: 'user-interaction',
        buttonClicked: 'debug-log',
        enhancement: 'phase2-trace-context'
      });
    }, {
      'ui.action': 'debug-log-button',
      'ui.component': 'logs-demo'
    });
  }

  logInfo() {
    // Use enhanced trace context for UI interactions
    this.traceContext.withTraceContext('info-log-action', () => {
      this.otelLogs.info('This is an info message (Phase 2 Enhanced)', {
        level: 'info',
        source: 'user-interaction',
        buttonClicked: 'info-log',
        enhancement: 'phase2-trace-context'
      });
    }, {
      'ui.action': 'info-log-button',
      'ui.component': 'logs-demo'
    });
  }

  logWarn() {
    // Use enhanced trace context for UI interactions
    this.traceContext.withTraceContext('warn-log-action', () => {
      this.otelLogs.warn('This is a warning message (Phase 2 Enhanced)', {
        level: 'warn',
        source: 'user-interaction',
        buttonClicked: 'warn-log',
        potential_issue: 'demonstration-warning',
        enhancement: 'phase2-trace-context'
      });
    }, {
      'ui.action': 'warn-log-button',
      'ui.component': 'logs-demo'
    });
  }

  logError() {
    // Use enhanced trace context for UI interactions
    this.traceContext.withTraceContext('error-log-action', () => {
      this.otelLogs.error('This is an error message (Phase 2 Enhanced)', {
        level: 'error',
        source: 'user-interaction',
        buttonClicked: 'error-log',
        error_type: 'demonstration-error',
        enhancement: 'phase2-trace-context'
      });
    }, {
      'ui.action': 'error-log-button',
      'ui.component': 'logs-demo'
    });
  }

  // Logging with rich context
  logWithAttributes() {
    // Use enhanced trace context for UI interactions
    this.traceContext.withTraceContext('log-with-attributes', () => {
      this.otelLogs.info('User performed action with rich context (Phase 2 Enhanced)', {
        userId: 'demo-user-123',
        sessionId: 'session-' + Math.random().toString(36).substr(2, 9),
        action: 'log-with-attributes',
        timestamp: new Date().toISOString(),
        browser: navigator.userAgent,
        url: window.location.href,
        enhancement: 'phase2-trace-context',
        metadata: {
          demo: true,
          version: '1.0.0'
        }
      });
    }, {
      'ui.action': 'log-with-attributes-button',
      'ui.component': 'logs-demo',
      'ui.session': 'demo-session'
    });
  }

  logUserAction() {
    // Use enhanced trace context for UI interactions
    this.traceContext.withTraceContext('user-action-log', () => {
      this.otelLogs.info('User action: button click (Phase 2 Enhanced)', {
        user: {
          id: 'demo-user-123',
          role: 'demo-user',
          preferences: { theme: 'light', language: 'en' }
        },
        action: {
          type: 'click',
          target: 'log-user-action-button',
          category: 'user-interaction'
        },
        context: {
          page: '/logs',
          section: 'logs-demo',
          timestamp: Date.now()
        },
        enhancement: 'phase2-trace-context'
      });
    }, {
      'ui.action': 'user-action-button',
      'ui.component': 'logs-demo',
      'user.id': 'demo-user-123'
    });
  }

  logBusinessEvent() {
    // Use enhanced trace context for UI interactions
    this.traceContext.withTraceContext('business-event-log', () => {
      this.otelLogs.info('Business event: demo interaction (Phase 2 Enhanced)', {
        event: {
          type: 'demo_interaction',
          category: 'engagement',
          value: 1
        },
        metrics: {
          session_duration: Math.floor(Math.random() * 300000), // 0-5 minutes
          page_views: Math.floor(Math.random() * 10) + 1,
          interactions: Math.floor(Math.random() * 50) + 1
        },
        business: {
          feature: 'logs-demo',
          experiment: 'enhanced-otel',
          cohort: 'demo-users'
        },
        enhancement: 'phase2-trace-context'
      });
    }, {
      'ui.action': 'business-event-button',
      'ui.component': 'logs-demo',
      'business.event': 'demo_interaction'
    });
  }

  // Test Phase 2 enhanced trace correlation
  testPhase2Enhancement() {
    this.otelLogs.info('Testing Phase 2: Enhanced trace correlation for UI interactions');

    // Test 1: Manual trace context for UI interaction
    this.traceContext.withTraceContext('ui-button-click', () => {
      this.otelLogs.info('PHASE 2 - UI INTERACTION: This should have trace_id and span_id', {
        test: 'phase2-enhancement',
        scenario: 'ui-interaction-with-manual-trace',
        timestamp: new Date().toISOString()
      });

      // Test nested async operation within trace context
      setTimeout(() => {
        this.otelLogs.info('PHASE 2 - ASYNC WITHIN TRACE: This should still have trace correlation', {
          test: 'phase2-enhancement',
          scenario: 'async-within-trace-context',
          timestamp: new Date().toISOString()
        });
      }, 50);
    }, {
      'ui.component': 'logs-demo',
      'ui.action': 'phase2-test-button',
      'ui.user_id': 'demo-user'
    });

    // Test 2: Enhanced logging methods with trace context
    this.logWithEnhancedTrace();

    // Test 3: Async operation with manual trace
    this.testAsyncWithTrace();
  }

  // Enhanced logging with manual trace context
  private logWithEnhancedTrace() {
    this.traceContext.withTraceContext('enhanced-logging', () => {
      this.otelLogs.info('PHASE 2 - ENHANCED LOGGING: Manual trace context applied', {
        test: 'phase2-enhancement',
        scenario: 'enhanced-logging-method',
        features: ['manual-trace', 'ui-correlation', 'async-support']
      });
    }, {
      'operation.type': 'enhanced-logging',
      'operation.category': 'demo'
    });
  }

  // Test async operations with trace context
  private async testAsyncWithTrace() {
    try {
      await this.traceContext.withTraceContextAsync('async-operation', async () => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.otelLogs.info('PHASE 2 - ASYNC OPERATION: Trace context preserved in async', {
          test: 'phase2-enhancement',
          scenario: 'async-operation-with-trace',
          duration_ms: 100
        });

        // Test multiple async operations
        await Promise.all([
          this.simulateAsyncTask('task-1', 50),
          this.simulateAsyncTask('task-2', 75),
          this.simulateAsyncTask('task-3', 25)
        ]);

        this.otelLogs.info('PHASE 2 - PARALLEL ASYNC: All parallel tasks completed', {
          test: 'phase2-enhancement',
          scenario: 'parallel-async-operations',
          tasks_completed: 3
        });
      }, {
        'async.operation': 'parallel-tasks',
        'async.task_count': 3
      });
    } catch (error) {
      this.otelLogs.error('Phase 2 async test failed', {
        test: 'phase2-enhancement',
        error: error
      });
    }
  }

  // Simulate an async task within trace context
  private async simulateAsyncTask(taskId: string, delayMs: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    this.otelLogs.info(`PHASE 2 - ASYNC TASK: ${taskId} completed`, {
      test: 'phase2-enhancement',
      scenario: 'individual-async-task',
      task_id: taskId,
      duration_ms: delayMs
    });
  }

  // Test trace correlation fix
  testTraceCorrelation() {
    this.otelLogs.info('Testing trace correlation fix - making HTTP request...');
    
    this.http.get('https://jsonplaceholder.typicode.com/posts/1').subscribe({
      next: (data) => {
        this.otelLogs.info('INSIDE HTTP REQUEST: This should have trace_id and span_id', {
          test: 'trace-correlation-fix',
          location: 'inside-http-observable',
          timestamp: new Date().toISOString()
        });
        
        // Test async scenario
        setTimeout(() => {
          this.otelLogs.info('ASYNC AFTER HTTP: This might not have trace_id (timing dependent)', {
            test: 'trace-correlation-fix',
            location: 'async-after-http',
            timestamp: new Date().toISOString()
          });
        }, 10);
      },
      error: (error) => {
        this.otelLogs.error('HTTP request failed during trace test', {
          test: 'trace-correlation-fix',
          error: error.message
        });
      }
    });
    
    // Test outside HTTP context
    setTimeout(() => {
      this.otelLogs.info('OUTSIDE HTTP CONTEXT: This should NOT have trace_id', {
        test: 'trace-correlation-fix',
        location: 'outside-http-context',
        timestamp: new Date().toISOString()
      });
    }, 100);
  }

  // HTTP requests with logging
  makeHttpRequestWithLogs() {
    this.otelLogs.info('Making HTTP request with trace correlation');
    
    // This will create a span, and subsequent logs will include the trace context
    this.http.get('https://jsonplaceholder.typicode.com/posts/1').subscribe({
      next: (data) => {
        this.otelLogs.info('HTTP request successful', {
          endpoint: '/posts/1',
          method: 'GET',
          status: 'success',
          responseSize: JSON.stringify(data).length
        });
      },
      error: (error) => {
        this.otelLogs.error('HTTP request failed', {
          endpoint: '/posts/1',
          method: 'GET',
          status: 'error',
          error: error.message
        });
      }
    });
  }

  simulateWorkflow() {
    this.otelLogs.info('Starting workflow simulation');
    
    // Simulate a multi-step workflow
    setTimeout(() => {
      this.otelLogs.info('Workflow step 1: Initialize', {
        workflow: 'demo-workflow',
        step: 1,
        status: 'success'
      });
      
      setTimeout(() => {
        this.otelLogs.info('Workflow step 2: Process data', {
          workflow: 'demo-workflow',
          step: 2,
          status: 'success',
          processed_items: 42
        });
        
        setTimeout(() => {
          this.otelLogs.info('Workflow completed successfully', {
            workflow: 'demo-workflow',
            step: 3,
            status: 'completed',
            total_duration: 1500,
            success_rate: 100
          });
        }, 500);
      }, 500);
    }, 500);
  }

  // PII redaction demo
  logWithPII() {
    this.otelLogs.info('Processing user data with PII', {
      user_email: 'john.doe@example.com', // This will be redacted
      user_phone: '123-45-6789', // This will be redacted
      user_ssn: '123-45-6789', // This will be redacted
      user_name: 'John Doe', // This will NOT be redacted
      processing_status: 'success'
    });
  }

  logSensitiveData() {
    this.otelLogs.warn('Handling sensitive data', {
      action: 'data_processing',
      credit_card: '4532-1234-5678-9012', // This will be redacted
      email: 'user@company.com', // This will be redacted
      safe_data: {
        user_id: 'user123',
        session_id: 'sess456',
        action_type: 'payment_processing'
      }
    });
  }

  // Console bridge demo
  useConsoleLog() {
    console.log('This console.log is captured by OTEL logs bridge', {
      source: 'console.log',
      captured_by: 'otel-bridge',
      demo: true
    });
  }

  useConsoleWarn() {
    console.warn('This console.warn is captured by OTEL logs bridge', {
      source: 'console.warn',
      captured_by: 'otel-bridge',
      demo: true
    });
  }

  useConsoleError() {
    console.error('This console.error is captured by OTEL logs bridge', {
      source: 'console.error',
      captured_by: 'otel-bridge',
      demo: true
    });
  }
}