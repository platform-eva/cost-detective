"use client";

import { useEffect, useMemo, useState } from "react";

type Workload = {
  name: string;
  requestedCpu: string;
  usedCpu: string;
  recommendedCpu: string;
  savingsPercent: number;
};

type Props = {
  workloads?: Workload[];
};

type LiveRecommendation = {
  name: string;
  currentRequest: string;
  actualUsage: string;
  recommended: string;
  savePercent: string;
  hasCpuRequest: boolean;
  potentialSavings: string;
  suggestion: string;
};

type LiveRecommendationsResponse = {
  success: boolean;
  recommendations?: LiveRecommendation[];
  error?: string;
};

function parseSavingsPercent(value: string): number {
  const numeric = Number(value.replace("%", ""));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function mapLiveRecommendationToWorkload(
  recommendation: LiveRecommendation
): Workload {
  return {
    name: recommendation.name,
    requestedCpu: recommendation.currentRequest,
    usedCpu: recommendation.actualUsage,
    recommendedCpu: recommendation.recommended,
    savingsPercent: parseSavingsPercent(recommendation.savePercent),
  };
}

export default function OptimizationSuggestions({
  workloads: fallbackWorkloads = [],
}: Props) {
  const [liveWorkloads, setLiveWorkloads] = useState<Workload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecommendations() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cluster/recommendations-live", {
          cache: "no-store",
        });

        const data: LiveRecommendationsResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load live recommendations");
        }

        const mapped = (data.recommendations ?? []).map(
          mapLiveRecommendationToWorkload
        );

        if (isMounted) {
          setLiveWorkloads(mapped);
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

    loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedWorkloads = useMemo(() => {
    if (liveWorkloads.length > 0) {
      return liveWorkloads;
    }

    return fallbackWorkloads;
  }, [liveWorkloads, fallbackWorkloads]);

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Optimization suggestions
        </div>

        <h2 className="text-2xl font-semibold text-white">
          Recommended CPU Requests
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Suggested request values based on current workload usage
        </p>

        {loading && (
          <p className="mt-3 text-xs text-slate-500">
            Loading live CPU recommendations...
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Live recommendations could not be loaded. Showing fallback data.
            Error: {error}
          </div>
        )}
      </div>

      <div className="space-y-5">
        {displayedWorkloads.map((workload) => (
          <div
            key={workload.name}
            className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {workload.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Current CPU request can likely be optimized
                </p>
              </div>

              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
                save {workload.savingsPercent}%
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Current request
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {workload.requestedCpu}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Actual usage
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {workload.usedCpu}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-300/80">
                  Recommended
                </p>
                <p className="mt-2 text-3xl font-semibold text-emerald-300">
                  {workload.recommendedCpu}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Suggestion
              </p>
              <p className="mt-2 text-base leading-7 text-slate-200">
                {workload.requestedCpu === "not set"
                  ? `Set an initial CPU request around ${workload.recommendedCpu}. Current observed usage is ${workload.usedCpu}.`
                  : `Reduce CPU request from ${workload.requestedCpu} to ${workload.recommendedCpu}. This could reduce reserved resources by approximately ${workload.savingsPercent}%.`}
              </p>
            </div>
          </div>
        ))}

        {!loading && displayedWorkloads.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-500">
            No optimization suggestions available.
          </div>
        )}
      </div>
    </section>
  );
}