import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerProvider } from '@opentelemetry/api-logs';
import { LoggerProvider as SDKLoggerProvider } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { ConsoleLogRecordExporter, BatchLogRecordProcessor, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';

import { OpenTelemetryConfig, LogsConfig, LogsExporters } from '../../configuration/opentelemetry-config';
import { RetryableOTLPExporter } from '../retry-utils';

export function createLogsProvider(
  config: OpenTelemetryConfig,
  platformId: Object
): LoggerProvider | null {
  if (!isPlatformBrowser(platformId) || !config.logsConfig?.enabled) {
    return null;
  }

  try {
    const logsConfig = config.logsConfig as LogsConfig;
    const logsExporters = config.logsExporters || {};

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

    // Add exporters based on configuration
    addLogExporters(loggerProvider, config, logsConfig, logsExporters);

    console.log('OpenTelemetry Logs Provider initialized successfully');
    // console.log(`[LOGS-PROVIDER] Created LoggerProvider successfully`);
    return loggerProvider;

  } catch (error) {
    console.error('Failed to initialize OpenTelemetry Logs Provider:', error);
    return null;
  }
}

function addLogExporters(
  loggerProvider: SDKLoggerProvider,
  config: OpenTelemetryConfig,
  logsConfig: LogsConfig,
  logsExporters: LogsExporters
): void {
  const isProduction = config.commonConfig.production ?? false;

  // Debug: Show what exporters configuration we received
  // console.log('[LOGS-EXPORTERS] Received configuration:', {
  //   logsExporters,
  //   hasOtlp: !!logsExporters.otlp,
  //   hasConsole: !!logsExporters.console,
  //   noneEnabled: logsExporters.none?.enabled
  // });

  // Add OTLP exporter
  if (logsExporters.otlp && !logsExporters.none?.enabled) {
    try {
      const otlpConfig = logsExporters.otlp;
      
      // Auto-inherit URL from main otelcolConfig if not specified
      const baseUrl = otlpConfig.url || config.otelcolConfig?.url || 'http://localhost:4318';
      const logsUrl = baseUrl.endsWith('/v1/traces') 
        ? baseUrl.replace('/v1/traces', '/v1/logs')
        : `${baseUrl}/v1/logs`;

      const otlpExporter = new OTLPLogExporter({
        url: logsUrl,
        headers: {
          ...config.otelcolConfig?.headers,
          ...otlpConfig.headers
        },
        timeoutMillis: otlpConfig.timeoutMs || 10000
      });

      // Debug: Wrap the export method to see what's being sent
      const originalExport = otlpExporter.export.bind(otlpExporter);
      otlpExporter.export = (logs: any[], resultCallback: any) => {
        // console.log(`[OTLP-LOGS] Attempting to export ${logs.length} log records to ${logsUrl}`);
        // console.log(`[OTLP-LOGS] First log record:`, logs[0]);
        
        const wrappedCallback = (result: any) => {
          // console.log(`[OTLP-LOGS] Export result:`, result);
          if (result.code !== 0) {
            console.error(`[OTLP-LOGS] Export failed with code ${result.code}:`, result.error);
          } else {
            // console.log(`[OTLP-LOGS] Successfully exported ${logs.length} logs`);
          }
          resultCallback(result);
        };
        
        return originalExport(logs, wrappedCallback);
      };

      // Wrap with retry logic if configured
      const finalExporter = otlpConfig.retry?.enabled 
        ? new RetryableOTLPExporter(otlpExporter, otlpConfig.retry)
        : otlpExporter;

      const processor = isProduction
        ? new BatchLogRecordProcessor(finalExporter)
        : new SimpleLogRecordProcessor(finalExporter);

      loggerProvider.addLogRecordProcessor(processor);
      console.log(`OTLP Logs exporter added: ${logsUrl}`);
      // console.log(`OTLP Logs configuration:`, {
      //   url: logsUrl,
      //   headers: { ...config.otelcolConfig?.headers, ...otlpConfig.headers },
      //   timeoutMillis: otlpConfig.timeoutMs || 10000,
      //   processor: isProduction ? 'BatchLogRecordProcessor' : 'SimpleLogRecordProcessor'
      // });

      // Test if OTLP endpoint is reachable
      // fetch(logsUrl.replace('/v1/logs', '/'), { method: 'HEAD' })
      //   .then(() => console.log(`[OTLP-LOGS] Collector endpoint appears to be reachable`))
      //   .catch(err => console.warn(`[OTLP-LOGS] Collector endpoint may not be reachable:`, err.message));
    } catch (error) {
      console.error('Failed to add OTLP logs exporter:', error);
    }
  } else {
    // console.log('[LOGS-EXPORTERS] OTLP exporter not added:', {
    //   hasOtlp: !!logsExporters.otlp,
    //   noneEnabled: logsExporters.none?.enabled,
    //   condition: !!(logsExporters.otlp && !logsExporters.none?.enabled)
    // });
  }

  // Add Console exporter
  if (logsExporters.console?.enabled || logsConfig.console) {
    try {
      const consoleExporter = new ConsoleLogRecordExporter();
      const processor = new SimpleLogRecordProcessor(consoleExporter);
      loggerProvider.addLogRecordProcessor(processor);
      console.log('Console Logs exporter added - structured OTEL logs will appear in console');
    } catch (error) {
      console.error('Failed to add console logs exporter:', error);
    }
  } else {
    // console.log('[LOGS-EXPORTERS] Console exporter not added:', {
    //   consoleEnabled: logsExporters.console?.enabled,
    //   logsConfigConsole: logsConfig.console
    // });
  }

  // Debug: Show final exporter status
  // console.log('[LOGS-EXPORTERS] Exporter setup completed');
}

export function logsProviderFactory(
  config: OpenTelemetryConfig,
  platformId: Object
): LoggerProvider | null {
  return createLogsProvider(config, platformId);
}