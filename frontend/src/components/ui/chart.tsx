"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("w-full", className)}>
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip({ content, ...props }: TooltipProps<any, any> & { content?: any }) {
  return <Tooltip {...props} content={content} />;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
}) {
  const ctx = React.useContext(ChartContext);
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium">{String(label ?? "")}</div>
      <div className="space-y-1">
        {payload.map((p) => {
          const key = String(p.dataKey);
          const meta = ctx?.config?.[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: p.color || meta?.color || "currentColor" }}
                />
                <span className="text-muted-foreground truncate">
                  {meta?.label || key}
                </span>
              </div>
              <span className="font-medium tabular-nums">{String(p.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
