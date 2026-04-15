/**
 * Mobile Real-time Sync Hook
 * Polls for updates and syncs data between mobile and web
 */

import { useEffect, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

const POLLING_INTERVAL_MS = 30000; // 30 seconds
const MAX_BACKOFF_MS = 300000; // 5 minutes

interface SyncEvent {
  type: "transaction.created" | "transaction.updated" | "transaction.deleted" | "account.updated";
  data: any;
}

export function useRealtimeSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const queryClient = useQueryClient();

  // Update online status via AppState (React Native)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      setIsOnline(state === "active");
    });
    return () => subscription.remove();
  }, []);

  // Poll for updates
  const pollEvents = useCallback(async () => {
    if (!isOnline) return;

    setIsSyncing(true);
    setError(null);

    try {
      // TODO: Implement actual polling endpoint
      // For now, just simulate sync
      console.log("Polling for updates...");
      setLastSyncTime(new Date());
    } catch (err) {
      setError("Failed to sync updates");
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Poll on interval
  useEffect(() => {
    if (!isOnline) return;

    pollEvents();

    const interval = setInterval(pollEvents, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isOnline, pollEvents]);

  // Handle incoming events
  useEffect(() => {
    // TODO: Implement actual event handling
    // For now, just log events
    const handleMessage = (event: MessageEvent) => {
      try {
        const data: SyncEvent = JSON.parse(event.data);
        console.log("Received sync event:", data);

        // Update local data based on event type
        switch (data.type) {
          case "transaction.created":
          case "transaction.updated":
            // Invalidate transaction queries to refetch
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            break;
          case "transaction.deleted":
            // Remove transaction from local cache
            // TODO: Implement removal logic
            break;
          case "account.updated":
            // Invalidate account queries to refetch
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            break;
        }
      } catch (err) {
        console.error("Failed to parse sync event:", err);
      }
    };

    // TODO: Set up WebSocket/SSE listener
    // window.addEventListener("message", handleMessage);

    return () => {
      // window.removeEventListener("message", handleMessage);
    };
  }, [queryClient]);

  return {
    isSyncing,
    isOnline,
    lastSyncTime,
    error,
  };
}
