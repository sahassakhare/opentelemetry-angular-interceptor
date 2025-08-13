import { PLATFORM_ID, Injector, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerProvider } from '@opentelemetry/api-logs';
import { LoggerProvider as SDKLoggerProvider, BatchLogRecordProcessor, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { OpenTelemetryConfig } from '../../configuration/opentelemetry-config';
import { ILogsExporter, OTEL_LOGS_EXPORTER } from '../exporter/exporter.interface';

/**
 * Factory function to create LoggerProvider using modular exporters
 * This version uses Angular dependency injection to get exporters from modules
 */
export function createLogsProviderModular(
  config: OpenTelemetryConfig,
  platformId: Object,
  injector: Injector
): LoggerProvider | null {
  if (!isPlatformBrowser(platformId) || !config.logsConfig?.enabled) {
    return null;
  }

  try {
    const logsConfig = config.logsConfig;

    // Create resource with service information
    const resource = Resource.default().merge(
      new Resource({
        [ATTR_SERVICE_NAME]: config.commonConfig.serviceName,
        [ATTR_SERVICE_VERSION]: '1.0.0',
        ...config.commonConfig.resourceAttributes
      })
    );

    // Create LoggerProvider
    const loggerProvider = new SDKLoggerProvider({
      resource
    });

    // Try to get injected exporters
    try {
      const logsExporter = injector.get<ILogsExporter>(OTEL_LOGS_EXPORTER, null);
      if (logsExporter) {
        const exporter = logsExporter.getExporter();
        const isProduction = config.commonConfig.production ?? false;
        
        const processor = isProduction
          ? new BatchLogRecordProcessor(exporter)
          : new SimpleLogRecordProcessor(exporter);

        loggerProvider.addLogRecordProcessor(processor);
        console.log('OpenTelemetry Logs Provider initialized with modular exporter');
      } else {
        console.warn('No logs exporter found in dependency injection');
      }
    } catch (error) {
      console.warn('Failed to get logs exporter from DI, falling back to configuration-based setup:', error);
    }

    return loggerProvider;

  } catch (error) {
    console.error('Failed to initialize OpenTelemetry Logs Provider (modular):', error);
    return null;
  }
}

export function logsProviderModularFactory(
  config: OpenTelemetryConfig,
  platformId: Object,
  injector: Injector
): LoggerProvider | null {
  return createLogsProviderModular(config, platformId, injector);
}