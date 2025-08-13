import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OpenTelemetryLogsService, OpenTelemetryMetricsService } from '../../../../opentelemetry-interceptor/src/public-api';

@Component({
  selector: 'app-error-demo',
  template: `
    <div class="container">
      <h1>Error Handling Demo</h1>
      <p>Demonstrate comprehensive error handling with OpenTelemetry integration</p>
      
      <div class="demo-section">
        <h2>Global Error Handler</h2>
        <p>These errors are automatically captured by the global error handler:</p>
        <div class="button-group">
          <button (click)="throwAngularError()" class="btn btn-danger">
            Throw Angular Error
          </button>
          <button (click)="throwJavaScriptError()" class="btn btn-danger">
            Throw JavaScript Error
          </button>
          <button (click)="triggerPromiseRejection()" class="btn btn-danger">
            Promise Rejection
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h2>HTTP Errors</h2>
        <p>HTTP errors are captured and logged with trace correlation:</p>
        <div class="button-group">
          <button (click)="trigger404Error()" class="btn btn-warning">
            404 Not Found
          </button>
          <button (click)="trigger500Error()" class="btn btn-warning">
            500 Server Error
          </button>
          <button (click)="triggerNetworkError()" class="btn btn-warning">
            Network Timeout
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Business Logic Errors</h2>
        <p>Custom business errors with structured logging:</p>
        <div class="button-group">
          <button (click)="simulateValidationError()" class="btn btn-info">
            Validation Error
          </button>
          <button (click)="simulateAuthError()" class="btn btn-info">
            Authentication Error
          </button>
          <button (click)="simulateBusinessRuleError()" class="btn btn-info">
            Business Rule Violation
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Error Recovery</h2>
        <p>Demonstrate error recovery patterns with logging:</p>
        <div class="button-group">
          <button (click)="attemptWithRetry()" class="btn btn-success">
            Retry Pattern
          </button>
          <button (click)="attemptWithFallback()" class="btn btn-success">
            Fallback Pattern
          </button>
          <button (click)="attemptWithCircuitBreaker()" class="btn btn-success">
            Circuit Breaker Pattern
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Error Context</h2>
        <p>Show rich error context in logs and metrics:</p>
        <div class="button-group">
          <button (click)="errorWithUserContext()" class="btn btn-secondary">
            Error with User Context
          </button>
          <button (click)="errorWithSystemContext()" class="btn btn-secondary">
            Error with System Context
          </button>
          <button (click)="errorWithBusinessContext()" class="btn btn-secondary">
            Error with Business Context
          </button>
        </div>
      </div>

      <div class="error-stats" *ngIf="errorStats.total > 0">
        <h3>Error Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <h4>Total Errors</h4>
            <p>{{ errorStats.total }}</p>
          </div>
          <div class="stat-card">
            <h4>HTTP Errors</h4>
            <p>{{ errorStats.http }}</p>
          </div>
          <div class="stat-card">
            <h4>Business Errors</h4>
            <p>{{ errorStats.business }}</p>
          </div>
          <div class="stat-card">
            <h4>JavaScript Errors</h4>
            <p>{{ errorStats.javascript }}</p>
          </div>
        </div>
      </div>

      <div class="demo-section recovery-section">
        <h2>Error Recovery Status</h2>
        <div class="recovery-status">
          <div class="status-item" [class.success]="recoveryStatus.retry" [class.failed]="!recoveryStatus.retry">
            <span class="status-icon">{{ recoveryStatus.retry ? 'Success' : 'Failed' }}</span>
            <span>Retry Pattern: {{ recoveryStatus.retry ? 'Success' : 'Not Attempted' }}</span>
          </div>
          <div class="status-item" [class.success]="recoveryStatus.fallback" [class.failed]="!recoveryStatus.fallback">
            <span class="status-icon">{{ recoveryStatus.fallback ? 'Success' : 'Failed' }}</span>
            <span>Fallback Pattern: {{ recoveryStatus.fallback ? 'Success' : 'Not Attempted' }}</span>
          </div>
          <div class="status-item" [class.success]="recoveryStatus.circuitBreaker" [class.failed]="!recoveryStatus.circuitBreaker">
            <span class="status-icon">{{ recoveryStatus.circuitBreaker ? 'Success' : 'Failed' }}</span>
            <span>Circuit Breaker: {{ recoveryStatus.circuitBreaker ? 'Success' : 'Not Attempted' }}</span>
          </div>
        </div>
      </div>

      <div class="instructions">
        <h3>What Happens When Errors Occur:</h3>
        <ul>
          <li><strong>Automatic Logging:</strong> All errors are logged with trace correlation</li>
          <li><strong>Span Marking:</strong> Current span is marked as error with exception event</li>
          <li><strong>Metrics Recording:</strong> Error counters are incremented by type</li>
          <li><strong>Context Preservation:</strong> Full context (user, system, business) is captured</li>
          <li><strong>Console Output:</strong> Errors appear in browser console with OTEL formatting</li>
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
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .demo-section {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #dc3545;
    }
    
    .recovery-section {
      border-left-color: #28a745;
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
    
    .btn-danger { background: #dc3545; color: white; }
    .btn-warning { background: #ffc107; color: black; }
    .btn-info { background: #17a2b8; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-outline { background: transparent; border: 2px solid #007bff; color: #007bff; }
    
    .btn:hover {
      opacity: 0.8;
      transform: translateY(-1px);
    }
    
    .error-stats {
      background: #ffe6e6;
      border: 1px solid #dc3545;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
    }
    
    .error-stats h3 {
      color: #dc3545;
      margin-top: 0;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }
    
    .stat-card {
      background: white;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .stat-card h4 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 0.9em;
    }
    
    .stat-card p {
      margin: 0;
      font-size: 1.5em;
      font-weight: bold;
      color: #dc3545;
    }
    
    .recovery-status {
      background: white;
      border-radius: 6px;
      padding: 15px;
      margin: 15px 0;
    }
    
    .status-item {
      display: flex;
      align-items: center;
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
      background: #f8f9fa;
    }
    
    .status-item.success {
      background: #d4edda;
      color: #155724;
    }
    
    .status-item.failed {
      background: #f8d7da;
      color: #721c24;
    }
    
    .status-icon {
      margin-right: 10px;
      font-weight: bold;
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
    
    .back-nav {
      text-align: center;
      margin: 40px 0;
    }
  `]
})
export class ErrorDemoComponent implements OnInit {
  
