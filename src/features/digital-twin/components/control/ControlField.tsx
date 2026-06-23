"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/** Label + control row used across the device-control forms. */
export function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SwitchField({
  label,
  id,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <FieldRow label={label} htmlFor={id}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </FieldRow>
  );
}

export function NumberField({
  label,
  id,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  disabled,
}: {
  label: string;
  id: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}) {
  return (
    <FieldRow label={label} htmlFor={id}>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value === "" ? NaN : Number(event.target.value))
          }
          className="h-8 w-24 text-right"
        />
        {unit && <span className="w-9 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </FieldRow>
  );
}

export interface TimeWindow {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
}

export const EMPTY_WINDOW: TimeWindow = { startH: 0, startM: 0, endH: 0, endM: 0 };

function toTimeStr(hour: number, minute: number): string {
  const h = String(clampInt(hour, 0, 23)).padStart(2, "0");
  const m = String(clampInt(minute, 0, 59)).padStart(2, "0");
  return `${h}:${m}`;
}

function fromTimeStr(value: string): [number, number] {
  const [h, m] = value.split(":");
  return [clampInt(Number(h), 0, 23), clampInt(Number(m), 0, 59)];
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function TimeWindowRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <Input
          type="time"
          className="h-8 w-[7.5rem]"
          disabled={disabled}
          value={toTimeStr(value.startH, value.startM)}
          onChange={(event) => {
            const [h, m] = fromTimeStr(event.target.value);
            onChange({ ...value, startH: h, startM: m });
          }}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="time"
          className="h-8 w-[7.5rem]"
          disabled={disabled}
          value={toTimeStr(value.endH, value.endM)}
          onChange={(event) => {
            const [h, m] = fromTimeStr(event.target.value);
            onChange({ ...value, endH: h, endM: m });
          }}
        />
      </div>
    </div>
  );
}

export function ControlCard({
  title,
  loading,
  children,
}: {
  title: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/60 p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading config…</p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}

export function ApplyButton({
  onClick,
  pending,
}: {
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <Button
      size="sm"
      className="w-full"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "Applying…" : "Apply"}
    </Button>
  );
}
