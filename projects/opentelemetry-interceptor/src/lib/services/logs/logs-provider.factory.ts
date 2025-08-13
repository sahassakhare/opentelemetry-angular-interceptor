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

    console.log('✅ OpenTelemetry Logs Provider initialized successfully');
    return loggerProvider;

  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry Logs Provider:', error);
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

      // Wrap with retry logic if configured
      const finalExporter = otlpConfig.retry?.enabled 
        ? new RetryableOTLPExporter(otlpExporter, otlpConfig.retry)
        : otlpExporter;

      const processor = isProduction
        ? new BatchLogRecordProcessor(finalExporter)
        : new SimpleLogRecordProcessor(finalExporter);

      loggerProvider.addLogRecordProcessor(processor);
      console.log(`✅ OTLP Logs exporter added: ${logsUrl}`);
    } catch (error) {
      console.error('❌ Failed to add OTLP logs exporter:', error);
    }
  }

  // Add Console exporter
  if (logsExporters.console?.enabled || logsConfig.console) {
    try {
      const consoleExporter = new ConsoleLogRecordExporter();
      const processor = new SimpleLogRecordProcessor(consoleExporter);
      loggerProvider.addLogRecordProcessor(processor);
      console.log('✅ Console Logs exporter added');
    } catch (error) {
      console.error('❌ Failed to add console logs exporter:', error);
    }
  }
}

export function logsProviderFactory(
  config: OpenTelemetryConfig,
  platformId: Object
): LoggerProvider | null {
  return createLogsProvider(config, platformId);
}