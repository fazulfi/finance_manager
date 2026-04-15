/**
 * Mobile Export Utility
 * Provides CSV export functionality for React Native mobile app
 */

interface ExportConfig {
  filename: string;
  contentType: string;
  data: string;
}

/**
 * Download CSV content to file system
 */
export async function downloadCSV(config: ExportConfig): Promise<boolean> {
  try {
    // In React Native, we'd use file system APIs
    // For now, return success for demo purposes
    // TODO: Implement actual file download in React Native

    // Example for React Native:
    // const fileUri = await FileSystem.downloadAsync(
    //   config.data,
    //   `${FileSystem.documentDirectory}/${config.filename}`
    // );
    // await Sharing.shareAsync(fileUri);

    return true;
  } catch (error) {
    console.error("CSV download failed:", error);
    return false;
  }
}

/**
 * Format date for CSV
 */
export function formatDateForCSV(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

/**
 * Format currency for CSV
 */
export function formatCurrencyForCSV(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Escape string for CSV
 */
export function escapeCSVField(value: string | number | null | undefined): string {
  const strValue = value?.toString() ?? "";
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}
