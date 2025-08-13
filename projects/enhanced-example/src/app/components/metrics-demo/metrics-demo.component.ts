import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OpenTelemetryMetricsService } from '../../../../../opentelemetry-interceptor/src/public-api';

@Component({
  selector: 'app-metrics-demo',
  template: `
    <div class="container">
      <h1>Metrics Demo</h1>
      <p>Demonstrate OpenTelemetry metrics including Web Vitals and custom metrics</p>
      
      <div class="demo-section">
        <h2>Web Vitals Status</h2>
        <p>Core Web Vitals are automatically collected in the background:</p>
        <div class="vitals-status">
          <div class="vital-item">
            <span class="vital-name">LCP (Largest Contentful Paint)</span>
            <span class="vital-desc">Measures loading performance</span>
          </div>
          <div class="vital-item">
            <span class="vital-name">CLS (Cumulative Layout Shift)</span>
            <span class="vital-desc">Measures visual stability</span>
          </div>
          <div class="vital-item">
            <span class="vital-name">INP (Interaction to Next Paint)</span>
            <span class="vital-desc">Measures responsiveness</span>
          </div>
          <div class="vital-item">
            <span class="vital-name">FCP (First Contentful Paint)</span>
            <span class="vital-desc">Measures first paint time</span>
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h2>Custom Counters</h2>
        <p>Click these buttons to increment custom counters:</p>
        <div class="button-group">
          <button (click)="incrementButtonClicks()" class="btn btn-primary">
            Button Clicks ({{ buttonClickCount }})
          </button>
          <button (click)="incrementPageViews()" class="btn btn-success">
            Page Views ({{ pageViewCount }})
          </button>
          <button (click)="incrementFeatureUsage()" class="btn btn-info">
            Feature Usage ({{ featureUsageCount }})
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Custom Histograms</h2>
        <p>These buttons record timing and duration metrics:</p>
        <div class="button-group">
          <button (click)="measureApiResponse()" class="btn btn-warning">
            Simulate API Response Time
          </button>
          <button (click)="measureDatabaseQuery()" class="btn btn-danger">
            Simulate DB Query Time
          </button>
          <button (click)="measureUserTask()" class="btn btn-secondary">
            Simulate User Task Duration
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Business Metrics</h2>
        <p>Track business-specific metrics:</p>
        <div class="button-group">
          <button (click)="trackPurchase()" class="btn btn-success">
            Track Purchase ({{ '$' + totalRevenue }})
          </button>
          <button (click)="trackUserEngagement()" class="btn btn-primary">
            Track User Engagement
          </button>
          <button (click)="trackConversion()" class="btn btn-info">
            Track Conversion
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h2>Error Metrics</h2>
        <p>Track different types of errors:</p>
        <div class="button-group">
          <button (click)="simulateValidationError()" class="btn btn-outline-danger">
            Validation Error
          </button>
          <button (click)="simulateNetworkError()" class="btn btn-outline-danger">
            Network Error
          </button>
          <button (click)="simulateBusinessError()" class="btn btn-outline-danger">
            Business Logic Error
          </button>
        </div>
      </div>

      <div class="demo-section">
        <h2>User Interactions</h2>
        <p>Track user interaction patterns:</p>
        <div class="interaction-area">
          <div class="clickable-area" (click)="trackAreaClick('area-1')">
            Click Area 1 ({{ areaClicks['area-1'] || 0 }} clicks)
          </div>
          <div class="clickable-area" (click)="trackAreaClick('area-2')">
            Click Area 2 ({{ areaClicks['area-2'] || 0 }} clicks)
          </div>
          <div class="clickable-area" (click)="trackAreaClick('area-3')">
            Click Area 3 ({{ areaClicks['area-3'] || 0 }} clicks)
          </div>
        </div>
      </div>

      <div class="demo-section">
        <h2>Real-time Metrics</h2>
        <p>These metrics update automatically:</p>
        <div class="metrics-display">
          <div class="metric-card">
            <h4>Page Load Time</h4>
            <p>{{ pageLoadTime }}ms</p>
          </div>
          <div class="metric-card">
            <h4>Time on Page</h4>
            <p>{{ timeOnPage }}s</p>
          </div>
          <div class="metric-card">
            <h4>Memory Usage</h4>
            <p>{{ memoryUsage }}MB</p>
          </div>
        </div>
      </div>

      <div class="instructions">
        <h3>Check the Results:</h3>
        <ul>
          <li><strong>Browser Console:</strong> See metrics logged with console output enabled</li>
          <li><strong>Network Tab:</strong> Check HTTP requests to /v1/metrics endpoint</li>
          <li><strong>OTEL Collector:</strong> If running, metrics will be sent to collector</li>
          <li><strong>Web Vitals:</strong> Automatically collected on navigation and interactions</li>
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
      border-left: 4px solid #28a745;
    }
    
    .demo-section h2 {
      margin-top: 0;
      color: #333;
    }
    
    .vitals-status {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    
    .vital-item {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #dee2e6;
    }
    
    .vital-name {
      display: block;
      font-weight: bold;
      color: #28a745;
      margin-bottom: 5px;
    }
    
    .vital-desc {
      font-size: 0.9em;
      color: #666;
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
    
    .btn-primary { background: #007bff; color: white; }
    .btn-success { background: #28a745; color: white; }
    .btn-info { background: #17a2b8; color: white; }
    .btn-warning { background: #ffc107; color: black; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-outline { background: transparent; border: 2px solid #007bff; color: #007bff; }
    .btn-outline-danger { background: transparent; border: 2px solid #dc3545; color: #dc3545; }
    
    .btn:hover {
      opacity: 0.8;
      transform: translateY(-1px);
    }
    
    .interaction-area {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    
    .clickable-area {
      background: linear-gradient(45deg, #007bff, #0056b3);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      user-select: none;
    }
    
    .clickable-area:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .metrics-display {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .metric-card h4 {
      margin: 0 0 10px 0;
      color: #333;
    }
    
    .metric-card p {
      margin: 0;
      font-size: 1.5em;
      font-weight: bold;
      color: #28a745;
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
export class MetricsDemoComponent implements OnInit, OnDestroy {
  
  // Component state
  buttonClickCount = 0;
  pageViewCount = 0;
  featureUsageCount = 0;
  totalRevenue = 0;
  areaClicks: { [key: string]: number } = {};
  
  // Real-time metrics
  pageLoadTime = 0;
  timeOnPage = 0;
  memoryUsage = 0;
  
  private pageStartTime = Date.now();
  private metricsInterval: any;

  constructor(
    private otelMetrics: OpenTelemetryMetricsService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.pageLoadTime = Math.floor(performance.now());
    this.updateRealTimeMetrics();
    
    // Record page view
    this.otelMetrics.recordNavigation('/metrics');
    
    // Start real-time metrics updates
    this.metricsInterval = setInterval(() => {
      this.updateRealTimeMetrics();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  // Custom counter methods
  incrementButtonClicks() {
    this.buttonClickCount++;
    this.otelMetrics.recordCustomCounter('demo.button.clicks', 1, {
      'button.type': 'counter',
      'demo.section': 'custom-counters'
    });
    this.otelMetrics.recordInteraction('click', 'counter-button');
  }

  incrementPageViews() {
    this.pageViewCount++;
    this.otelMetrics.recordCustomCounter('demo.page.views', 1, {
      'page.section': 'metrics-demo',
      'view.type': 'manual-increment'
    });
  }

  incrementFeatureUsage() {
    this.featureUsageCount++;
    this.otelMetrics.recordCustomCounter('demo.feature.usage', 1, {
      'feature.name': 'metrics-demo',
      'feature.category': 'observability'
    });
  }

  // Custom histogram methods
  measureApiResponse() {
    const startTime = Date.now();
    const responseTime = Math.floor(Math.random() * 2000) + 100; // 100-2100ms
    
    setTimeout(() => {
      const actualTime = Date.now() - startTime;
      this.otelMetrics.recordCustomHistogram('demo.api.response_time', actualTime, {
        'api.endpoint': '/demo/api',
        'api.method': 'GET',
        'api.status': '200'
      });
    }, responseTime);
  }

  measureDatabaseQuery() {
    const startTime = Date.now();
    const queryTime = Math.floor(Math.random() * 500) + 50; // 50-550ms
    
    setTimeout(() => {
      const actualTime = Date.now() - startTime;
      this.otelMetrics.recordCustomHistogram('demo.database.query_time', actualTime, {
        'db.operation': 'SELECT',
        'db.table': 'demo_table',
        'db.rows_returned': Math.floor(Math.random() * 100).toString()
      });
    }, queryTime);
  }

  measureUserTask() {
    const startTime = Date.now();
    const taskTime = Math.floor(Math.random() * 3000) + 500; // 500-3500ms
    
    setTimeout(() => {
      const actualTime = Date.now() - startTime;
      this.otelMetrics.recordCustomHistogram('demo.user.task_duration', actualTime, {
        'task.type': 'simulation',
        'task.category': 'user-interaction',
        'task.complexity': 'medium'
      });
    }, taskTime);
  }

  // Business metrics
  trackPurchase() {
    const amount = Math.floor(Math.random() * 200) + 10; // $10-$210
    this.totalRevenue += amount;
    
    this.otelMetrics.recordCustomCounter('demo.business.revenue', amount, {
      'transaction.type': 'purchase',
      'product.category': 'demo-product',
      'payment.method': 'credit-card'
    });
    
    this.otelMetrics.recordCustomCounter('demo.business.transactions', 1, {
      'transaction.type': 'purchase',
      'transaction.amount_bucket': amount > 100 ? 'high' : amount > 50 ? 'medium' : 'low'
    });
  }

  trackUserEngagement() {
    const engagementScore = Math.floor(Math.random() * 100) + 1; // 1-100
    
    this.otelMetrics.recordCustomHistogram('demo.user.engagement_score', engagementScore, {
      'engagement.type': 'manual-trigger',
      'user.segment': 'demo-users',
      'session.duration': Math.floor((Date.now() - this.pageStartTime) / 1000).toString()
    });
  }

  trackConversion() {
    this.otelMetrics.recordCustomCounter('demo.business.conversions', 1, {
      'conversion.type': 'demo-conversion',
      'conversion.source': 'metrics-demo',
      'conversion.value': (Math.floor(Math.random() * 50) + 10).toString()
    });
  }

  // Error tracking
  simulateValidationError() {
    this.otelMetrics.recordError('validation_error', 'Demo validation error occurred');
  }

  simulateNetworkError() {
    this.otelMetrics.recordError('network_error', 'Demo network timeout');
  }

  simulateBusinessError() {
    this.otelMetrics.recordError('business_logic_error', 'Demo business rule violation');
  }

  // Interaction tracking
  trackAreaClick(areaId: string) {
    this.areaClicks[areaId] = (this.areaClicks[areaId] || 0) + 1;
    
    this.otelMetrics.recordInteraction('click', `clickable-area-${areaId}`);
    this.otelMetrics.recordCustomCounter('demo.interaction.area_clicks', 1, {
      'area.id': areaId,
      'interaction.type': 'click',
      'area.total_clicks': this.areaClicks[areaId].toString()
    });
  }

  // Real-time metrics updates
  private updateRealTimeMetrics() {
    this.timeOnPage = Math.floor((Date.now() - this.pageStartTime) / 1000);
    
    // Memory usage (if available)
    if ('memory' in performance) {
      this.memoryUsage = Math.floor((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    } else {
      this.memoryUsage = Math.floor(Math.random() * 50) + 20; // Mock data
    }
    
    // Record real-time metrics
    if (this.timeOnPage % 10 === 0 && this.timeOnPage > 0) { // Every 10 seconds
      this.otelMetrics.recordCustomHistogram('demo.page.time_on_page', this.timeOnPage, {
        'page.url': '/metrics',
        'session.active': 'true'
      });
    }
  }
}