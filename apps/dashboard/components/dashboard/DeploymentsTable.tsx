"use client";

import { useEffect, useMemo, useState } from "react";

type HpaInfo =
  | {
      active: false;
    }
  | {
      active: true;
      name: string;
      minReplicas: number;
      maxReplicas: number | null;
      currentReplicas: number | null;
      desiredReplicas: number | null;
      cpuTarget: number | null;
      currentCpu: number | null;
    };

type Deployment = {
  name: string;
  replicas: string;
  cpu: string;
  memory: string;
  status?: string;
  image: string;
  configStatus?: string;
  runtimeStatus?: string;
  issues?: string[];
  issueCount?: number;
  hpa?: HpaInfo;
};

type Props = {
  deployments?: Deployment[];
};

type LiveDeploymentsResponse = {
  success: boolean;
  deployments?: Deployment[];
  error?: string;
};

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "Healthy":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "Needs attention":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "Degraded":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "Unavailable":
      return "border-rose-500/20 bg-rose-500/10 text-rose-300";
    case "Scaled to zero":
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
  }
}

function getHpaBadgeClass(active?: boolean) {
  if (active) {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-400";
}

function buildSubtitle(deployment: Deployment) {
  const issueCount = deployment.issueCount ?? 0;

  if (issueCount === 0) {
    return "Resource configuration looks complete";
  }

  if (issueCount === 1) {
    return "1 configuration issue detected";
  }

  return `${issueCount} configuration issues detected`;
}

function buildTooltip(deployment: Deployment) {
  if (!deployment.issues || deployment.issues.length === 0) {
    return "No configuration issues detected";
  }

  return deployment.issues.join(" • ");
}

function buildHpaDetails(deployment: Deployment) {
  const hpa = deployment.hpa;

  if (!hpa || !hpa.active) {
    return "No autoscaler configured";
  }

  const current = hpa.currentReplicas ?? "?";
  const desired = hpa.desiredReplicas ?? "?";
  const min = hpa.minReplicas;
  const max = hpa.maxReplicas ?? "?";
  const target = hpa.cpuTarget ?? "?";
  const actual = hpa.currentCpu ?? "?";

  return `Replicas ${current}/${desired} • Min ${min} • Max ${max} • CPU ${actual}% / Target ${target}%`;
}

export default function DeploymentsTable({
  deployments: fallbackDeployments = [],
}: Props) {
  const [liveDeployments, setLiveDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDeployments() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cluster/deployments-live", {
          cache: "no-store",
        });

        const data: LiveDeploymentsResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load live deployments");
        }

        if (isMounted) {
          setLiveDeployments(data.deployments ?? []);
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

    loadDeployments();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedDeployments = useMemo(() => {
    if (liveDeployments.length > 0) {
      return liveDeployments;
    }

    return fallbackDeployments;
  }, [liveDeployments, fallbackDeployments]);

  const activeWorkloads = displayedDeployments.length;

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Workload Details</h2>
          <p className="mt-1 text-sm text-slate-400">
            Current deployments, resource configuration and autoscaling status
          </p>
        </div>

        <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
          {loading
            ? "Loading live workloads..."
            : `${activeWorkloads} active workloads`}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Live deployment data could not be loaded. Showing fallback data.
          Error: {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-slate-500">
            <tr>
              <th className="py-3 pr-4 font-medium">Deployment</th>
              <th className="py-3 pr-4 font-medium">Replicas</th>
              <th className="py-3 pr-4 font-medium">CPU</th>
              <th className="py-3 pr-4 font-medium">Memory</th>
              <th className="py-3 pr-4 font-medium">Autoscaling</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 font-medium">Image</th>
            </tr>
          </thead>

          <tbody>
            {displayedDeployments.map((deployment) => {
              const shownStatus =
                deployment.configStatus ??
                deployment.runtimeStatus ??
                deployment.status ??
                "Unknown";

              const hpaActive = deployment.hpa?.active === true;

              return (
                <tr
                  key={deployment.name}
                  className="border-b border-slate-800/70 transition hover:bg-slate-900/50 last:border-0"
                >
                  <td className="py-4 pr-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">
                        {deployment.name}
                      </span>
                      <span
                        className="text-xs text-slate-500"
                        title={buildTooltip(deployment)}
                      >
                        {buildSubtitle(deployment)}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 pr-4 text-slate-300">
                    {deployment.replicas}
                  </td>

                  <td className="py-4 pr-4 text-slate-300">
                    {deployment.cpu}
                  </td>

                  <td className="py-4 pr-4 text-slate-300">
                    {deployment.memory}
                  </td>

                  <td className="py-4 pr-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${getHpaBadgeClass(
                          hpaActive
                        )}`}
                      >
                        {hpaActive ? "HPA active" : "No HPA"}
                      </span>
                      <span className="max-w-xs text-xs text-slate-500">
                        {buildHpaDetails(deployment)}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 pr-4">
                    <div className="flex flex-col gap-2">
                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                          shownStatus
                        )}`}
                      >
                        {shownStatus}
                      </span>

                      {deployment.runtimeStatus &&
                        deployment.runtimeStatus !== shownStatus && (
                          <span className="text-xs text-slate-500">
                            Runtime: {deployment.runtimeStatus}
                          </span>
                        )}
                    </div>
                  </td>

                  <td className="py-4 text-xs text-slate-500">
                    {deployment.image}
                  </td>
                </tr>
              );
            })}

            {!loading && displayedDeployments.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  No deployments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}