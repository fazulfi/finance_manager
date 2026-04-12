// apps/mobile/utils/offlineQueue.ts
import { Transaction } from "@finance/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@finance:transaction_queue";
const SYNC_STATUS_KEY = "@finance:sync_status";

export interface QueuedTransaction {
  id: string;
  accountId: string;
  date: Date;
  amount: number;
  currency: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  category: string;
  subcategory?: string;
  project?: string;
  tags?: string[];
  description?: string;
  transferTo?: string;
  isRecurring: boolean;
  recurringRule?: string;
  createdAt: number;
  retryCount: number;
  synced: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: number | null;
  pendingCount: number;
  lastError: string | null;
}

/**
 * Queue a transaction for offline storage
 */
export async function queueTransaction(
  transaction: Omit<QueuedTransaction, "createdAt" | "retryCount" | "synced">,
): Promise<void> {
  try {
    const queue = await getQueue();
    const newItem: QueuedTransaction = {
      ...transaction,
      createdAt: Date.now(),
      retryCount: 0,
      synced: false,
    };
    queue.push(newItem);
    await saveQueue(queue);
    await updateSyncStatus();
  } catch (error) {
    console.error("Failed to queue transaction:", error);
    throw new Error("Failed to queue transaction");
  }
}

/**
 * Get all queued transactions
 */
export async function getQueue(): Promise<QueuedTransaction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to get queue:", error);
    return [];
  }
}

/**
 * Save queue to AsyncStorage
 */
async function saveQueue(queue: QueuedTransaction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to save queue:", error);
    throw new Error("Failed to save queue");
  }
}

/**
 * Remove transaction from queue
 */
export async function removeFromQueue(id: string): Promise<void> {
  try {
    const queue = await getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await saveQueue(filtered);
    await updateSyncStatus();
  } catch (error) {
    console.error("Failed to remove from queue:", error);
    throw new Error("Failed to remove from queue");
  }
}

/**
 * Clear all synced transactions from queue
 */
export async function clearSyncedQueue(): Promise<void> {
  try {
    const queue = await getQueue();
    const unsynced = queue.filter((item) => !item.synced);
    await saveQueue(unsynced);
    await updateSyncStatus();
  } catch (error) {
    console.error("Failed to clear synced queue:", error);
    throw new Error("Failed to clear synced queue");
  }
}

/**
 * Update sync status
 */
async function updateSyncStatus(): Promise<void> {
  try {
    const queue = await getQueue();
    const status: SyncStatus = {
      isOnline: true,
      lastSync: null,
      pendingCount: queue.filter((item) => !item.synced).length,
      lastError: null,
    };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error("Failed to update sync status:", error);
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    return raw
      ? JSON.parse(raw)
      : {
          isOnline: true,
          lastSync: null,
          pendingCount: 0,
          lastError: null,
        };
  } catch (error) {
    console.error("Failed to get sync status:", error);
    return {
      isOnline: true,
      lastSync: null,
      pendingCount: 0,
      lastError: null,
    };
  }
}

/**
 * Set sync status
 */
export async function setSyncStatus(status: Partial<SyncStatus>): Promise<void> {
  try {
    const current = await getSyncStatus();
    const updated = { ...current, ...status };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to set sync status:", error);
  }
}
