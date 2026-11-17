import { useCallback, useEffect, useState } from 'react';

export interface QueuedSyncItem {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  description: string;
}

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  pendingQueue: QueuedSyncItem[];
  lastSyncedAt: Date | null;
  syncNow: () => Promise<void>;
  enqueueSync: (type: string, description: string, payload?: any) => void;
  clearQueue: () => void;
  toggleSimulatedOffline: () => void;
  isSimulatedOffline: boolean;
}

const SYNC_QUEUE_KEY = 'billpro.sync.queue.v1';
const LAST_SYNC_KEY = 'billpro.sync.lastSynced.v1';

export function useOfflineSync(onSyncSuccess?: () => void): OfflineSyncState {
  const [networkOnline, setNetworkOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingQueue, setPendingQueue] = useState<QueuedSyncItem[]>(() => {
    try {
      const saved = localStorage.getItem(SYNC_QUEUE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_SYNC_KEY);
      return saved ? new Date(saved) : new Date();
    } catch {
      return new Date();
    }
  });

  const isOnline = networkOnline && !isSimulatedOffline;

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(pendingQueue));
    } catch {
      // ignore
    }
  }, [pendingQueue]);

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);

    try {
      // Simulate server batch sync verification & flush
      await new Promise(resolve => setTimeout(resolve, 1200));
      setPendingQueue([]);
      const now = new Date();
      setLastSyncedAt(now);
      try {
        localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      } catch {
        // ignore
      }
      onSyncSuccess?.();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, onSyncSuccess]);

  // When coming back online, auto-sync if queue has items
  useEffect(() => {
    if (isOnline && pendingQueue.length > 0 && !isSyncing) {
      void syncNow();
    }
  }, [isOnline, pendingQueue.length, isSyncing, syncNow]);

  const enqueueSync = useCallback((type: string, description: string, payload: any = {}) => {
    const newItem: QueuedSyncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      description,
      payload,
      timestamp: new Date().toISOString(),
    };
    setPendingQueue(prev => [newItem, ...prev]);
  }, []);

  const clearQueue = useCallback(() => {
    setPendingQueue([]);
    try {
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline(prev => !prev);
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount: pendingQueue.length,
    pendingQueue,
    lastSyncedAt,
    syncNow,
    enqueueSync,
    clearQueue,
    toggleSimulatedOffline,
    isSimulatedOffline,
  };
}
