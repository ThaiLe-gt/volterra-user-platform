"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { TimeSeriesPoint } from "@/features/data/types/domain";

interface MiniLineChartProps {
  data: TimeSeriesPoint[];
  color?: string;
  height?: number;
}

/** Compact sparkline used inside KPI/stat cards. */
export function MiniLineChart({
  data,
  color = "var(--chart-power)",
  height = 36,
}: MiniLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.75}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
