"use client";

import { useEffect, useMemo, useState } from "react";

type CostData = {
  current: string;
  projected: string;
  savings: string;
};

type Props = {
  cost?: CostData;
};

type LiveCostResponse = {
  success: boolean;
  cost?: {
    estimatedDailyCost: string;
    estimatedWastePerDay: string;
    topCostWorkload: {
      name: string;
      value: string;
    } | null;
    topWasteWorkload: {
      name: string;
      value: string;
    } | null;
    cpuPricingModel: string;
  };
  error?: string;
};

function buildFallbackCost(cost?: CostData) {
  return {
    estimatedDailyCost: cost?.current ?? "€0.00",
    estimatedWastePerDay: cost?.savings ?? "€0.00",
    topCostWorkload: null,
    topWasteWorkload: null,
    cpuPricingModel: "Demo pricing",
  };
}

export default function CostPanel({ cost: fallbackCost }: Props) {
  const [liveCost, setLiveCost] = useState<LiveCostResponse["cost"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCost() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cluster/cost-live", {
          cache: "no-store",
        });

        const data: LiveCostResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load live cost data");
        }

        if (isMounted) {
          setLiveCost(data.cost ?? null);
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

    loadCost();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedCost = useMemo(() => {
    if (liveCost) {
      return liveCost;
    }

    return buildFallbackCost(fallbackCost);
  }, [liveCost, fallbackCost]);

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Cost insight
        </div>

        <h2 className="text-2xl font-semibold text-white">Cost Panel</h2>

        <p className="mt-2 text-sm text-slate-400">
          Live estimated CPU reservation cost and waste potential
        </p>

        {loading && (
          <p className="mt-3 text-xs text-slate-500">
            Loading live cost estimation...
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Live cost data could not be loaded. Showing fallback data. Error:{" "}
            {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Estimated daily cost
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {displayedCost.estimatedDailyCost}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-300/80">
            Estimated waste per day
          </p>
          <p className="mt-2 text-3xl font-semibold text-amber-300">
            {displayedCost.estimatedWastePerDay}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Top cost workload
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {displayedCost.topCostWorkload
              ? `${displayedCost.topCostWorkload.name} • ${displayedCost.topCostWorkload.value}`
              : "No cost-driving workload detected"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Top waste workload
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {displayedCost.topWasteWorkload
              ? `${displayedCost.topWasteWorkload.name} • ${displayedCost.topWasteWorkload.value}`
              : "No waste-driving workload detected"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Pricing model
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {displayedCost.cpuPricingModel}
          </p>
        </div>
      </div>
    </section>
  );
}