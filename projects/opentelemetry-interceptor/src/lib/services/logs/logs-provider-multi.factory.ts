import { PLATFORM_ID, Injector, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerProvider } from '@opentelemetry/api-logs';
import { LoggerProvider as SDKLoggerProvider, BatchLogRecordProcessor, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { OpenTelemetryConfig } from '../../configuration/opentelemetry-config';
import { 
  ILogsExporter, 
  OTEL_LOGS_EXPORTER, 
  OTEL_LOGS_EXPORTERS 
} from '../exporter/exporter.interface';
import { CompositeLogRecordExporter } from '../exporter/composite/composite-log-record-exporter';

/**
 * Factory function to create LoggerProvider supporting multiple exporters
 * Supports both single exporter (backwards compatibility) and multiple exporters
 */
export function createLogsProviderMulti(
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

    // Get exporters from dependency injection
    const exporters = getLogsExportersFromDI(injector, config);
    
    if (exporters.length > 0) {
      const processor = createLogsProcessor(exporters, config);
      loggerProvider.addLogRecordProcessor(processor);
      
      console.log(`OpenTelemetry Logs Provider initialized with ${exporters.length} exporter(s)`);
    } else {
      console.warn('No logs exporters found');
    }

    return loggerProvider;

  } catch (error) {
    console.error('Failed to initialize OpenTelemetry Logs Provider (multi):', error);
    return null;
  }
}

/**
 * Get logs exporters from dependency injection
 * Tries multiple exporters first, then falls back to single exporter
 */
function getLogsExportersFromDI(injector: Injector, config: OpenTelemetryConfig): any[] {
  const exporters: any[] = [];

  try {
    // Try to get multiple exporters first
    const multiExporters = injector.get<ILogsExporter[]>(OTEL_LOGS_EXPORTERS, null);
    if (multiExporters && multiExporters.length > 0) {
      multiExporters.forEach(logsExporter => {
        try {
          const exporter = logsExporter.getExporter();
          if (exporter) {
            exporters.push(exporter);
          }
        } catch (error) {
          console.warn('Failed to get exporter from multi-provider:', error);
        }
      });
      
      if (exporters.length > 0) {
        console.log(`Found ${exporters.length} exporters via multi-provider injection`);
        return exporters;
      }
    }
  } catch (error) {
    // Multi-exporters not available, try single exporter
  }

  try {
    // Fallback to single exporter (backwards compatibility)
    const singleExporter = injector.get<ILogsExporter>(OTEL_LOGS_EXPORTER, null);
    if (singleExporter) {
      const exporter = singleExporter.getExporter();
      if (exporter) {
        exporters.push(exporter);
        console.log('Found 1 exporter via single-provider injection');
      }
    }
  } catch (error) {
    console.warn('No logs exporters found in dependency injection:', error);
  }

  return exporters;
}

/**
 * Create appropriate processor for single or multiple exporters
 */
function createLogsProcessor(exporters: any[], config: OpenTelemetryConfig): any {
  const isProduction = config.commonConfig.production ?? false;
  
  if (exporters.length === 1) {
    // Single exporter - direct processor
    return isProduction
      ? new BatchLogRecordProcessor(exporters[0])
      : new SimpleLogRecordProcessor(exporters[0]);
  } else {
    // Multiple exporters - use composite
    const strategy = config.multiLogsExporters?.strategy || 'parallel';
    const compositeExporter = new CompositeLogRecordExporter(exporters, strategy);
    
    return isProduction
      ? new BatchLogRecordProcessor(compositeExporter)
      : new SimpleLogRecordProcessor(compositeExporter);
  }
}

/**
 * Factory function for Angular dependency injection
 */
export function logsProviderMultiFactory(
  config: OpenTelemetryConfig,
  platformId: Object,
  injector: Injector
): LoggerProvider | null {
  return createLogsProviderMulti(config, platformId, injector);
}