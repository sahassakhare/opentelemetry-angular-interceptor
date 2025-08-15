import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SerializedTraceContext } from './trace-context-serializer.service';

/**
 * Offline operation with trace context
 */
export interface OfflineOperation {
  id: string;
  type: string;
  data: any;
  traceContext: SerializedTraceContext;
  timestamp: number;
  retryCount: number;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}

/**
 * Background sync operation
 */
export interface BackgroundSyncOperation {
  id: string;
  tag: string;
  traceContext: SerializedTraceContext;
  payload: any;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Storage configuration
 */
export interface OfflineStorageConfig {
  maxOperations: number;
  maxAge: number; // in milliseconds
  storagePrefix: string;
  enableIndexedDB: boolean;
  enableLocalStorage: boolean;
}

/**
 * Service for managing trace context storage for offline operations
 * Handles persistence of trace context across page reloads and offline scenarios
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineTraceStorage {
  
  private readonly defaultConfig: OfflineStorageConfig = {
    maxOperations: 100,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    storagePrefix: 'otel_offline_',
    enableIndexedDB: true,
    enableLocalStorage: true
  };

  private config: OfflineStorageConfig;
  private dbName = 'OtelOfflineStorage';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.config = { ...this.defaultConfig };
    this.initializeStorage();
  }

  /**
   * Configure storage settings
   */
  configure(config: Partial<OfflineStorageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Store offline operation with trace context
   */
  async storeOfflineOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    const operationWithMetadata: OfflineOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0
    };

