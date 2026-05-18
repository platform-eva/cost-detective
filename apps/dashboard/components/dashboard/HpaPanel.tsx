"use client";

import { useEffect, useMemo, useState } from "react";

type HpaData = {
  service?: string;
  minReplicas?: number;
  maxReplicas?: number;
  currentReplicas?: number;
  targetCpu?: string;
};

type Props = {
  hpa?: HpaData | HpaData[];
};

type LiveHpaItem = {
  name: string;
  targetName: string;
  targetKind: string;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  cpuTarget: number | null;
  currentCpuUtilization: number | null;
  status: string;
};

type LiveHpaResponse = {
  success: boolean;
  hpa?: LiveHpaItem[];
  error?: string;
};

function normalizeFallbackHpa(items?: HpaData | HpaData[]): HpaData[] {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  return [items];
}

function buildFallbackHpa(items?: HpaData | HpaData[]): LiveHpaItem[] {
  const normalizedItems = normalizeFallbackHpa(items);

  return normalizedItems.map((item) => ({
    name: item.service ?? "unknown",
    targetName: item.service ?? "unknown",
    targetKind: "Deployment",
    minReplicas: item.minReplicas ?? 1,
    maxReplicas: item.maxReplicas ?? 1,
    currentReplicas: item.currentReplicas ?? 1,
    desiredReplicas: item.currentReplicas ?? 1,
    cpuTarget:
      typeof item.targetCpu === "string"
        ? Number(item.targetCpu.replace("%", "")) || null
        : null,
    currentCpuUtilization: null,
    status: "Demo",
  }));
}

function getStatusClass(status: string) {
  switch (status) {
    case "Scaling up":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
    case "Scaling down":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "At max replicas":
      return "border-rose-500/20 bg-rose-500/10 text-rose-300";
    case "At minimum":
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
    case "Stable":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
  }
}

function buildScalingExplanation(item: LiveHpaItem) {
  if (item.cpuTarget === null || item.currentCpuUtilization === null) {
    return "Kubernetes kann hier aktuell keine vollständige CPU-Entscheidung anzeigen, weil Zielwert oder aktuelle CPU-Auslastung fehlen.";
  }

  if (item.currentCpuUtilization > item.cpuTarget) {
    return `Die aktuelle CPU-Auslastung liegt über dem Zielwert. Kubernetes kann deshalb zusätzliche Pods starten, bis maximal ${item.maxReplicas} Repliken erreicht sind.`;
  }

  if (item.currentReplicas <= item.minReplicas) {
    return `Die aktuelle CPU-Auslastung liegt unter dem Zielwert. Kubernetes skaliert nicht weiter herunter, weil bereits die Mindestanzahl von ${item.minReplicas} Pod erreicht ist.`;
  }

  return "Die aktuelle CPU-Auslastung liegt unter dem Zielwert. Kubernetes kann überzählige Pods entfernen, wenn weniger Rechenleistung benötigt wird.";
}

export default function HpaPanel({ hpa: fallbackHpa }: Props) {
  const [liveHpa, setLiveHpa] = useState<LiveHpaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHpa() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cluster/hpa-live", {
          cache: "no-store",
        });

        const data: LiveHpaResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load live HPA data");
        }

        if (isMounted) {
          setLiveHpa(data.hpa ?? []);
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

    loadHpa();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedHpa = useMemo(() => {
    if (liveHpa.length > 0) {
      return liveHpa;
    }

    return buildFallbackHpa(fallbackHpa);
  }, [liveHpa, fallbackHpa]);

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          Autoscaling
        </div>

        <h2 className="text-2xl font-semibold text-white">HPA Scaling Insight</h2>

        <p className="mt-2 text-sm text-slate-400">
          Shows how Kubernetes uses the Horizontal Pod Autoscaler to adjust pod
          replicas based on CPU utilization.
        </p>

        {loading && (
          <p className="mt-3 text-xs text-slate-500">Loading live HPA data...</p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Live HPA data could not be loaded. Showing fallback data. Error:{" "}
            {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {displayedHpa.map((item) => (
          <div
            key={`${item.name}-${item.targetName}`}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {item.targetName}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  HPA: {item.name} • Target kind: {item.targetKind}
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                  item.status
                )}`}
              >
                {item.status}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Replicas
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {item.currentReplicas} current • {item.desiredReplicas} desired
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Min {item.minReplicas} • Max {item.maxReplicas}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  CPU threshold
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {item.currentCpuUtilization !== null
                    ? `${item.currentCpuUtilization}%`
                    : "not available"}{" "}
                  / {item.cpuTarget !== null ? `${item.cpuTarget}%` : "not set"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Current CPU utilization compared with the configured target.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-violet-300">
                Scaling decision
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {buildScalingExplanation(item)}
              </p>
            </div>
          </div>
        ))}

        {!loading && displayedHpa.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
            No HPA resources found in the cost-detective namespace.
          </div>
        )}
      </div>
    </section>
  );
}