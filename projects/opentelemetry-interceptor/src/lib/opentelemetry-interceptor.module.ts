import {
  NgModule,
  ModuleWithProviders,
  Optional,
  SkipSelf,
  ValueProvider,
  ClassProvider,
  ConstructorProvider,
  ExistingProvider,
  FactoryProvider,
  ErrorHandler,
  PLATFORM_ID,
} from '@angular/core';
import {
  defineConfigProvider,
  OpenTelemetryConfig,
  OTEL_CONFIG,
  OTEL_LOGS_CONFIG,
  OTEL_LOGS_PROVIDER,
  OTEL_METRICS_CONFIG,
  OTEL_METRICS_PROVIDER,
} from './configuration/opentelemetry-config';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { OpenTelemetryHttpInterceptor } from './interceptor/opentelemetry-http.interceptor';

// ✅ NEW: Import logs and metrics services
import { 
  OpenTelemetryLogsService, 
  logsProviderFactory,
  OpenTelemetryErrorHandler 
} from './services/logs';
import { 
  OpenTelemetryMetricsService, 
  metricsProviderFactory 
} from './services/metrics';


@NgModule({
  declarations: [],
  imports: [HttpClientModule],
  exports: [],
})
export class OpenTelemetryInterceptorModule {
  constructor(
    @Optional() @SkipSelf() parentModule?: OpenTelemetryInterceptorModule
  ) {
    if (parentModule) {
      throw new Error(
        'OpentelemetryInterceptorModule is already loaded. Import it in the AppModule only'
      );
    }
  }

  public static forRoot(
    config: OpenTelemetryConfig | null | undefined,
    configProvider?: ValueProvider | ClassProvider | ConstructorProvider | ExistingProvider | FactoryProvider
    ): ModuleWithProviders<OpenTelemetryInterceptorModule> {

      // ✅ Original Jufab HTTP Interceptor (unchanged)
      const interceptorProvider = {
        provide: HTTP_INTERCEPTORS,
        useClass: OpenTelemetryHttpInterceptor,
        multi: true,
      };

      configProvider = defineConfigProvider(config, configProvider);

      // ✅ NEW: Create enhanced providers array with logs and metrics
      const providers: any[] = [
        configProvider,
        interceptorProvider,
      ];

      // ✅ NEW: Add logs configuration and providers
      if (config?.logsConfig?.enabled) {
        providers.push(
          // Logs config provider
          {
            provide: OTEL_LOGS_CONFIG,
            useValue: config.logsConfig
          },
          // Logs provider factory
          {
            provide: OTEL_LOGS_PROVIDER,
            useFactory: logsProviderFactory,
            deps: [OTEL_CONFIG, PLATFORM_ID]
          },
          // Logs service
          OpenTelemetryLogsService,
          // Global error handler
          {
            provide: ErrorHandler,
            useClass: OpenTelemetryErrorHandler
          }
        );
      }

      // ✅ NEW: Add metrics configuration and providers
      if (config?.metricsConfig?.enabled) {
        providers.push(
          // Metrics config provider
          {
            provide: OTEL_METRICS_CONFIG,
            useValue: config.metricsConfig
          },
          // Metrics provider factory
          {
            provide: OTEL_METRICS_PROVIDER,
            useFactory: metricsProviderFactory,
            deps: [OTEL_CONFIG, PLATFORM_ID]
          },
          // Metrics service
          OpenTelemetryMetricsService
        );
      }

    return {
      ngModule: OpenTelemetryInterceptorModule,
      providers,
    };
  }

}