  errorStats = {
    total: 0,
    http: 0,
    business: 0,
    javascript: 0
  };

  recoveryStatus = {
    retry: false,
    fallback: false,
    circuitBreaker: false
  };

  constructor(
    private otelLogs: OpenTelemetryLogsService,
    private otelMetrics: OpenTelemetryMetricsService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.otelLogs.info('Error Demo component initialized', {
      component: 'ErrorDemoComponent',
      route: '/errors',
      purpose: 'demonstrate-error-handling'
    });
  }

  // Angular and JavaScript errors
  throwAngularError() {
    this.incrementErrorStats('javascript');
    throw new Error('Demo Angular error - this will be caught by the global error handler');
  }

  throwJavaScriptError() {
    this.incrementErrorStats('javascript');
    setTimeout(() => {
      throw new Error('Demo JavaScript error thrown asynchronously');
    }, 100);
  }

  triggerPromiseRejection() {
    this.incrementErrorStats('javascript');
    Promise.reject(new Error('Demo unhandled promise rejection'))
      .catch(() => {
        // This catch prevents the actual unhandled rejection in demo
        // In reality, this would be unhandled and caught by the global handler
        this.otelLogs.error('Simulated unhandled promise rejection', {
          error_type: 'promise_rejection',
          demo: true
        });
      });
  }

  // HTTP errors
  trigger404Error() {
    this.incrementErrorStats('http');
    this.http.get('https://jsonplaceholder.typicode.com/posts/999999').subscribe({
      next: (data) => {
        this.otelLogs.info('Unexpected success for 404 test', { data });
      },
      error: (error) => {
        this.otelLogs.error('HTTP 404 error occurred', {
          error_type: 'http_error',
          status_code: error.status,
          url: error.url,
          message: error.message
        });
        this.otelMetrics.recordError('http_404', 'Resource not found');
      }
    });
  }

