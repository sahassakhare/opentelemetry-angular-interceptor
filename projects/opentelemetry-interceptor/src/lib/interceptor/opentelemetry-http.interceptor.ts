import { Injectable, Inject, Optional } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { PlatformLocation } from '@angular/common';
import { Observable } from 'rxjs';
import * as api from '@opentelemetry/api';
import { Span, SpanStatusCode, DiagLogger, SpanKind } from '@opentelemetry/api';
import { WebTracerProvider, StackContextManager } from '@opentelemetry/sdk-trace-web';
import {
  SimpleSpanProcessor,
  ConsoleSpanExporter,
  BatchSpanProcessor,
  NoopSpanProcessor,
  AlwaysOnSampler,
  AlwaysOffSampler,
  TraceIdRatioBasedSampler,
  ParentBasedSampler,
  Sampler,
  BufferConfig
} from '@opentelemetry/sdk-trace-base';
import {
  isUrlIgnored
} from '@opentelemetry/core';
import {
  ATTR_USER_AGENT_ORIGINAL,
  ATTR_URL_PATH,
  ATTR_URL_QUERY,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_ERROR_TYPE,
  ATTR_SERVICE_NAME,
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_URL_FULL,
  ATTR_URL_SCHEME,
  ATTR_SERVER_ADDRESS,
  ATTR_SERVER_PORT,
  // ATTR_HTTP_REQUEST_HEADER,
  //SEMATTRS_ERROR_TYPE
} from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';
import { tap, finalize } from 'rxjs/operators';
import {
  CommonCollectorConfig,
  OpenTelemetryConfig,
  OTEL_CONFIG,
} from '../configuration/opentelemetry-config';
import infoLibrary from '../../version.json';
import { OTEL_EXPORTER, IExporter } from '../services/exporter/exporter.interface';
import { OTEL_PROPAGATOR, IPropagator } from '../services/propagator/propagator.interface';
import { OTEL_LOGGER, OTEL_CUSTOM_SPAN } from '../configuration/opentelemetry-config';
import { CustomSpan } from './custom-span.interface';
import { SpanTimeoutManager, SpanType } from '../services/span-timeout-manager.service';

/**
 * OpenTelemetryInterceptor class
 */
@Injectable({
  providedIn: 'root',
})
export class OpenTelemetryHttpInterceptor implements HttpInterceptor {
  /**
   * tracer
   */
  tracer: WebTracerProvider;
  /**
   * context manager
   */
  contextManager: StackContextManager;
  /**
   * Log or not body
   */
  logBody = false;

   /**
   * constructor
   *
   * @param config configuration
   * @param exporterService service exporter injected
   * @param propagatorService propagator injected
   * @param logger define logger
   * @param customSpan a customSpan interface to add attributes
   * @param platformLocation encapsulates all calls to DOM APIs
   */
   constructor(
    @Inject(OTEL_CONFIG) private config: OpenTelemetryConfig,
    @Optional() @Inject(OTEL_EXPORTER)
    private exporterService: IExporter | null,
    @Inject(OTEL_PROPAGATOR)
    private propagatorService: IPropagator,
    @Optional() @Inject(OTEL_LOGGER)
    private logger: DiagLogger,
    @Optional() @Inject(OTEL_CUSTOM_SPAN)
    private customSpan: CustomSpan,
    private platformLocation: PlatformLocation,
    private spanTimeoutManager: SpanTimeoutManager
  ) {
    // console.log('[HTTP-INTERCEPTOR] Constructor called with services:', {
    //   configExists: !!this.config,
    //   exporterServiceExists: !!this.exporterService,
    //   exporterServiceType: this.exporterService?.constructor?.name,
    //   propagatorServiceExists: !!this.propagatorService,
    //   otelcolConfig: this.config?.otelcolConfig
    // });
    this.tracer = new WebTracerProvider({
      sampler: this.defineProbabilitySampler(this.convertStringToNumber(config.commonConfig.probabilitySampler)),
      resource: this.loadResourceAttributes(this.config.commonConfig),
      spanProcessors: this.insertOrNotSpanExporter()
    });
    this.contextManager = new StackContextManager();
    this.tracer.register({
      propagator: this.propagatorService.getPropagator(),
      contextManager: this.contextManager
    });
    
    // CRITICAL FIX: Register tracer provider globally for logs trace correlation
    // This bridges the interceptor's tracer to the global OpenTelemetry context
    // enabling logs service to access active span information
    console.log('[HTTP-INTERCEPTOR] Registering global tracer provider:', !!this.tracer);
    api.trace.setGlobalTracerProvider(this.tracer);
    
    // Verify registration worked
    const globalProvider = api.trace.getTracerProvider();
    console.log('[HTTP-INTERCEPTOR] Global tracer provider after registration:', !!globalProvider);
    console.log('[HTTP-INTERCEPTOR] Providers match:', this.tracer === globalProvider);
    
    this.logBody = config.commonConfig.logBody;
    api.diag.setLogger(logger, config.commonConfig.logLevel);
  }

