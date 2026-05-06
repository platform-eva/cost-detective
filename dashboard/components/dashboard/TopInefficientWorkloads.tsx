"use client";

import { useEffect, useMemo, useState } from "react";

type Workload = {
  name: string;
  efficiency: number;
  waste: number;
};

type Props = {
  workloads?: Workload[];
};

type LiveWorkload = {
  name: string;
  inefficiencyScore: number;
  cpuRequest: string;
  actualUsage: string;
  issues: string[];
  issueCount: number;
};

type LiveResponse = {
  success: boolean;
  topWorkloads?: LiveWorkload[];
  error?: string;
};

function buildFallbackData(workloads: Workload[]) {
  return workloads.map((workload) => ({
    name: workload.name,
    inefficiencyScore: workload.waste,
    cpuRequest: "demo",
    actualUsage: "demo",
    issues: [`Estimated waste ${workload.waste}%`],
    issueCount: 1,
  }));
}

function getBadgeClass(score: number) {
  if (score >= 70) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  }

  if (score >= 40) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}

export default function TopInefficientWorkloads({
  workloads: fallbackWorkloads = [],
}: Props) {
  const [liveWorkloads, setLiveWorkloads] = useState<LiveWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkloads() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cluster/inefficient-workloads-live", {
          cache: "no-store",
        });

        const data: LiveResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load inefficient workloads");
        }

        if (isMounted) {
          setLiveWorkloads(data.topWorkloads ?? []);
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

    loadWorkloads();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedWorkloads = useMemo(() => {
    if (liveWorkloads.length > 0) {
      return liveWorkloads;
    }

    return buildFallbackData(fallbackWorkloads);
  }, [liveWorkloads, fallbackWorkloads]);

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-300">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Workload ranking
        </div>

        <h2 className="text-2xl font-semibold text-white">
          Top Inefficient Workloads
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Live ranking of workloads that currently need the most optimization attention
        </p>

        {loading && (
          <p className="mt-3 text-xs text-slate-500">
            Loading live inefficient workload ranking...
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Live workload ranking could not be loaded. Showing fallback data.
            Error: {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {displayedWorkloads.map((workload, index) => (
          <div
            key={workload.name}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300">
                    #{index + 1}
                  </span>

                  <h3 className="text-lg font-semibold text-white">
                    {workload.name}
                  </h3>
                </div>

                <p className="mt-3 text-sm text-slate-400">
                  CPU request: {workload.cpuRequest} • Actual usage: {workload.actualUsage}
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${getBadgeClass(
                  workload.inefficiencyScore
                )}`}
              >
                Inefficiency {workload.inefficiencyScore}/100
              </span>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {workload.issues.map((issue) => (
                <li key={issue} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {!loading && displayedWorkloads.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
            No inefficient workloads found.
          </div>
        )}
      </div>
    </section>
  );
}