import { Injectable, Inject, Optional, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { MeterProvider, Meter, Counter, Histogram, Gauge } from '@opentelemetry/api';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { OTEL_METRICS_CONFIG, OTEL_METRICS_PROVIDER, MetricsConfig } from '../../configuration/opentelemetry-config';

// Web Vitals interfaces
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id: string;
  entries?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class OpenTelemetryMetricsService implements OnDestroy {
  private meter!: Meter;
  private config: MetricsConfig;
  private subscriptions = new Subscription();

  // Standard browser metrics
  private pageLoadHistogram!: Histogram;
  private navigationCounter!: Counter;
  private errorCounter!: Counter;
  private userInteractionCounter!: Counter;

  // Web Vitals metrics
  private lcpHistogram!: Histogram;
  private clsGauge!: Gauge;
  private inpHistogram!: Histogram;
  private fcpHistogram!: Histogram;
  private ttfbHistogram!: Histogram;

  // URL hygiene settings
  private urlHygiene: { stripQuery?: boolean; stripFragment?: boolean };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(OTEL_METRICS_CONFIG) @Optional() config: MetricsConfig | null,
    @Inject(OTEL_METRICS_PROVIDER) @Optional() private meterProvider: MeterProvider | null,
    @Optional() private router: Router | null
  ) {
    this.config = config || { enabled: true };
    this.urlHygiene = this.config.urlHygiene || {};
    
    if (isPlatformBrowser(this.platformId) && this.config.enabled && this.meterProvider) {
      this.initializeMetrics();
      this.initializeWebVitals();
      this.initializeRouterMetrics();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Initialize OpenTelemetry metrics
   */
  private initializeMetrics(): void {
    try {
      this.meter = this.meterProvider!.getMeter('angular-app', '1.0.0');

      // Page load metrics
      this.pageLoadHistogram = this.meter.createHistogram('browser.page.load_time', {
        description: 'Page load time in seconds',
        unit: 's'
      });

      // Navigation metrics
      this.navigationCounter = this.meter.createCounter('browser.navigation.count', {
        description: 'Number of navigations'
      });

      // Error metrics
      this.errorCounter = this.meter.createCounter('browser.errors.count', {
        description: 'Number of browser errors'
      });

      // User interaction metrics
      this.userInteractionCounter = this.meter.createCounter('browser.interactions.count', {
        description: 'Number of user interactions'
      });

      // Web Vitals metrics
      if (this.config.webVitals) {
        this.initializeWebVitalsMetrics();
      }

      console.log('OpenTelemetry Metrics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry Metrics:', error);
    }
  }

  /**
   * Initialize Web Vitals specific metrics
   */
  private initializeWebVitalsMetrics(): void {
    const boundaries = this.config.histogramBoundariesMs || [100, 300, 1000, 3000, 5000];
    const boundariesSeconds = boundaries.map(ms => ms / 1000);

    this.lcpHistogram = this.meter.createHistogram('browser.web_vital.lcp', {
      description: 'Largest Contentful Paint',
      unit: 's'
    });

    this.clsGauge = this.meter.createGauge('browser.web_vital.cls', {
      description: 'Cumulative Layout Shift'
    });

    this.inpHistogram = this.meter.createHistogram('browser.web_vital.inp', {
      description: 'Interaction to Next Paint',
      unit: 's'
    });

    if (this.config.collectFCP) {
      this.fcpHistogram = this.meter.createHistogram('browser.web_vital.fcp', {
        description: 'First Contentful Paint',
        unit: 's'
      });
    }

    if (this.config.collectTTFB) {
      this.ttfbHistogram = this.meter.createHistogram('browser.web_vital.ttfb', {
        description: 'Time to First Byte',
        unit: 's'
      });
    }
  }

  /**
   * Initialize Web Vitals collection
   */
  private async initializeWebVitals(): Promise<void> {
    if (!this.config.webVitals || !isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      // Dynamically import web-vitals
      const { onCLS, onLCP, onINP, onFCP, onTTFB } = await import('web-vitals');

      // Largest Contentful Paint
      onLCP((metric: WebVitalMetric) => {
        this.recordWebVital('lcp', metric);
      });

      // Cumulative Layout Shift
      onCLS((metric: WebVitalMetric) => {
        this.recordWebVital('cls', metric);
      });

      // Interaction to Next Paint
      onINP((metric: WebVitalMetric) => {
        this.recordWebVital('inp', metric);
      });

      // First Contentful Paint
      if (this.config.collectFCP && this.fcpHistogram) {
        onFCP((metric: WebVitalMetric) => {
          this.recordWebVital('fcp', metric);
        });
      }

      // Time to First Byte
      if (this.config.collectTTFB && this.ttfbHistogram) {
        onTTFB((metric: WebVitalMetric) => {
          this.recordWebVital('ttfb', metric);
        });
      }

      console.log('Web Vitals collection initialized');
    } catch (error) {
      console.warn('Web Vitals not available:', error);
    }
  }

  /**
   * Initialize Router-based metrics for SPA navigation
   */
  private initializeRouterMetrics(): void {
    if (!this.router) return;

    const navigationSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.recordNavigation(event.url);
      });

    this.subscriptions.add(navigationSub);
  }

  /**
   * Record Web Vital metric
   */
  private recordWebVital(type: string, metric: WebVitalMetric): void {
    const valueInSeconds = metric.value / 1000;
    const sanitizedUrl = this.sanitizeUrl(window.location.pathname);

    const attributes = {
      'web_vital.name': metric.name,
      'web_vital.rating': metric.rating,
      'web_vital.id': metric.id,
      'page.url': sanitizedUrl,
      'page.referrer': document.referrer
    };

    if (this.config.console) {
      console.log(`Web Vital [${type.toUpperCase()}]:`, {
        value: metric.value,
        rating: metric.rating,
        url: sanitizedUrl
      });
    }

    switch (type) {
      case 'lcp':
        this.lcpHistogram?.record(valueInSeconds, attributes);
        break;
      case 'cls':
        this.clsGauge?.record(metric.value, attributes);
        break;
      case 'inp':
        this.inpHistogram?.record(valueInSeconds, attributes);
        break;
      case 'fcp':
        this.fcpHistogram?.record(valueInSeconds, attributes);
        break;
      case 'ttfb':
        this.ttfbHistogram?.record(valueInSeconds, attributes);
        break;
    }
  }

  /**
   * Record page load time
   */
  recordPageLoad(loadTime: number, url?: string): void {
    if (!this.pageLoadHistogram) return;

    const sanitizedUrl = this.sanitizeUrl(url || window.location.pathname);
    
    this.pageLoadHistogram.record(loadTime / 1000, {
      'page.url': sanitizedUrl,
      'page.referrer': document.referrer
    });

    if (this.config.console) {
      console.log(`Page Load: ${loadTime}ms for ${sanitizedUrl}`);
    }
  }

  /**
   * Record navigation event
   */
  recordNavigation(url: string): void {
    if (!this.navigationCounter) return;

    const sanitizedUrl = this.sanitizeUrl(url);
    
    this.navigationCounter.add(1, {
      'navigation.type': 'spa',
      'page.url': sanitizedUrl
    });

    if (this.config.console) {
      console.log(`Navigation: ${sanitizedUrl}`);
    }
  }

  /**
   * Record error occurrence
   */
  recordError(errorType: string, message?: string): void {
    if (!this.errorCounter) return;

    this.errorCounter.add(1, {
      'error.type': errorType,
      'error.message': message || 'Unknown error',
      'page.url': this.sanitizeUrl(window.location.pathname)
    });

    if (this.config.console) {
      console.log(`Error: ${errorType} - ${message}`);
    }
  }

  /**
   * Record user interaction
   */
  recordInteraction(interactionType: string, target?: string): void {
    if (!this.userInteractionCounter) return;

    this.userInteractionCounter.add(1, {
      'interaction.type': interactionType,
      'interaction.target': target || 'unknown',
      'page.url': this.sanitizeUrl(window.location.pathname)
    });

    if (this.config.console) {
      console.log(`Interaction: ${interactionType} on ${target}`);
    }
  }

  /**
   * Record custom metric
   */
  recordCustomCounter(name: string, value: number = 1, attributes: Record<string, string> = {}): void {
    try {
      const counter = this.meter.createCounter(`browser.custom.${name}`, {
        description: `Custom counter: ${name}`
      });
      
      counter.add(value, {
        ...attributes,
        'page.url': this.sanitizeUrl(window.location.pathname)
      });

      if (this.config.console) {
        console.log(`Custom Counter [${name}]: ${value}`, attributes);
      }
    } catch (error) {
      console.warn(`Failed to record custom counter ${name}:`, error);
    }
  }

  /**
   * Record custom histogram
   */
  recordCustomHistogram(name: string, value: number, attributes: Record<string, string> = {}): void {
    try {
      const histogram = this.meter.createHistogram(`browser.custom.${name}`, {
        description: `Custom histogram: ${name}`
      });
      
      histogram.record(value, {
        ...attributes,
        'page.url': this.sanitizeUrl(window.location.pathname)
      });

      if (this.config.console) {
        console.log(`Custom Histogram [${name}]: ${value}`, attributes);
      }
    } catch (error) {
      console.warn(`Failed to record custom histogram ${name}:`, error);
    }
  }

  /**
   * Sanitize URL based on hygiene settings
   */
  private sanitizeUrl(url: string): string {
    let sanitized = url;

    if (this.urlHygiene.stripQuery) {
      sanitized = sanitized.split('?')[0];
    }

    if (this.urlHygiene.stripFragment) {
      sanitized = sanitized.split('#')[0];
    }

    return sanitized;
  }
}