"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DataPoint = {
  time: string;
  cpu: number;
};

type Props = {
  data?: DataPoint[];
};

type LiveCpuResponse = {
  success: boolean;
  point?: {
    time: string;
    cpu: number;
    totalCpuMillicores: number;
    nodeCount: number;
  };
  error?: string;
};

function normalizeFallbackData(data?: DataPoint[]) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => ({
      time: typeof item.time === "string" ? item.time : "",
      cpu:
        typeof item.cpu === "number" && !Number.isNaN(item.cpu) ? item.cpu : 0,
    }))
    .filter((item) => item.time !== "");
}

export default function CpuUsageChart({ data: fallbackData = [] }: Props) {
  const [liveData, setLiveData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPoint() {
      try {
        const response = await fetch("/api/cluster/cpu-live", {
          cache: "no-store",
        });

        const data: LiveCpuResponse = await response.json();

        if (!response.ok || !data.success || !data.point) {
          throw new Error(data.error || "Failed to load live CPU point");
        }

        if (isMounted) {
          setLiveData((previous) => {
            const next = [...previous, { time: data.point!.time, cpu: data.point!.cpu }];
            return next.slice(-20);
          });
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message ?? "Unknown error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPoint();

    const interval = setInterval(loadPoint, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const displayedData = useMemo(() => {
    if (liveData.length > 0) {
      return liveData;
    }

    return normalizeFallbackData(fallbackData);
  }, [liveData, fallbackData]);

  const maxCpu = useMemo(() => {
    if (displayedData.length === 0) {
      return 10;
    }

    const maxValue = Math.max(...displayedData.map((item) => item.cpu));
    return Math.max(10, maxValue + 5);
  }, [displayedData]);

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Resource monitoring
        </div>

        <h2 className="text-2xl font-semibold text-white">CPU Usage Trend</h2>

        <p className="mt-2 text-sm text-slate-400">
          Live observed pod CPU usage over time for the current environment
        </p>

        {loading && (
          <p className="mt-3 text-xs text-slate-500">
            Loading live CPU trend...
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Live CPU trend could not be updated. Showing available data. Error:{" "}
            {error}
          </div>
        )}
      </div>

      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayedData}>
            <defs>
              <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
              domain={[0, maxCpu]}
              width={40}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                border: "1px solid #1e293b",
                borderRadius: "16px",
                color: "#e2e8f0",
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value) => [`${value}%`, "CPU"]}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#22d3ee"
              strokeWidth={3}
              fill="url(#cpuFill)"
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}