    /**
   * Overide method
   * Interceptor from HttpInterceptor Angular
   *
   * @param request the current request
   * @param next next
   */
    intercept(
      request: HttpRequest<unknown>,
      next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
      // console.log(`[HTTP-INTERCEPTOR] Intercepting HTTP ${request.method} ${request.url}`);
      
      if (isUrlIgnored(request.url, this.config.ignoreUrls?.urls)) {
        // console.log(`[HTTP-INTERCEPTOR] URL ignored: ${request.url}`);
        return next.handle(request);
      }
      
      console.log(`[HTTP-INTERCEPTOR] Processing HTTP request for tracing`);
      
      // RACE CONDITION FIX: Create isolated context per request instead of disable/enable
      // This ensures each HTTP request gets its own trace context without bleeding
      const parentContext = api.context.active();
      
      try {
        // Create span within isolated context
        const span: Span = this.initSpanWithContext(request, parentContext);
        
        // Set the span as active in the context for the entire request lifecycle
        const spanContext = api.trace.setSpan(parentContext, span);
        
        // CRITICAL FIX: Force context binding using both OTEL and manual context storage
        // Store span context globally for logs service access
        const globalContext = (globalThis as any);
        if (!globalContext.__otelActiveSpans) {
          globalContext.__otelActiveSpans = new Map();
        }
        
        const requestId = Math.random().toString(36);
        globalContext.__otelActiveSpans.set(requestId, {
          span,
          spanContext,
          timestamp: Date.now()
        });
        
        // Also store in window for broader access
        if (typeof window !== 'undefined') {
          (window as any).__otelCurrentSpan = span;
          (window as any).__otelCurrentContext = spanContext;
        }
        
        console.log('[HTTP-INTERCEPTOR] Stored span context globally:', {
          requestId,
          hasSpan: !!span,
          hasContext: !!spanContext,
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          activeSpansCount: globalContext.__otelActiveSpans.size
        });
        
        // Execute request handling within the span's context to ensure proper isolation
        return api.context.with(spanContext, () => {
          const tracedReq = this.injectContextAndHeader(request);
          
          return next.handle(tracedReq).pipe(
        tap(
          (event: HttpResponse<any>) => {
            span.setAttributes(
              {
                [ATTR_HTTP_RESPONSE_STATUS_CODE]: event.status,
              }
            );
            if (this.logBody && event.body != null) {
              span.addEvent('response', { body: JSON.stringify(event.body) });
            }
            span.setStatus({
              code: SpanStatusCode.UNSET
            });
            this.setCustomSpan(span, request, event);
          },
          (event: HttpErrorResponse) => {
            span.setAttributes(
              {
                [ATTR_HTTP_RESPONSE_STATUS_CODE]: event.status,
                [ATTR_ERROR_TYPE] : event.name,
              }
            );
            span.recordException({
              name: event.name,
              message: event.message,
              stack: event.error
            });
            span.setStatus({
              code: SpanStatusCode.ERROR
            });
            this.setCustomSpan(span, request, event);
          }
        ),
            finalize(() => {
              // Enhanced context handling: Keep context active briefly for async operations
              // This allows logs and other operations triggered by the HTTP response
              // to still have access to the span context
              setTimeout(() => {
                // Clean up within the span context to ensure proper finalization
                api.context.with(spanContext, () => {
                  span.end();
                  // Untrack span from timeout manager
                  this.spanTimeoutManager.untrackSpan(span);
                  
                  // Clean up global context storage
                  const globalContext = (globalThis as any);
                  if (globalContext.__otelActiveSpans) {
                    globalContext.__otelActiveSpans.delete(requestId);
                  }
                  
                  // Clean up window storage
                  if (typeof window !== 'undefined') {
                    delete (window as any).__otelCurrentSpan;
                    delete (window as any).__otelCurrentContext;
                  }
                  
                  console.log('[HTTP-INTERCEPTOR] Cleaned up global OTEL context storage');
                });
              }, 250); // 250ms grace period for async operations
            })
          );
        });
      } catch (contextError) {
        // Fallback to legacy behavior if context isolation fails
        console.warn('[HTTP-INTERCEPTOR] Context isolation failed, falling back to legacy behavior:', contextError);
        return this.legacyInterceptLogic(request, next);
      }
    }
    
