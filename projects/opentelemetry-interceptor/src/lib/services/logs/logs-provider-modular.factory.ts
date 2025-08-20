import { PLATFORM_ID, Injector, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerProvider } from '@opentelemetry/api-logs';
import { LoggerProvider as SDKLoggerProvider, BatchLogRecordProcessor, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { OpenTelemetryConfig } from '../../configuration/opentelemetry-config';
import { ILogsExporter, OTEL_LOGS_EXPORTER, OTEL_LOGS_EXPORTERS } from '../exporter/exporter.interface';

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

    // Get all injected exporters using multi-provider pattern
    try {
      const logsExporters = injector.get<ILogsExporter[]>(OTEL_LOGS_EXPORTERS, []);
      const isProduction = config.commonConfig.production ?? false;
      
      if (logsExporters.length > 0) {
        console.log(`OpenTelemetry Logs: Found ${logsExporters.length} modular exporter(s)`);
        
        // Add a processor for each exporter
        logsExporters.forEach((logsExporter, index) => {
          const exporter = logsExporter.getExporter();
          const processor = isProduction
            ? new BatchLogRecordProcessor(exporter)
            : new SimpleLogRecordProcessor(exporter);
          
          loggerProvider.addLogRecordProcessor(processor);
          console.log(`Added logs exporter ${index + 1}/${logsExporters.length}`);
        });
      } else {
        // Fallback to single exporter for backwards compatibility
        const singleExporter = injector.get<ILogsExporter>(OTEL_LOGS_EXPORTER, null);
        if (singleExporter) {
          const exporter = singleExporter.getExporter();
          const processor = isProduction
            ? new BatchLogRecordProcessor(exporter)
            : new SimpleLogRecordProcessor(exporter);
          
          loggerProvider.addLogRecordProcessor(processor);
          console.log('OpenTelemetry Logs Provider initialized with single modular exporter');
        } else {
          console.warn('No logs exporters found. Please import at least one logs exporter module.');
        }
      }
    } catch (error) {
      console.error('Failed to get logs exporters from dependency injection:', error);
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