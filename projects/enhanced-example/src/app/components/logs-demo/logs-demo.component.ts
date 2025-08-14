import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OpenTelemetryLogsService } from '../../../../../opentelemetry-interceptor/src/public-api';

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
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.otelLogs.info('Logs Demo component initialized', {
      component: 'LogsDemoComponent',
      route: '/logs',
      timestamp: new Date().toISOString()
    });
  }

  // Basic logging methods
  logDebug() {
    this.otelLogs.debug('This is a debug message', {
      level: 'debug',
      source: 'user-interaction',
      buttonClicked: 'debug-log'
    });
  }

  logInfo() {
    this.otelLogs.info('This is an info message', {
      level: 'info',
      source: 'user-interaction',
      buttonClicked: 'info-log'
    });
  }

  logWarn() {
    this.otelLogs.warn('This is a warning message', {
      level: 'warn',
      source: 'user-interaction',
      buttonClicked: 'warn-log',
      potential_issue: 'demonstration-warning'
    });
  }

  logError() {
    this.otelLogs.error('This is an error message', {
      level: 'error',
      source: 'user-interaction',
      buttonClicked: 'error-log',
      error_type: 'demonstration-error'
    });
  }

  // Logging with rich context
  logWithAttributes() {
    this.otelLogs.info('User performed action with rich context', {
      userId: 'demo-user-123',
      sessionId: 'session-' + Math.random().toString(36).substr(2, 9),
      action: 'log-with-attributes',
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      url: window.location.href,
      metadata: {
        demo: true,
        version: '1.0.0'
      }
    });
  }

  logUserAction() {
    this.otelLogs.info('User action: button click', {
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
      }
    });
  }

  logBusinessEvent() {
    this.otelLogs.info('Business event: demo interaction', {
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
      }
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