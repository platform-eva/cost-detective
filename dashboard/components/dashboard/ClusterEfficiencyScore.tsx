"use client";

import { useEffect, useMemo, useState } from "react";

type Workload = {
  name: string;
  efficiency?: number;
};

type Props = {
  workloads?: Workload[];
};

type LiveWeakestWorkload = {
  name: string;
  score: number;
  reasons: string[];
  cpuRequest: string;
  actualUsage: string;
};

type LiveEfficiencyResponse = {
  success: boolean;
  clusterScore?: number;
  workloadCount?: number;
  weakestWorkloads?: LiveWeakestWorkload[];
  error?: string;
};

function getScoreColor(score: number) {
  if (score >= 80) {
    return "text-emerald-300";
  }

  if (score >= 60) {
    return "text-amber-300";
  }

  return "text-rose-300";
}

function getProgressColor(score: number) {
  if (score >= 80) {
    return "bg-emerald-400";
  }

  if (score >= 60) {
    return "bg-amber-400";
  }

  return "bg-rose-400";
}

function getScoreLabel(score: number) {
  if (score >= 80) {
    return "Healthy efficiency";
  }

  if (score >= 60) {
    return "Needs optimization";
  }

  return "Low efficiency";
}

function buildFallbackScore(workloads: Workload[]) {
  if (!Array.isArray(workloads) || workloads.length === 0) {
    return 0;
  }

  const validEfficiencies = workloads
    .map((workload) =>
      typeof workload.efficiency === "number" && !Number.isNaN(workload.efficiency)
        ? workload.efficiency
        : null
    )
    .filter((value): value is number => value !== null);

  if (validEfficiencies.length === 0) {
    return 0;
  }

  const total = validEfficiencies.reduce((sum, value) => sum + value, 0);
  return Math.round(total / validEfficiencies.length);
}

function normalizeScore(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function ClusterEfficiencyScore({
  workloads: fallbackWorkloads = [],
}: Props) {
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [weakestWorkloads, setWeakestWorkloads] = useState<
    LiveWeakestWorkload[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEfficiencyScore() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cluster/efficiency-live", {
          cache: "no-store",
        });

        const data: LiveEfficiencyResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load live efficiency score");
        }

        if (isMounted) {
          setLiveScore(normalizeScore(data.clusterScore));
          setWeakestWorkloads(data.weakestWorkloads ?? []);
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

    loadEfficiencyScore();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedScore = useMemo(() => {
    if (liveScore !== null) {
      return normalizeScore(liveScore);
    }

    return normalizeScore(buildFallbackScore(fallbackWorkloads));
  }, [liveScore, fallbackWorkloads]);

  const scoreLabel = getScoreLabel(displayedScore);
  const scoreTextColor = getScoreColor(displayedScore);
  const progressColor = getProgressColor(displayedScore);

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Cluster efficiency
        </div>

        <h2 className="text-2xl font-semibold text-white">
          Cluster Efficiency Score
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Live score based on deployment resource configuration and current CPU
          usage
        </p>

        {loading && (
          <p className="mt-3 text-xs text-slate-500">
            Loading live efficiency score...
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Live efficiency score could not be loaded. Showing fallback data.
            Error: {error}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-center">
          <div className={`text-6xl font-bold ${scoreTextColor}`}>
            {displayedScore}
          </div>
          <div className="mt-2 text-sm text-slate-400">out of 100</div>

          <div className="mt-6 w-full">
            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${progressColor} transition-all duration-500`}
                style={{ width: `${displayedScore}%` }}
              />
            </div>
          </div>

          <div className={`mt-4 text-sm font-medium ${scoreTextColor}`}>
            {scoreLabel}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
          <h3 className="text-lg font-semibold text-white">
            Main efficiency findings
          </h3>

          <div className="mt-4 space-y-4">
            {weakestWorkloads.length > 0 ? (
              weakestWorkloads.map((workload) => (
                <div
                  key={workload.name}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">{workload.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Score {workload.score} • Request {workload.cpuRequest} •
                        Usage {workload.actualUsage}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${
                        workload.score >= 80
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : workload.score >= 60
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {workload.score}/100
                    </span>
                  </div>

                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {workload.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
                No live workload findings available.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}