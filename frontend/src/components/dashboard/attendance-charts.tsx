"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function dayLabel(ymd: string) {
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  return format(d, "MMM d");
}

export function WorkedMinutesChart({
  data,
}: {
  data: Array<{ day: string; value: number }>;
}) {
  const chartData = useMemo(
    () => data.map((p) => ({ day: dayLabel(p.day), worked: p.value })),
    [data]
  );

  const config: ChartConfig = {
    worked: { label: "Worked (min)", color: "hsl(var(--foreground))" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Worked minutes</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56">
          <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="worked" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function LateMinutesChart({
  data,
}: {
  data: Array<{ day: string; value: number }>;
}) {
  const chartData = useMemo(
    () => data.map((p) => ({ day: dayLabel(p.day), late: p.value })),
    [data]
  );

  const config: ChartConfig = {
    late: { label: "Late (min)", color: "hsl(var(--foreground))" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Late minutes</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-56">
          <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="late"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
