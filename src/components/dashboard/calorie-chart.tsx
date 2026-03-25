"use client";

import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Period = "day" | "week" | "month";

interface StatsDataPoint {
  date: string;
  calories: number;
  target: number | null;
}

interface StatsResponse {
  data: StatsDataPoint[];
  targetCalories: number | null;
}

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "day", label: "Giorno" },
  { value: "week", label: "Settimana" },
  { value: "month", label: "Mese" },
];

function buildChartConfig(hasTarget: boolean): ChartConfig {
  const config: ChartConfig = {
    calories: {
      label: "Calorie",
      color: "var(--chart-1)",
    },
  };
  if (hasTarget) {
    config.target = {
      label: "Obiettivo",
      color: "var(--chart-2)",
    };
  }
  return config;
}

function isEmptyData(data: StatsDataPoint[]): boolean {
  return data.length === 0 || data.every((d) => d.calories === 0);
}

export function CalorieChart() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<StatsDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meals/stats?period=${p}`);
      if (!res.ok) throw new Error("Fetch failed");
      const json: StatsResponse = await res.json();
      setData(json.data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [period, fetchStats]);

  const hasTarget = data.some((d) => d.target !== null);
  const chartConfig = buildChartConfig(hasTarget);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento calorico</CardTitle>
        <CardAction>
          <div className="flex gap-1">
            {PERIOD_LABELS.map(({ value, label }) => (
              <Button
                key={value}
                variant={period === value ? "default" : "outline"}
                size="xs"
                onClick={() => setPeriod(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Caricamento...
          </div>
        ) : isEmptyData(data) ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Nessun dato disponibile
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string) => {
                  if (period === "month") {
                    const [year, month] = value.split("-");
                    const date = new Date(Number(year), Number(month) - 1);
                    return date.toLocaleDateString("it-IT", { month: "short" });
                  }
                  const date = new Date(value);
                  return date.toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "short",
                  });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={45}
                tickFormatter={(value: number) =>
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      const v = String(value);
                      if (period === "month") {
                        const [year, month] = v.split("-");
                        const date = new Date(Number(year), Number(month) - 1);
                        return date.toLocaleDateString("it-IT", {
                          month: "long",
                          year: "numeric",
                        });
                      }
                      const date = new Date(v);
                      return date.toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      });
                    }}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="calories"
                stroke="var(--color-calories)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              {hasTarget && (
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="var(--color-target)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                />
              )}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
