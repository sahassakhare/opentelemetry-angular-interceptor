import { Component, OnInit } from '@angular/core';
import { OpenTelemetryLogsService } from '../../../opentelemetry-interceptor/src/public-api';

@Component({
  selector: 'app-root',
  template: `
    <div class="app">
      <header class="app-header">
        <h1>Enhanced OpenTelemetry Angular Interceptor</h1>
        <nav class="main-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Home</a>
          <a routerLink="/logs" routerLinkActive="active">Logs</a>
          <a routerLink="/metrics" routerLinkActive="active">Metrics</a>
          <a routerLink="/errors" routerLinkActive="active">Errors</a>
        </nav>
      </header>
      
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
      
      <footer class="app-footer">
        <p>Enhanced with Logs & Metrics support | Original: <a href="https://github.com/jufab/opentelemetry-angular-interceptor" target="_blank">&#64;jufab/opentelemetry-angular-interceptor</a></p>
      </footer>
    </div>
  `,
  styles: [`
    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .app-header {
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
      padding: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .app-header h1 {
      margin: 0 0 15px 0;
      text-align: center;
      font-size: 1.8em;
    }
    
    .main-nav {
      display: flex;
      justify-content: center;
      gap: 30px;
    }
    
    .main-nav a {
      color: white;
      text-decoration: none;
      padding: 10px 15px;
      border-radius: 5px;
      transition: background 0.3s;
    }
    
    .main-nav a:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .main-nav a.active {
      background: rgba(255, 255, 255, 0.2);
      font-weight: bold;
    }
    
    .app-main {
      flex: 1;
      background: #f8f9fa;
    }
    
    .app-footer {
      background: #343a40;
      color: #adb5bd;
      text-align: center;
      padding: 15px;
      margin-top: auto;
    }
    
    .app-footer a {
      color: #007bff;
      text-decoration: none;
    }
    
    .app-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'enhanced-example';

  constructor(private otelLogs: OpenTelemetryLogsService) {}

  ngOnInit() {
    this.otelLogs.info('Enhanced OpenTelemetry demo application started', {
      app: 'enhanced-example',
      version: '1.0.0',
      features: ['tracing', 'logs', 'metrics'],
      timestamp: new Date().toISOString()
    });
  }
}