    /**
     * Legacy intercept logic as fallback
     */
    private legacyInterceptLogic(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
      this.contextManager.disable();
      this.contextManager.enable();
      const span: Span = this.initSpan(request);
      const tracedReq = this.injectContextAndHeader(request);
      return next.handle(tracedReq).pipe(
        tap(
          (event: HttpResponse<any>) => {
            span.setAttributes({
              [ATTR_HTTP_RESPONSE_STATUS_CODE]: event.status,
            });
            this.setCustomSpan(span, request, event);
          },
          (event: HttpErrorResponse) => {
            span.setAttributes({
              [ATTR_HTTP_RESPONSE_STATUS_CODE]: event.status,
              [ATTR_ERROR_TYPE] : event.name,
            });
            this.setCustomSpan(span, request, event);
          }
        ),
        finalize(() => {
          setTimeout(() => {
            span.end();
          }, 250);
        })
      );
    }

  /**
   * Get current scheme, hostname and port
   */
  private getURL() {
    return this.platformLocation.href;
  }

  /**
   * Generate Resource Attributes
   */
  private loadResourceAttributes(
    commonConfig: CommonCollectorConfig
  ): Resource {
    return new Resource({
      [ATTR_SERVICE_NAME]: commonConfig?.serviceName,
      ...commonConfig?.resourceAttributes,
    });
  }
  /**
   * Create span with context isolation (new method)
   *
   * @param request request
   * @param parentContext the parent context for this request
   */
  private initSpanWithContext(request: HttpRequest<unknown>, parentContext: any): Span {
    console.log(`[HTTP-INTERCEPTOR] Creating context-isolated span for ${request.method} ${request.url}`);
    console.log(`[HTTP-INTERCEPTOR] Tracer exists:`, !!this.tracer);
    
    const urlRequest = (request.urlWithParams.startsWith('http')) ? new URL(request.urlWithParams) : new URL(this.getURL());
    const operationName = `${request.method.toUpperCase()} ${urlRequest.pathname}`;
    
    const span = this.tracer
      .getTracer(infoLibrary.name, infoLibrary.version)
      .startSpan(
        `${request.method.toUpperCase()}`,
        {
          attributes: {
            [ATTR_HTTP_REQUEST_METHOD]: request.method,
            [ATTR_SERVER_ADDRESS]: urlRequest.host,
            [ATTR_SERVER_PORT]: urlRequest.port,
            [ATTR_URL_FULL]: request.urlWithParams,
            [ATTR_URL_SCHEME]: urlRequest.protocol.replace(':', ''),
            [ATTR_URL_QUERY]: urlRequest.search,
            [ATTR_USER_AGENT_ORIGINAL]: window.navigator.userAgent
          },
          kind: SpanKind.CLIENT,
        },
        parentContext
      );
      
    console.log('[HTTP-INTERCEPTOR] HTTP span created:', {
      method: request.method,
      url: request.url,
      hasSpan: !!span,
      spanId: span.spanContext().spanId,
      traceId: span.spanContext().traceId
    });
    
    // Register HTTP span for timeout management
    this.spanTimeoutManager.trackSpan(
      span,
      SpanType.HTTP,
      operationName
    );
    
    return span;
  }

