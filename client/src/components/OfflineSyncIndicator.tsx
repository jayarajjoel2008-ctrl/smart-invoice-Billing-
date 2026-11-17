import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Check, CheckCircle2, Cloud, CloudOff, Database,
  LoaderCircle, RefreshCw, Wifi, WifiOff, X,
} from 'lucide-react';
import type { OfflineSyncState } from '../useOfflineSync';

interface OfflineSyncIndicatorProps {
  syncState: OfflineSyncState;
  onSimulateAction?: () => void;
}

export function OfflineSyncIndicator({ syncState, onSimulateAction }: OfflineSyncIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    pendingQueue,
    lastSyncedAt,
    syncNow,
    toggleSimulatedOffline,
    isSimulatedOffline,
    enqueueSync,
  } = syncState;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverOpen]);

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleAddSamplePending = () => {
    enqueueSync('DATA_UPDATE', `Queued offline invoice draft #${Math.floor(100 + Math.random() * 900)}`);
  };

  return (
    <div className="offline-sync-container" ref={containerRef}>
      {/* Visual Indicator Pill Button */}
      <button
        type="button"
        className={`offline-sync-badge ${!isOnline ? 'offline' : isSyncing ? 'syncing' : 'synced'}`}
        onClick={() => setPopoverOpen(!popoverOpen)}
        title={
          !isOnline
            ? `Offline mode: ${pendingCount} changes queued`
            : isSyncing
            ? 'Synchronizing data with server...'
            : 'Online: All data synchronized'
        }
        aria-label="Offline sync status"
      >
        {!isOnline ? (
          <>
            <span className="sync-pulse-dot amber" />
            <WifiOff size={14} className="sync-icon amber" />
            <span className="sync-text">Offline</span>
            {pendingCount > 0 && <span className="sync-count-tag">{pendingCount}</span>}
          </>
        ) : isSyncing ? (
          <>
            <LoaderCircle size={14} className="sync-icon cyan spin" />
            <span className="sync-text">Syncing...</span>
            {pendingCount > 0 && <span className="sync-count-tag">{pendingCount}</span>}
          </>
        ) : (
          <>
            <span className="sync-pulse-dot green" />
            <Wifi size={14} className="sync-icon green" />
            <span className="sync-text">Synced</span>
            {pendingCount > 0 && <span className="sync-count-tag">{pendingCount}</span>}
          </>
        )}
      </button>

      {/* Detailed Status & Controls Popover */}
      {popoverOpen && (
        <div className="offline-sync-popover">
          <div className="sync-popover-head">
            <div className="sync-popover-title">
              <Cloud size={16} color="#818CF8" />
              <span>Offline & Cloud Sync</span>
            </div>
            <button
              className="sync-popover-close"
              onClick={() => setPopoverOpen(false)}
              aria-label="Close sync details"
            >
              <X size={14} />
            </button>
          </div>

          <div className="sync-popover-status-card">
            <div className="sync-status-indicator-row">
              <div className="sync-status-icon-wrap">
                {!isOnline ? (
                  <CloudOff size={22} color="#F59E0B" />
                ) : isSyncing ? (
                  <RefreshCw size={22} color="#00F0FF" className="spin" />
                ) : (
                  <CheckCircle2 size={22} color="#10B981" />
                )}
              </div>
              <div className="sync-status-text-wrap">
                <div className="sync-status-headline">
                  {!isOnline ? 'Offline Mode (Local Storage)' : isSyncing ? 'Synchronizing with Cloud' : 'Cloud Sync Active'}
                </div>
                <div className="sync-status-subline">
                  {!isOnline
                    ? 'Working locally. Changes are cached safely and will push when online.'
                    : isSyncing
                    ? 'Transmitting offline mutations and checking database consistency...'
                    : 'All invoices, payments and settings are up-to-date.'}
                </div>
              </div>
            </div>

            <div className="sync-metrics-grid">
              <div className="sync-metric-box">
                <span className="metric-box-label">Connection</span>
                <span className={`metric-box-val ${isOnline ? 'green' : 'amber'}`}>
                  {isOnline ? (isSimulatedOffline ? 'Simulated Offline' : 'Online') : 'Disconnected'}
                </span>
              </div>
              <div className="sync-metric-box">
                <span className="metric-box-label">Pending Queue</span>
                <span className="metric-box-val cyan">{pendingCount} changes</span>
              </div>
              <div className="sync-metric-box">
                <span className="metric-box-label">Last Synchronized</span>
                <span className="metric-box-val">{formatLastSync(lastSyncedAt)}</span>
              </div>
            </div>
          </div>

          {/* Pending items list */}
          {pendingQueue.length > 0 && (
            <div className="sync-queue-preview">
              <div className="sync-queue-title">
                <span>Queued Offline Mutations ({pendingQueue.length})</span>
              </div>
              <div className="sync-queue-list">
                {pendingQueue.slice(0, 4).map(item => (
                  <div key={item.id} className="sync-queue-item">
                    <span className="sync-queue-dot" />
                    <span className="sync-queue-desc">{item.description}</span>
                    <span className="sync-queue-time">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
                {pendingQueue.length > 4 && (
                  <div className="sync-queue-more">+{pendingQueue.length - 4} more queued operations...</div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="sync-popover-actions">
            <button
              className="sync-action-btn primary"
              onClick={() => void syncNow()}
              disabled={isSyncing || !isOnline}
            >
              {isSyncing ? (
                <>
                  <LoaderCircle size={14} className="spin" />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Sync Now</span>
                </>
              )}
            </button>

            <button
              className={`sync-action-btn secondary ${isSimulatedOffline ? 'active' : ''}`}
              onClick={toggleSimulatedOffline}
              title="Toggle simulated offline state to test offline queue"
            >
              {isSimulatedOffline ? (
                <>
                  <Wifi size={14} color="#10B981" />
                  <span>Go Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} color="#F59E0B" />
                  <span>Simulate Offline</span>
                </>
              )}
            </button>

            <button
              className="sync-action-btn ghost"
              onClick={handleAddSamplePending}
              title="Add a sample offline action to test queueing"
            >
              <Database size={13} />
              <span>Queue Test Action</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
