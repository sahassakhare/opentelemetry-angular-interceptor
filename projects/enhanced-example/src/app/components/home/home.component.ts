import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <div class="container">
      <h1>Enhanced OpenTelemetry Angular Interceptor Demo</h1>
      <p>This demo showcases the enhanced Jufab interceptor with Logs and Metrics support.</p>
      
      <div class="feature-grid">
        <div class="feature-card">
          <h2>Distributed Tracing</h2>
          <p>Original Jufab feature - tracks requests across services</p>
          <ul>
            <li>HTTP request interception</li>
            <li>Automatic span creation</li>
            <li>Context propagation</li>
          </ul>
        </div>

        <div class="feature-card">
          <h2>Structured Logs</h2>
          <p>NEW: OpenTelemetry logs with trace correlation</p>
          <ul>
            <li>Automatic trace_id/span_id injection</li>
            <li>Global error handling</li>
            <li>PII redaction & rate limiting</li>
          </ul>
        </div>

        <div class="feature-card">
          <h2>Metrics & Web Vitals</h2>
          <p>NEW: Performance and business metrics</p>
          <ul>
            <li>Core Web Vitals (LCP, CLS, INP)</li>
            <li>Custom counters & histograms</li>
            <li>SPA-aware navigation tracking</li>
          </ul>
        </div>
      </div>

      <div class="demo-links">
        <h3>Try the Demos:</h3>
        <nav>
          <a routerLink="/logs" class="demo-link">Logs Demo</a>
          <a routerLink="/metrics" class="demo-link">Metrics Demo</a>
          <a routerLink="/errors" class="demo-link">Error Handling Demo</a>
        </nav>
      </div>

      <div class="status">
        <h3>Current Status:</h3>
        <p>Tracing: Active</p>
        <p>Logs: Active (check console)</p>
        <p>Metrics: Active (Web Vitals collecting)</p>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 20px;
    }
    
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }
    
    .feature-card {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .feature-card h2 {
      color: #007bff;
      margin-bottom: 10px;
    }
    
    .feature-card ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    
    .demo-links {
      margin: 40px 0;
      text-align: center;
    }
    
    .demo-links nav {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 20px;
    }
    
    .demo-link {
      padding: 10px 20px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      transition: background 0.3s;
    }
    
    .demo-link:hover {
      background: #0056b3;
    }
    
    .status {
      background: #e8f5e9;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }
    
    .status p {
      margin: 5px 0;
      font-family: monospace;
    }
  `]
})
export class HomeComponent {}