import { PLATFORM_ID, Injector, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NodeTracerProvider, NodeSDK } from '@opentelemetry/auto-instrumentations-node';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

import { OpenTelemetryConfig } from '../../configuration/opentelemetry-config';
import { 
  IExporter, 
  OTEL_EXPORTER, 
  OTEL_EXPORTERS 
} from './exporter.interface';
import { CompositeSpanExporter } from './composite/composite-span-exporter';

/**
 * Factory function to create TracerProvider supporting multiple exporters
 * Supports both single exporter (backwards compatibility) and multiple exporters
 */
export function createSpanProviderMulti(
  config: OpenTelemetryConfig,
  platformId: Object,
  injector: Injector
): WebTracerProvider | null {
  if (!isPlatformBrowser(platformId)) {
    return null;
  }

  try {
    // Create resource with service information
    const resource = Resource.default().merge(
      new Resource({
        [ATTR_SERVICE_NAME]: config.commonConfig.serviceName,
        [ATTR_SERVICE_VERSION]: '1.0.0',
        ...config.commonConfig.resourceAttributes
      })
    );

    // Create WebTracerProvider
    const provider = new WebTracerProvider({
      resource
    });

    // Get exporters from dependency injection
    const exporters = getSpanExportersFromDI(injector, config);
    
    if (exporters.length > 0) {
      const processor = createSpanProcessor(exporters, config);
      provider.addSpanProcessor(processor);
      
      console.log(`OpenTelemetry Span Provider initialized with ${exporters.length} exporter(s)`);
    } else {
      console.warn('No span exporters found');
    }

    return provider;

  } catch (error) {
    console.error('Failed to initialize OpenTelemetry Span Provider (multi):', error);
    return null;
  }
}

/**
 * Get span exporters from dependency injection
 * Tries multiple exporters first, then falls back to single exporter
 */
function getSpanExportersFromDI(injector: Injector, config: OpenTelemetryConfig): any[] {
  const exporters: any[] = [];

  try {
    // Try to get multiple exporters first
    const multiExporters = injector.get<IExporter[]>(OTEL_EXPORTERS, null);
    if (multiExporters && multiExporters.length > 0) {
      multiExporters.forEach(spanExporter => {
        try {
          const exporter = spanExporter.getExporter();
          if (exporter) {
            exporters.push(exporter);
          }
        } catch (error) {
          console.warn('Failed to get exporter from multi-provider:', error);
        }
      });
      
      if (exporters.length > 0) {
        console.log(`Found ${exporters.length} span exporters via multi-provider injection`);
        return exporters;
      }
    }
  } catch (error) {
    // Multi-exporters not available, try single exporter
  }

  try {
    // Fallback to single exporter (backwards compatibility)
    const singleExporter = injector.get<IExporter>(OTEL_EXPORTER, null);
    if (singleExporter) {
      const exporter = singleExporter.getExporter();
      if (exporter) {
        exporters.push(exporter);
        console.log('Found 1 span exporter via single-provider injection');
      }
    }
  } catch (error) {
    console.warn('No span exporters found in dependency injection:', error);
  }

  return exporters;
}

/**
 * Create appropriate processor for single or multiple exporters
 */
function createSpanProcessor(exporters: any[], config: OpenTelemetryConfig): any {
  const isProduction = config.commonConfig.production ?? false;
  
  if (exporters.length === 1) {
    // Single exporter - direct processor
    return isProduction
      ? new BatchSpanProcessor(exporters[0], config.batchSpanProcessorConfig)
      : new SimpleSpanProcessor(exporters[0]);
  } else {
    // Multiple exporters - use composite
    const compositeExporter = new CompositeSpanExporter(exporters, 'parallel');
    
    return isProduction
      ? new BatchSpanProcessor(compositeExporter, config.batchSpanProcessorConfig)
      : new SimpleSpanProcessor(compositeExporter);
  }
}

/**
 * Factory function for Angular dependency injection
 */
export function spanProviderMultiFactory(
  config: OpenTelemetryConfig,
  platformId: Object,
  injector: Injector
): WebTracerProvider | null {
  return createSpanProviderMulti(config, platformId, injector);
}