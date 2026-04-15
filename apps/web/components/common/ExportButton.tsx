"use client";

import type { MouseEvent, ReactNode } from "react";

interface ExportButtonProps {
  type: "transactions" | "accounts" | "budgets";
  filters?: Record<string, unknown>;
  filename?: string;
  className?: string;
  children?: ReactNode;
}

export function ExportButton({
  type,
  filters = {},
  filename,
  className = "",
  children,
}: ExportButtonProps) {
  const handleExport = async () => {
    try {
      // Build query params from filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, JSON.stringify(value));
        }
      });

      // Get filename from API or use default
      const url = `/api/export/${type}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get("Content-Disposition");
      const downloadName =
        filename ||
        extractFilename(contentDisposition) ||
        `${type}_${new Date().toISOString().split("T")[0]}.csv`;

      // Convert response to blob and download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Export failed:", error);
      // Show error to user via toast or alert if needed
      alert("Gagal mengekspor data. Silakan coba lagi.");
    }
  };

  const extractFilename = (contentDisposition: string | null): string | null => {
    if (!contentDisposition) return null;
    const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    return matches && matches[1] ? matches[1].replace(/['"]/g, "") : null;
  };

  return (
    <button
      onClick={handleExport}
      type="button"
      className={`px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium ${className}`}
    >
      {children || (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Export CSV
        </>
      )}
    </button>
  );
}
