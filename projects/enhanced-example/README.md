# Enhanced OpenTelemetry Angular Interceptor - Demo Application

This demo application showcases the enhanced version of `@jufab/opentelemetry-angular-interceptor` with comprehensive **Logs** and **Metrics** support alongside the existing tracing capabilities.

## Features Demonstrated

### Distributed Tracing (Original Jufab)
- HTTP request interception and automatic span creation
- Context propagation across service calls
- Integration with OpenTelemetry collectors

### OpenTelemetry Logs (NEW)
- Structured logging with automatic trace correlation
- Global error handling for Angular, Promise, and JavaScript errors
- Console bridge to capture console.log/warn/error calls
- PII redaction and rate limiting
- Rich contextual logging with user, system, and business context

### OpenTelemetry Metrics (NEW)
- Web Vitals v4 integration (LCP, CLS, INP, FCP, TTFB)
- Custom counters and histograms for business metrics
- User interaction tracking
- SPA-aware navigation metrics
- Real-time performance monitoring

### Retry & Jitter Support (NEW)
- Configurable retry logic with exponential backoff
- Multiple jitter strategies (full, equal, decorrelated)
- Resilient export to collectors

## Running the Demo

### Prerequisites

1. **Install Dependencies:**
   ```bash
   cd jufab-enhanced
   npm install
   ```

2. **Optional: Setup OTEL Collector**
   - Install and run an OpenTelemetry Collector on `localhost:4318`
   - Or use a cloud observability platform (Jaeger, Zipkin, etc.)

### Start the Application

```bash
npm run start enhanced-example
```

The app will be available at `http://localhost:4200`

## Demo Scenarios

### 1. Home Page
- Overview of all features
- Live status of tracing, logs, and metrics
- Navigation to specific demos

### 2. Logs Demo (`/logs`)
- **Basic Logging:** Debug, Info, Warning, Error levels
- **Contextual Logging:** Rich attributes with user/system context  
- **Trace Correlation:** Automatic trace_id/span_id injection
- **PII Redaction:** Sensitive data automatically redacted
- **Console Bridge:** Capture console.* calls as OTEL logs

### 3. Metrics Demo (`/metrics`)
- **Web Vitals:** Live Core Web Vitals collection
- **Custom Counters:** Button clicks, page views, feature usage
- **Custom Histograms:** API response times, task durations
- **Business Metrics:** Revenue tracking, conversions, engagement
- **User Interactions:** Click area tracking with metrics
- **Real-time Metrics:** Page load time, memory usage, time on page

### 4. Error Handling Demo (`/errors`)
- **Global Error Handler:** Angular, JavaScript, Promise errors
- **HTTP Errors:** 404, 500, network timeouts with automatic logging
- **Business Errors:** Validation, authentication, business rule violations
- **Error Recovery:** Retry, fallback, and circuit breaker patterns
- **Contextual Errors:** Rich error context with user, system, business data

## What to Observe

### Browser Developer Tools

1. **Console Tab:**
   - OTEL formatted log messages with `[OTEL-LOG:LEVEL]` prefix
   - Metrics logged to console (if `console: true`)
   - Error handling in action

2. **Network Tab:**
   - HTTP requests to `/v1/traces` (tracing data)
   - HTTP requests to `/v1/logs` (logs data) 
   - HTTP requests to `/v1/metrics` (metrics data)
   - Retry attempts with exponential backoff

3. **Performance Tab:**
   - Web Vitals measurements
   - Navigation timing
   - User interaction measurements

### OTEL Collector (if running)

- **Traces:** Spans with proper parent-child relationships
- **Logs:** Structured logs with trace correlation
- **Metrics:** Counters, histograms, and gauges with attributes

## Testing Different Scenarios

### Trace Correlation
1. Navigate to Logs demo
2. Click "HTTP Request + Logs" 
3. Observe how logs include trace_id and span_id from HTTP span

### Error Handling
1. Navigate to Error demo
2. Click "Throw Angular Error"
3. Check console and network for automatic error logging

### Web Vitals
1. Navigate between pages and interact with UI
2. Observe LCP, CLS, INP measurements in console
3. Note how metrics reinitialize on navigation (SPA-aware)

### Rate Limiting
1. Navigate to Logs demo
2. Rapidly click log buttons
3. Observe rate limiting kicking in (some logs will be dropped)

### Retry Logic
1. Disconnect from internet or stop OTEL collector
2. Perform actions that generate telemetry
3. Reconnect and observe retry attempts with exponential backoff

## Configuration

The demo uses a comprehensive configuration showcasing all features:

```typescript
// See: src/app/app.module.ts
OpenTelemetryInterceptorModule.forRoot({
  // Original Jufab tracing config (unchanged)
  commonConfig: { ... },
  otelcolConfig: { ... },
  
  // NEW: Enhanced logs config
  logsConfig: {
    enabled: true,
    level: 'debug',
    console: true,
    consoleBridge: true,
    rateLimit: { ... },
    redact: { ... }
  },
  
  // NEW: Enhanced metrics config  
  metricsConfig: {
    enabled: true,
    webVitals: true,
    collectFCP: true,
    collectTTFB: true,
    // ... more options
  }
})
```

## UI Features

- **Responsive Design:** Works on desktop and mobile
- **Visual Feedback:** Button states, counters, status indicators
- **Interactive Elements:** Clickable areas, real-time updates
- **Comprehensive Navigation:** Easy switching between demos
- **Status Displays:** Live metrics, error counts, recovery status

## Customization

You can modify the demo to:

1. **Change OTEL Endpoint:** Update `otelcolConfig.url` in app.module.ts
2. **Adjust Log Levels:** Modify `logsConfig.level`
3. **Customize Metrics:** Add your own counters/histograms
4. **Test Different Scenarios:** Add new demo components

## Learning Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Original Jufab Library](https://github.com/jufab/opentelemetry-angular-interceptor)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Angular Error Handling](https://angular.io/guide/error-handling)

## Next Steps

After exploring the demo:

1. **Integrate into your app:** Follow the migration guide in `ENHANCED_FEATURES.md`
2. **Configure for production:** Use production config examples
3. **Set up observability backend:** Deploy OTEL collector and visualization tools
4. **Create custom metrics:** Define business-specific metrics for your use case

---

This demo demonstrates a complete observability solution with tracing, logging, and metrics - all automatically correlated through OpenTelemetry context propagation!