  /**
   * Initialise a span for a request intercepted (legacy method)
   *
   * @param request request
   */
  private initSpan(request: HttpRequest<unknown>): Span {
    // console.log(`[HTTP-INTERCEPTOR] Creating span for ${request.method} ${request.url}`);
    // console.log(`[HTTP-INTERCEPTOR] Tracer exists:`, !!this.tracer);
    
    const urlRequest = (request.urlWithParams.startsWith('http')) ? new URL(request.urlWithParams) : new URL(this.getURL());
    const span = this.tracer
      .getTracer(infoLibrary.name, infoLibrary.version)
      .startSpan(
        `${request.method.toUpperCase()}`,
        {
          attributes: {
            [ATTR_HTTP_REQUEST_METHOD]: request.method,
            [ATTR_SERVER_ADDRESS]: urlRequest.host,
            [ATTR_SERVER_PORT]: urlRequest.port,
            [ATTR_URL_FULL]: request.urlWithParams,
            [ATTR_URL_SCHEME]: urlRequest.protocol.replace(':', ''),
            [ATTR_URL_QUERY]: urlRequest.search,
            [ATTR_USER_AGENT_ORIGINAL]: window.navigator.userAgent
          },
          kind: SpanKind.CLIENT,
        },
        this.contextManager.active()
      );
    /*eslint no-underscore-dangle: ["error", { "allow": ["_currentContext"] }]*/
    this.contextManager._currentContext = api.trace.setSpan(
      this.contextManager.active(),
      span
    );
    return span;
  }

  /**
   * Add header propagator in request and conserve original header
   *
   * @param request request
   */
  private injectContextAndHeader(
    request: HttpRequest<unknown>
  ) {
    const carrier = {};
    api.propagation.inject(
      this.contextManager.active(),
      carrier,
      api.defaultTextMapSetter
    );
    request.headers.keys().map(key => {
      carrier[key] = request.headers.get(key);
    });
    return request.clone({
      setHeaders: carrier,
    });
  }

  /**
   * Verify to insert or not a Span Exporter
   */
  private insertOrNotSpanExporter() {
    // console.log('[HTTP-INTERCEPTOR] Checking exporter service:', {
    //   exporterServiceExists: !!this.exporterService,
    //   exporterServiceType: this.exporterService?.constructor?.name,
    //   exporterResult: this.exporterService?.getExporter()
    // });

    if (this.exporterService && this.exporterService.getExporter() !== undefined) {
      // console.log('[HTTP-INTERCEPTOR] Using real span processors (OTLP + Console)');
      return Array.of(this.insertSpanProcessorProductionMode(), this.insertConsoleSpanExporter());
    } else {
      // console.log('[HTTP-INTERCEPTOR] Using NoopSpanProcessor - no traces will be exported!');
      return Array.of(new NoopSpanProcessor());
    }
  }

  /**
   * Insert in tracer the console span if config is true
   */
  private insertConsoleSpanExporter() {
    if (this.config.commonConfig.console) {
      return new SimpleSpanProcessor(new ConsoleSpanExporter());
    }
  }

  /**
   * Insert BatchSpanProcessor in production mode
   * SimpleSpanProcessor otherwise
   */
  private insertSpanProcessorProductionMode() {
    const bufferConfig: BufferConfig = {
      maxExportBatchSize: this.convertStringToNumber(this.config.batchSpanProcessorConfig?.maxExportBatchSize),
      scheduledDelayMillis: this.convertStringToNumber(this.config.batchSpanProcessorConfig?.scheduledDelayMillis),
      exportTimeoutMillis: this.convertStringToNumber(this.config.batchSpanProcessorConfig?.exportTimeoutMillis),
      maxQueueSize: this.convertStringToNumber(this.config.batchSpanProcessorConfig?.maxQueueSize)
    };
    return this.config.commonConfig.production
        ? new BatchSpanProcessor(this.exporterService.getExporter(), bufferConfig)
        : new SimpleSpanProcessor(this.exporterService.getExporter());
  }

  /**
   * define the Probability Sampler
   * By Default, it's always (or 1)
   *
   * @param sampleConfig the sample configuration
   */
  private defineProbabilitySampler(sampleConfig: number): Sampler {
    if (sampleConfig >= 1) {
      return new ParentBasedSampler({ root: new AlwaysOnSampler() });
    }
    else if (sampleConfig <= 0 || sampleConfig === undefined) {
      return new ParentBasedSampler({ root: new AlwaysOffSampler() });
    } else {
      return new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(sampleConfig) });
    }
  }

  /**
   * convert String to Number (or undefined)
   *
   * @param value
   * @returns number or undefined
   */
  private convertStringToNumber(value: string): number {
    return value !== undefined ? Number(value) : undefined;
  }

  /**
   * Set custom attributes in span with a CustomSpan
   *
   * @param span
   * @param request
   * @param response
   * @returns Span
   */
  private setCustomSpan(span: Span, request: HttpRequest<unknown>, response: HttpResponse<unknown> | HttpErrorResponse): Span {
    return this.customSpan != null ? this.customSpan.add(span, request, response) : span;
  }
}
