"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  status?: string;
  pods?: number;
};

type LiveHealthResponse = {
  success: boolean;
  health?: {
    status: string;
    workloads: number;
    scaling: string;
    alerts: number;
    readyPods: number;
    totalPods: number;
    hpaCount: number;
  };
  error?: string;
};

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "Healthy":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    case "Warning":
      return "border-amber-500/30 bg-amber-500/15 text-amber-300";
    case "Critical":
      return "border-rose-500/30 bg-rose-500/15 text-rose-300";
    default:
      return "border-slate-500/30 bg-slate-500/15 text-slate-300";
  }
}

function getStatusDotClass(status: string) {
  switch (status) {
    case "Healthy":
      return "bg-emerald-400";
    case "Warning":
      return "bg-amber-400";
    case "Critical":
      return "bg-rose-400";
    default:
      return "bg-slate-400";
  }
}

function getStatusTextClass(status: string) {
  switch (status) {
    case "Healthy":
      return "text-emerald-300";
    case "Warning":
      return "text-amber-300";
    case "Critical":
      return "text-rose-300";
    default:
      return "text-slate-300";
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case "Healthy":
      return "All observed pods are running and no active cluster alerts were detected.";
    case "Warning":
      return "Some workloads need attention, but the cluster is still partially healthy.";
    case "Critical":
      return "The cluster currently has active problems that should be checked immediately.";
    default:
      return "Cluster status could not be determined.";
  }
}

export default function ClusterHealth({
  status: fallbackStatus = "Unknown",
  pods: fallbackPods = 0,
}: Props) {
  const [liveHealth, setLiveHealth] = useState<LiveHealthResponse["health"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cluster/health-live", {
          cache: "no-store",
        });

        const data: LiveHealthResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load live cluster health");
        }

        if (isMounted) {
          setLiveHealth(data.health ?? null);
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

    loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayed = useMemo(() => {
    if (liveHealth) {
      return {
        status: liveHealth.status,
        workloads: liveHealth.workloads,
        scaling: liveHealth.scaling,
        alerts: liveHealth.alerts,
      };
    }

    return {
      status: fallbackStatus,
      workloads: fallbackPods,
      scaling: "Unknown",
      alerts: 0,
    };
  }, [liveHealth, fallbackStatus, fallbackPods]);

  const statusDescription = getStatusDescription(displayed.status);

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Cluster Health</h2>
          <p className="mt-2 text-sm text-slate-400">
            Live Kubernetes environment status
          </p>

          {loading && (
            <p className="mt-3 text-xs text-slate-500">
              Loading live cluster health...
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Live cluster health could not be loaded. Showing fallback data.
              Error: {error}
            </div>
          )}
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${getStatusBadgeClass(
            displayed.status
          )}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(displayed.status)}`} />
          {displayed.status}
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <p className={`text-sm font-medium ${getStatusTextClass(displayed.status)}`}>
          {displayed.status}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {statusDescription}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            Workloads
          </p>
          <p className="mt-3 text-4xl font-semibold text-white">
            {displayed.workloads}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Active workloads currently observed
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            Scaling
          </p>
          <p className="mt-3 text-4xl font-semibold text-white">
            {displayed.scaling}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Horizontal Pod Autoscaler status
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-sm uppercase tracking-wide text-slate-500">
            Alerts
          </p>
          <p className="mt-3 text-4xl font-semibold text-white">
            {displayed.alerts}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Detected pod health or runtime issues
          </p>
        </div>
      </div>
    </section>
  );
}