  trigger500Error() {
    this.incrementErrorStats('http');
    // Simulate server error by calling a non-existent endpoint
    this.http.get('https://httpstat.us/500').subscribe({
      next: (data) => {
        this.otelLogs.info('Unexpected success for 500 test', { data });
      },
      error: (error) => {
        this.otelLogs.error('HTTP 500 error occurred', {
          error_type: 'http_error',
          status_code: error.status,
          url: error.url,
          message: error.message
        });
        this.otelMetrics.recordError('http_500', 'Internal server error');
      }
    });
  }

  triggerNetworkError() {
    this.incrementErrorStats('http');
    // Simulate network timeout
    this.http.get('https://httpstat.us/200?sleep=10000').subscribe({
      next: (data) => {
        this.otelLogs.info('Unexpected success for timeout test', { data });
      },
      error: (error) => {
        this.otelLogs.error('Network timeout error', {
          error_type: 'network_error',
          timeout: true,
          url: error.url,
          message: error.message
        });
        this.otelMetrics.recordError('network_timeout', 'Request timed out');
      }
    });
  }

  // Business logic errors
  simulateValidationError() {
    this.incrementErrorStats('business');
    const validationError = new Error('Validation failed: Email format is invalid');
    this.otelLogs.logError(validationError, {
      error_type: 'validation_error',
      field: 'email',
      value: '[redacted]',
      rule: 'email_format',
      severity: 'user_error'
    });
    this.otelMetrics.recordError('validation_error', 'Email validation failed');
  }

  simulateAuthError() {
    this.incrementErrorStats('business');
    const authError = new Error('Authentication failed: Invalid credentials');
    this.otelLogs.logError(authError, {
      error_type: 'authentication_error',
      user_id: 'demo-user-123',
      auth_method: 'password',
      ip_address: '192.168.1.1',
      severity: 'security_error'
    });
    this.otelMetrics.recordError('auth_error', 'Invalid credentials');
  }

  simulateBusinessRuleError() {
    this.incrementErrorStats('business');
    const businessError = new Error('Business rule violation: Insufficient balance');
    this.otelLogs.logError(businessError, {
      error_type: 'business_rule_error',
      rule: 'minimum_balance_check',
      user_balance: 25.50,
      required_balance: 100.00,
      transaction_amount: 150.00,
      severity: 'business_error'
    });
    this.otelMetrics.recordError('business_rule_error', 'Insufficient balance');
  }

  // Error recovery patterns
  attemptWithRetry() {
    this.otelLogs.info('Starting retry pattern demo');
    let attempt = 0;
    const maxAttempts = 3;

    const tryOperation = () => {
      attempt++;
      this.otelLogs.info(`Retry attempt ${attempt}/${maxAttempts}`, {
        pattern: 'retry',
        attempt,
        maxAttempts
      });

      if (attempt < maxAttempts) {
        setTimeout(() => {
          this.otelLogs.warn(`Attempt ${attempt} failed, retrying...`, {
            pattern: 'retry',
            attempt,
            willRetry: true
          });
          tryOperation();
        }, 1000 * attempt); // Increasing delay
      } else {
        this.recoveryStatus.retry = true;
        this.otelLogs.info('Retry pattern completed successfully', {
          pattern: 'retry',
          totalAttempts: attempt,
          status: 'success'
        });
        this.otelMetrics.recordCustomCounter('demo.recovery.retry_success', 1);
      }
    };

    tryOperation();
  }

  attemptWithFallback() {
    this.otelLogs.info('Starting fallback pattern demo');
    
    // Simulate primary operation failure
    setTimeout(() => {
      this.otelLogs.warn('Primary operation failed, attempting fallback', {
        pattern: 'fallback',
        primary_operation: 'failed',
        fallback_triggered: true
      });

      // Simulate fallback success
      setTimeout(() => {
        this.recoveryStatus.fallback = true;
        this.otelLogs.info('Fallback operation completed successfully', {
          pattern: 'fallback',
          fallback_operation: 'success',
          status: 'recovered'
        });
        this.otelMetrics.recordCustomCounter('demo.recovery.fallback_success', 1);
      }, 1000);
    }, 500);
  }