    try {
      if (this.config.enableIndexedDB && this.db) {
        await this.storeInIndexedDB('offline_operations', operationWithMetadata);
      } else if (this.config.enableLocalStorage) {
        this.storeInLocalStorage('offline_operations', operationWithMetadata.id, operationWithMetadata);
      }

      this.cleanupExpiredOperations();
      return operationWithMetadata.id;
    } catch (error) {
      console.warn('Failed to store offline operation:', error);
      return '';
    }
  }

  /**
   * Retrieve offline operation by ID
   */
  async getOfflineOperation(operationId: string): Promise<OfflineOperation | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      if (this.config.enableIndexedDB && this.db) {
        return await this.getFromIndexedDB('offline_operations', operationId);
      } else if (this.config.enableLocalStorage) {
        return this.getFromLocalStorage('offline_operations', operationId);
      }
    } catch (error) {
      console.warn('Failed to get offline operation:', error);
    }

    return null;
  }

  /**
   * Get all pending offline operations
   */
  async getAllOfflineOperations(): Promise<OfflineOperation[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      if (this.config.enableIndexedDB && this.db) {
        return await this.getAllFromIndexedDB('offline_operations');
      } else if (this.config.enableLocalStorage) {
        return this.getAllFromLocalStorage('offline_operations');
      }
    } catch (error) {
      console.warn('Failed to get all offline operations:', error);
    }

    return [];
  }

  /**
   * Remove offline operation
   */
  async removeOfflineOperation(operationId: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      if (this.config.enableIndexedDB && this.db) {
        await this.removeFromIndexedDB('offline_operations', operationId);
      } else if (this.config.enableLocalStorage) {
        this.removeFromLocalStorage('offline_operations', operationId);
      }
    } catch (error) {
      console.warn('Failed to remove offline operation:', error);
    }
  }

  /**
   * Store background sync operation
   */
  async storeBackgroundSyncOperation(operation: Omit<BackgroundSyncOperation, 'id' | 'timestamp' | 'status'>): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    const syncOperation: BackgroundSyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      if (this.config.enableIndexedDB && this.db) {
        await this.storeInIndexedDB('background_sync', syncOperation);
      } else if (this.config.enableLocalStorage) {
        this.storeInLocalStorage('background_sync', syncOperation.id, syncOperation);
      }

      return syncOperation.id;
    } catch (error) {
      console.warn('Failed to store background sync operation:', error);
      return '';
    }
  }

  /**
   * Update background sync operation status
   */
  async updateBackgroundSyncStatus(operationId: string, status: BackgroundSyncOperation['status']): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      if (this.config.enableIndexedDB && this.db) {
        const operation = await this.getFromIndexedDB('background_sync', operationId);
        if (operation) {
          operation.status = status;
          await this.storeInIndexedDB('background_sync', operation);
        }
      } else if (this.config.enableLocalStorage) {
        const operation = this.getFromLocalStorage('background_sync', operationId);
        if (operation) {
          operation.status = status;
          this.storeInLocalStorage('background_sync', operationId, operation);
        }
      }
    } catch (error) {
      console.warn('Failed to update background sync status:', error);
    }
  }

  /**
   * Store trace context for later retrieval
   */
  async storeTraceContext(key: string, context: SerializedTraceContext): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const contextWithTimestamp = {
        ...context,
        storedAt: Date.now()
      };

      if (this.config.enableIndexedDB && this.db) {
        await this.storeInIndexedDB('trace_contexts', { id: key, ...contextWithTimestamp });
      } else if (this.config.enableLocalStorage) {
        this.storeInLocalStorage('trace_contexts', key, contextWithTimestamp);
      }
    } catch (error) {
      console.warn('Failed to store trace context:', error);
    }
  }

  /**
   * Retrieve stored trace context
   */
  async getTraceContext(key: string): Promise<SerializedTraceContext | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      let storedContext: any;

      if (this.config.enableIndexedDB && this.db) {
        storedContext = await this.getFromIndexedDB('trace_contexts', key);
      } else if (this.config.enableLocalStorage) {
        storedContext = this.getFromLocalStorage('trace_contexts', key);
      }

      if (storedContext && !this.isContextExpired(storedContext)) {
        // Remove the storedAt field before returning
        const { storedAt, ...context } = storedContext;
        return context;
      }
    } catch (error) {
      console.warn('Failed to get trace context:', error);
    }

    return null;
  }

  /**
   * Initialize storage backends
   */
  private async initializeStorage(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.config.enableIndexedDB) {
      await this.initializeIndexedDB();
    }
  }

  /**
   * Initialize IndexedDB
   */
  private initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not available, falling back to localStorage');
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn('Failed to open IndexedDB:', request.error);
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('offline_operations')) {
          db.createObjectStore('offline_operations', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('background_sync')) {
          db.createObjectStore('background_sync', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('trace_contexts')) {
          db.createObjectStore('trace_contexts', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Store data in IndexedDB
   */
  private storeInIndexedDB(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data from IndexedDB
   */
  private getFromIndexedDB(storeName: string, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all data from IndexedDB store
   */
  private getAllFromIndexedDB(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove data from IndexedDB
   */
  private removeFromIndexedDB(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store data in localStorage
   */
  private storeInLocalStorage(namespace: string, key: string, data: any): void {
    const storageKey = `${this.config.storagePrefix}${namespace}_${key}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  /**
   * Get data from localStorage
   */
  private getFromLocalStorage(namespace: string, key: string): any {
    const storageKey = `${this.config.storagePrefix}${namespace}_${key}`;
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get all data from localStorage for a namespace
   */
  private getAllFromLocalStorage(namespace: string): any[] {
    const prefix = `${this.config.storagePrefix}${namespace}_`;
    const results: any[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const data = localStorage.getItem(key);
        if (data) {
          results.push(JSON.parse(data));
        }
      }
    }

    return results;
  }

  /**
   * Remove data from localStorage
   */
  private removeFromLocalStorage(namespace: string, key: string): void {
    const storageKey = `${this.config.storagePrefix}${namespace}_${key}`;
    localStorage.removeItem(storageKey);
  }

  /**
   * Check if context has expired
   */
  private isContextExpired(storedContext: any): boolean {
    if (!storedContext.storedAt) {
      return false;
    }

    return (Date.now() - storedContext.storedAt) > this.config.maxAge;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired operations
   */
  private async cleanupExpiredOperations(): Promise<void> {
    try {
      const operations = await this.getAllOfflineOperations();
      const now = Date.now();

      for (const operation of operations) {
        if ((now - operation.timestamp) > this.config.maxAge) {
          await this.removeOfflineOperation(operation.id);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup expired operations:', error);
    }
  }
}