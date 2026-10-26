"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = "items",
}: AdminPaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-sand)] bg-white px-5 py-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--color-navy)]/65">
      {/* Items counter & Page size selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          Showing <span className="font-bold text-[var(--color-navy)]">{startItem}</span> to{" "}
          <span className="font-bold text-[var(--color-navy)]">{endItem}</span> of{" "}
          <span className="font-bold text-[var(--color-navy)]">{totalItems}</span> {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-[var(--color-sand)]/70 pl-3">
            <span className="text-[11px] text-[var(--color-navy)]/50">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
              className="h-7 rounded-lg border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 px-2 py-0.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]/20 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page navigation controls */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        {/* Previous page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          title="Previous page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-sand)] bg-white text-[var(--color-navy)] disabled:opacity-30 disabled:pointer-events-none hover:bg-[var(--color-sand)]/20 transition-all shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-stone-400 select-none">
                  •••
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  isActive
                    ? "bg-[var(--color-navy)] text-white shadow-sm"
                    : "border border-[var(--color-sand)] bg-white text-[var(--color-navy)]/70 hover:bg-[var(--color-sand)]/25"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage >= totalPages}
          title="Next page"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-sand)] bg-white text-[var(--color-navy)] disabled:opacity-30 disabled:pointer-events-none hover:bg-[var(--color-sand)]/20 transition-all shadow-2xs cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
