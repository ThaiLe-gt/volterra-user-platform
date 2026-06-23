"use client";

import { useEffect } from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Lightweight confirmation modal (no Radix dependency). Used to gate hardware
 * control writes behind an explicit confirm step.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Apply",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? "Applying…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
