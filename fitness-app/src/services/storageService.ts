// services/storageService.ts
// Service pour gérer le stockage local et la synchronisation offline - VERSION CORRIGÉE

interface CachedData {
  data: any;
  timestamp: number;
  expiry?: number;
}

interface SyncQueue {
  id: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class StorageService {
  private readonly PREFIX = 'fitness_app_';
  private readonly SYNC_QUEUE_KEY = 'sync_queue';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24h
  private isStorageAvailable: boolean = false;

  constructor() {
    this.checkStorageAvailability();
  }

  // FIXED: Check localStorage availability
  private checkStorageAvailability(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const testKey = this.PREFIX + 'test';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        this.isStorageAvailable = true;
        console.log('LocalStorage available');
      } else {
        this.isStorageAvailable = false;
        console.warn('LocalStorage not available - running in memory mode');
      }
    } catch (error) {
      this.isStorageAvailable = false;
      console.warn('LocalStorage access denied - running in memory mode:', error);
    }
  }

  private inMemoryStorage: Map<string, CachedData> = new Map();

  // ========== STOCKAGE LOCAL BASIQUE ==========
  
  set<T>(key: string, value: T, expiryHours?: number): boolean {
    if (!key || value === undefined) {
      console.warn('Invalid parameters for storage set');
      return false;
    }

    try {
      const expiry = expiryHours ? Date.now() + (expiryHours * 60 * 60 * 1000) : undefined;
      const cachedData: CachedData = {
        data: value,
        timestamp: Date.now(),
        expiry
      };
      
      if (this.isStorageAvailable) {
        localStorage.setItem(this.PREFIX + key, JSON.stringify(cachedData));
      } else {
        this.inMemoryStorage.set(this.PREFIX + key, cachedData);
      }
      
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      // Fallback to in-memory storage
      try {
        const expiry = expiryHours ? Date.now() + (expiryHours * 60 * 60 * 1000) : undefined;
        const cachedData: CachedData = { data: value, timestamp: Date.now(), expiry };
        this.inMemoryStorage.set(this.PREFIX + key, cachedData);
        return true;
      } catch (fallbackError) {
        console.error('Fallback storage also failed:', fallbackError);
        return false;
      }
    }
  }

  get<T>(key: string): T | null {
    if (!key) {
      return null;
    }

    try {
      let item: string | null = null;
      let cachedData: CachedData;

      if (this.isStorageAvailable) {
        item = localStorage.getItem(this.PREFIX + key);
        if (!item) return null;
        cachedData = JSON.parse(item);
      } else {
        const memoryData = this.inMemoryStorage.get(this.PREFIX + key);
        if (!memoryData) return null;
        cachedData = memoryData;
      }
      
      // Check expiry
      if (cachedData.expiry && Date.now() > cachedData.expiry) {
        this.remove(key);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  remove(key: string): boolean {
    if (!key) {
      return false;
    }

    try {
      if (this.isStorageAvailable) {
        localStorage.removeItem(this.PREFIX + key);
      } else {
        this.inMemoryStorage.delete(this.PREFIX + key);
      }
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  clear(): boolean {
    try {
      if (this.isStorageAvailable) {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.PREFIX));
        keys.forEach(key => localStorage.removeItem(key));
      } else {
        const keys = Array.from(this.inMemoryStorage.keys()).filter(key => key.startsWith(this.PREFIX));
        keys.forEach(key => this.inMemoryStorage.delete(key));
      }
      console.log('Storage cleared');
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  // ========== CACHE INTELLIGENT ==========
  
  cacheUserProfile(userId: string, profile: any): void {
    if (!userId || !profile) {
      console.warn('Invalid parameters for cacheUserProfile');
      return;
    }
    this.set(`user_profile_${userId}`, profile, 48);
  }

  getCachedUserProfile(userId: string): any | null {
    if (!userId) return null;
    return this.get(`user_profile_${userId}`);
  }

  cacheWeatherData(city: string, weather: any): void {
    if (!city || !weather) {
      console.warn('Invalid parameters for cacheWeatherData');
      return;
    }
    this.set(`weather_${city.toLowerCase()}`, weather, 1);
  }

  getCachedWeatherData(city: string): any | null {
    if (!city) return null;
    return this.get(`weather_${city.toLowerCase()}`);
  }

  cacheSessions(userId: string, sessions: any[]): void {
    if (!userId || !Array.isArray(sessions)) {
      console.warn('Invalid parameters for cacheSessions');
      return;
    }
    this.set(`sessions_${userId}`, sessions, 24);
  }

  getCachedSessions(userId: string): any[] | null {
    if (!userId) return null;
    const sessions = this.get(`sessions_${userId}`);
    return Array.isArray(sessions) ? sessions : null;
  }

  cacheStats(userId: string, stats: any): void {
    if (!userId || !stats) {
      console.warn('Invalid parameters for cacheStats');
      return;
    }
    this.set(`stats_${userId}`, stats, 12);
  }

  getCachedStats(userId: string): any | null {
    if (!userId) return null;
    return this.get(`stats_${userId}`);
  }

  // ========== GESTION OFFLINE ==========
  
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  addToSyncQueue(action: 'create' | 'update' | 'delete', collection: string, data: any): void {
    if (!action || !collection || !data) {
      console.warn('Invalid parameters for addToSyncQueue');
      return;
    }

    try {
      const syncQueue = this.getSyncQueue();
      const queueItem: SyncQueue = {
        id: Date.now().toString() + Math.random().toString(36),
        action,
        collection,
        data,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      syncQueue.push(queueItem);
      this.set(this.SYNC_QUEUE_KEY, syncQueue);
      console.log('Action added to sync queue:', action, collection);
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  getSyncQueue(): SyncQueue[] {
    const queue = this.get<SyncQueue[]>(this.SYNC_QUEUE_KEY);
    return Array.isArray(queue) ? queue : [];
  }

  async syncPendingData(firestoreService: any): Promise<number> {
    if (!this.isOnline()) {
      console.log('Offline - sync postponed');
      return 0;
    }

    const syncQueue = this.getSyncQueue();
    if (syncQueue.length === 0) {
      return 0;
    }

    let syncedCount = 0;
    const remainingQueue: SyncQueue[] = [];

    for (const item of syncQueue) {
      try {
        await this.executeSyncItem(item, firestoreService);
        syncedCount++;
      } catch (error) {
        console.error('Sync error:', error);
        item.retryCount++;
        
        if (item.retryCount < 3) {
          remainingQueue.push(item);
        } else {
          console.warn('Item abandoned after 3 attempts:', item);
        }
      }
    }

    this.set(this.SYNC_QUEUE_KEY, remainingQueue);
    
    if (syncedCount > 0) {
      console.log(`${syncedCount} items synced`);
    }

    return syncedCount;
  }

  private async executeSyncItem(item: SyncQueue, firestoreService: any): Promise<void> {
    if (!item || !firestoreService) {
      throw new Error('Invalid sync parameters');
    }

    switch (item.collection) {
      case 'users':
        if (item.action === 'update' && item.data.userId && item.data.profile) {
          await firestoreService.saveUserProfile(item.data.userId, item.data.profile);
        }
        break;
        
      case 'sessions':
        if (item.action === 'create' && item.data.userId) {
          await firestoreService.addActivitySession(item.data);
        }
        break;
        
      case 'weights':
        if (item.action === 'create' && item.data.userId && item.data.weight) {
          await firestoreService.addWeightEntry(item.data.userId, item.data.weight, item.data.notes);
        }
        break;
        
      default:
        throw new Error(`Unsupported collection: ${item.collection}`);
    }
  }

  // ========== SAUVEGARDES AUTOMATIQUES ==========
  
  enableAutoBackup(userId: string, interval: number = 5 * 60 * 1000): NodeJS.Timeout | null {
    if (!userId) {
      console.warn('Cannot enable auto backup: no userId provided');
      return null;
    }

    if (typeof setInterval === 'undefined') {
      console.warn('Auto backup not available in this environment');
      return null;
    }

    const intervalId = setInterval(() => {
      this.createAutoBackup(userId);
    }, interval);
    
    console.log('Auto backup enabled for user:', userId);
    return intervalId;
  }

  private createAutoBackup(userId: string): void {
    if (!userId) {
      return;
    }

    try {
      const backup = {
        userId,
        profile: this.getCachedUserProfile(userId),
        sessions: this.getCachedSessions(userId),
        stats: this.getCachedStats(userId),
        timestamp: Date.now(),
        version: '1.0'
      };
      
      this.set(`backup_${userId}_${Date.now()}`, backup, 7 * 24);
      this.cleanupOldBackups(userId);
      
    } catch (error) {
      console.error('Auto backup error:', error);
    }
  }

  private cleanupOldBackups(userId: string): void {
    if (!userId) {
      return;
    }

    try {
      let keys: string[] = [];
      
      if (this.isStorageAvailable) {
        keys = Object.keys(localStorage)
          .filter(key => key.startsWith(this.PREFIX + `backup_${userId}_`))
          .sort()
          .reverse();
          
        keys.slice(5).forEach(key => {
          localStorage.removeItem(key);
        });
      } else {
        keys = Array.from(this.inMemoryStorage.keys())
          .filter(key => key.startsWith(this.PREFIX + `backup_${userId}_`))
          .sort()
          .reverse();
          
        keys.slice(5).forEach(key => {
          this.inMemoryStorage.delete(key);
        });
      }
      
    } catch (error) {
      console.error('Cleanup backups error:', error);
    }
  }

  getBackups(userId: string): Array<{ key: string; timestamp: number; size: string }> {
    if (!userId) {
      return [];
    }

    try {
      let keys: string[] = [];
      
      if (this.isStorageAvailable) {
        keys = Object.keys(localStorage)
          .filter(key => key.startsWith(this.PREFIX + `backup_${userId}_`));
      } else {
        keys = Array.from(this.inMemoryStorage.keys())
          .filter(key => key.startsWith(this.PREFIX + `backup_${userId}_`));
      }
      
      return keys.map(key => {
        const timestamp = parseInt(key.split('_').pop() || '0');
        let size = '0 KB';
        
        try {
          let data = '';
          if (this.isStorageAvailable) {
            data = localStorage.getItem(key) || '';
          } else {
            const memData = this.inMemoryStorage.get(key);
            data = JSON.stringify(memData) || '';
          }
          size = (data.length / 1024).toFixed(2) + ' KB';
        } catch (error) {
          console.error('Error calculating backup size:', error);
        }
        
        return { key, timestamp, size };
      }).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting backups:', error);
      return [];
    }
  }

  restoreFromBackup(backupKey: string): any | null {
    if (!backupKey) {
      return null;
    }

    try {
      let backup: string | null = null;
      
      if (this.isStorageAvailable) {
        backup = localStorage.getItem(backupKey);
      } else {
        const memData = this.inMemoryStorage.get(backupKey);
        backup = memData ? JSON.stringify(memData) : null;
      }
      
      if (!backup) return null;
      
      const data = JSON.parse(backup);
      console.log('Backup restored from:', new Date(data.timestamp));
      return data;
      
    } catch (error) {
      console.error('Restore backup error:', error);
      return null;
    }
  }

  // ========== EXPORT/IMPORT ==========
  
  exportUserData(userId: string): string | null {
    if (!userId) {
      console.warn('Cannot export: no userId provided');
      return null;
    }

    try {
      const exportData = {
        profile: this.getCachedUserProfile(userId),
        sessions: this.getCachedSessions(userId),
        stats: this.getCachedStats(userId),
        syncQueue: this.getSyncQueue().filter(item => 
          item.data && item.data.userId === userId
        ),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Export error:', error);
      return null;
    }
  }

  importUserData(userId: string, jsonData: string): boolean {
    if (!userId || !jsonData) {
      console.warn('Invalid parameters for import');
      return false;
    }

    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.profile) {
        this.cacheUserProfile(userId, importData.profile);
      }
      
      if (Array.isArray(importData.sessions)) {
        this.cacheSessions(userId, importData.sessions);
      }
      
      if (importData.stats) {
        this.cacheStats(userId, importData.stats);
      }
      
      console.log('Data imported for user:', userId);
      return true;
      
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  // ========== UTILITAIRES ==========
  
  getStorageInfo(): {
    used: string;
    total: string;
    available: string;
    appDataSize: string;
  } {
    const fallbackInfo = {
      used: 'N/A',
      total: 'N/A', 
      available: 'N/A',
      appDataSize: 'N/A'
    };

    try {
      if (!this.isStorageAvailable) {
        const memorySize = this.calculateInMemorySize();
        return {
          used: 'Memory mode',
          total: 'Unlimited',
          available: 'Unlimited',
          appDataSize: (memorySize / 1024).toFixed(2) + ' KB'
        };
      }

      let appDataSize = 0;
      let totalSize = 0;
      
      Object.keys(localStorage).forEach(key => {
        try {
          const item = localStorage.getItem(key) || '';
          const size = item.length;
          totalSize += size;
          
          if (key.startsWith(this.PREFIX)) {
            appDataSize += size;
          }
        } catch (error) {
          // Skip problematic keys
        }
      });
      
      const totalAvailable = 5 * 1024 * 1024; // 5MB estimate
      const available = totalAvailable - totalSize;
      
      return {
        used: (totalSize / 1024).toFixed(2) + ' KB',
        total: (totalAvailable / 1024).toFixed(2) + ' KB',
        available: (available / 1024).toFixed(2) + ' KB',
        appDataSize: (appDataSize / 1024).toFixed(2) + ' KB'
      };
      
    } catch (error) {
      console.error('Storage info error:', error);
      return fallbackInfo;
    }
  }

  private calculateInMemorySize(): number {
    let totalSize = 0;
    try {
      this.inMemoryStorage.forEach((value, key) => {
        if (key.startsWith(this.PREFIX)) {
          totalSize += JSON.stringify(value).length;
        }
      });
    } catch (error) {
      console.error('Memory size calculation error:', error);
    }
    return totalSize;
  }

  hasEnoughSpace(dataSize: number = 1024): boolean {
    try {
      if (!this.isStorageAvailable) {
        return true; // In-memory mode has no fixed limit
      }

      const info = this.getStorageInfo();
      const available = parseFloat(info.available) * 1024;
      return available > dataSize;
    } catch (error) {
      return true; // Assume OK if we can't check
    }
  }

  setupConnectivityListener(callback: (isOnline: boolean) => void): void {
    if (typeof window === 'undefined') {
      console.warn('Connectivity listener not available in server environment');
      return;
    }

    try {
      window.addEventListener('online', () => {
        console.log('Connection restored');
        callback(true);
      });
      
      window.addEventListener('offline', () => {
        console.log('Connection lost - offline mode activated');
        callback(false);
      });
    } catch (error) {
      console.error('Error setting up connectivity listener:', error);
    }
  }

  // Check if storage is working properly
  isStorageWorking(): boolean {
    return this.isStorageAvailable || this.inMemoryStorage.size >= 0;
  }
}

export const storageService = new StorageService();
export type { CachedData, SyncQueue };