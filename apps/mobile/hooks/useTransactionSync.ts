// apps/mobile/hooks/useTransactionSync.ts
import { useState, useEffect, useCallback } from "react";
import type { AppStateStatus } from "react-native";
import { AppState } from "react-native";

import type { SyncStatus } from "../utils/offlineQueue";
import { getSyncStatus, setSyncStatus } from "../utils/offlineQueue";

export function useTransactionSync() {
  const [syncStatus, setSyncStatusState] = useState<SyncStatus>({
    isOnline: true,
    lastSync: null,
    pendingCount: 0,
    lastError: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Load initial sync status
  useEffect(() => {
    loadSyncStatus();
  }, []);

  // Track app state changes for online/offline detection
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      handleAppStateChange(nextAppState);
    });

    return () => subscription.remove();
  }, []);

  /**
   * Handle app state changes (foreground/background)
   */
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const wasOnline = syncStatus.isOnline;

    // Update online status based on app state
    if (nextAppState === "active") {
      const online = await checkNetworkConnection();
      await setSyncStatus({ isOnline: online });

      if (online && !wasOnline) {
        // App came online - trigger sync
        await triggerSync();
      }
    }
  };

  /**
   * Check network connection status
   */
  const checkNetworkConnection = async (): Promise<boolean> => {
    try {
      // Check if we can reach tRPC API
      // For now, assume online if app is in foreground
      return true;
    } catch (error) {
      console.error("Network check failed:", error);
      return false;
    }
  };

  /**
   * Load sync status from storage
   */
  const loadSyncStatus = async () => {
    const status = await getSyncStatus();
    setSyncStatusState(status);
  };

  /**
   * Trigger sync of all pending transactions
   */
  const triggerSync = useCallback(async () => {
    if (syncStatus.pendingCount === 0 || isSyncing) {
      return;
    }

    setIsSyncing(true);
    try {
      await setSyncStatus({ lastSync: Date.now() });

      // TODO: Implement actual sync logic with tRPC
      // This will call API procedures to sync queued transactions
      console.log(`Syncing ${syncStatus.pendingCount} pending transactions...`);

      // Simulate successful sync (replace with actual implementation)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update sync status with success
      await setSyncStatus({
        lastSync: Date.now(),
        pendingCount: 0,
        lastError: null,
      });

      setSyncStatusState({
        isOnline: true,
        lastSync: Date.now(),
        pendingCount: 0,
        lastError: null,
      });

      console.log("Sync completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Sync failed:", error);

      await setSyncStatus({
        lastError: errorMessage,
        pendingCount: syncStatus.pendingCount,
      });

      setSyncStatusState({
        ...syncStatus,
        lastError: errorMessage,
      });

      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [syncStatus.pendingCount, isSyncing]);

  /**
   * Retry failed sync
   */
  const retrySync = useCallback(async () => {
    return triggerSync();
  }, [triggerSync]);

  /**
   * Force sync regardless of status
   */
  const forceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await setSyncStatus({ lastSync: Date.now() });
      await triggerSync();
    } finally {
      setIsSyncing(false);
    }
  }, [triggerSync]);

  return {
    syncStatus,
    isSyncing,
    triggerSync,
    retrySync,
    forceSync,
    loadSyncStatus,
  };
}