  attemptWithCircuitBreaker() {
    this.otelLogs.info('Starting circuit breaker pattern demo');
    let failureCount = 0;
    const failureThreshold = 3;
    let circuitState = 'closed'; // closed, open, half-open

    // Simulate multiple failures to trip the circuit breaker
    const simulateFailures = () => {
      if (failureCount < failureThreshold && circuitState === 'closed') {
        failureCount++;
        this.otelLogs.warn(`Operation failed (${failureCount}/${failureThreshold})`, {
          pattern: 'circuit_breaker',
          failureCount,
          failureThreshold,
          circuitState
        });

        setTimeout(simulateFailures, 300);
      } else if (circuitState === 'closed') {
        circuitState = 'open';
        this.otelLogs.error('Circuit breaker opened - too many failures', {
          pattern: 'circuit_breaker',
          circuitState,
          failureCount
        });

        // After timeout, try half-open
        setTimeout(() => {
          circuitState = 'half-open';
          this.otelLogs.info('Circuit breaker half-open - testing recovery', {
            pattern: 'circuit_breaker',
            circuitState
          });

          // Simulate successful operation
          setTimeout(() => {
            circuitState = 'closed';
            this.recoveryStatus.circuitBreaker = true;
            this.otelLogs.info('Circuit breaker closed - system recovered', {
              pattern: 'circuit_breaker',
              circuitState,
              status: 'recovered'
            });
            this.otelMetrics.recordCustomCounter('demo.recovery.circuit_breaker_success', 1);
          }, 1000);
        }, 2000);
      }
    };

    simulateFailures();
  }

  // Contextual errors
  errorWithUserContext() {
    this.incrementErrorStats('business');
    const error = new Error('User operation failed');
    this.otelLogs.logError(error, {
      error_type: 'user_context_error',
      user: {
        id: 'demo-user-123',
        email: 'demo@example.com',
        role: 'premium',
        subscription: 'active',
        last_login: new Date(Date.now() - 3600000).toISOString()
      },
      session: {
        id: 'sess_' + Math.random().toString(36).substr(2, 9),
        duration: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes
        pages_visited: Math.floor(Math.random() * 10) + 1
      },
      browser: {
        user_agent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      }
    });
  }

  errorWithSystemContext() {
    this.incrementErrorStats('javascript');
    const error = new Error('System resource error');
    this.otelLogs.logError(error, {
      error_type: 'system_context_error',
      system: {
        memory_usage: (performance as any).memory?.usedJSHeapSize || 'unknown',
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        online: navigator.onLine
      },
      performance: {
        page_load: Math.floor(performance.now()),
        navigation_type: (performance.getEntriesByType('navigation')[0] as any)?.type || 'unknown'
      },
      environment: {
        url: window.location.href,
        referrer: document.referrer,
        screen_resolution: `${screen.width}x${screen.height}`
      }
    });
  }

  errorWithBusinessContext() {
    this.incrementErrorStats('business');
    const error = new Error('Business process error');
    this.otelLogs.logError(error, {
      error_type: 'business_context_error',
      business: {
        process: 'demo-workflow',
        step: 'data-processing',
        transaction_id: 'txn_' + Math.random().toString(36).substr(2, 9),
        amount: 99.99,
        currency: 'USD'
      },
      workflow: {
        started_at: new Date(Date.now() - 5000).toISOString(),
        current_step: 3,
        total_steps: 5,
        progress_percent: 60
      },
      context: {
        feature_flags: {
          new_checkout: true,
          enhanced_logging: true,
          metrics_collection: true
        },
        experiment: {
          name: 'enhanced_otel_demo',
          variant: 'treatment',
          user_bucket: 'A'
        }
      }
    });
  }

  private incrementErrorStats(type: 'http' | 'business' | 'javascript') {
    this.errorStats[type]++;
    this.errorStats.total++;
    
    this.otelMetrics.recordCustomCounter('demo.errors.total', 1, {
      'error.category': type,
      'demo.component': 'error-demo'
    });
  }
}