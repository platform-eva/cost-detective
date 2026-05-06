"use client";

import { useEffect, useMemo, useState } from "react";

type Service = {
  name: string;
  requestedCpu: string;
  usedCpu: string;
  wasteCpu: string;
};

type Props = {
  services?: Service[];
};

type LiveService = {
  name: string;
  requestedCpu: string;
  usedCpu: string;
  wasteCpu: string;
  wastePercent: number;
  hasCpuRequest: boolean;
  status: string;
};

type LiveResponse = {
  success: boolean;
  services?: LiveService[];
  error?: string;
};

function buildFallbackServices(services: Service[]): LiveService[] {
  return services.map((service) => ({
    name: service.name,
    requestedCpu: service.requestedCpu,
    usedCpu: service.usedCpu,
    wasteCpu: service.wasteCpu,
    wastePercent: 0,
    hasCpuRequest: service.requestedCpu !== "not set",
    status: "Demo",
  }));
}

function getBadgeClass(status: string) {
  switch (status) {
    case "High waste":
      return "border-rose-500/20 bg-rose-500/10 text-rose-300";
    case "Moderate waste":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "Efficient":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "Missing request":
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
  }
}

export default function ResourceWastePanel({
  services: fallbackServices = [],
}: Props) {
  const [liveServices, setLiveServices] = useState<LiveService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWasteData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/cluster/resource-waste-live", {
          cache: "no-store",
        });

        const data: LiveResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load live resource waste");
        }

        if (isMounted) {
          setLiveServices(data.services ?? []);
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

    loadWasteData();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedServices = useMemo(() => {
    if (liveServices.length > 0) {
      return liveServices;
    }

    return buildFallbackServices(fallbackServices);
  }, [liveServices, fallbackServices]);

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Resource waste
        </div>

        <h2 className="text-2xl font-semibold text-white">Resource Waste</h2>

        <p className="mt-2 text-sm text-slate-400">
          Live comparison of requested CPU and actual usage per deployment
        </p>

        {loading && (
          <p className="mt-3 text-xs text-slate-500">
            Loading live waste analysis...
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Live resource waste could not be loaded. Showing fallback data.
            Error: {error}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {displayedServices.map((service) => (
          <div
            key={service.name}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {service.name}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Requested CPU: {service.requestedCpu} • Used CPU: {service.usedCpu}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${getBadgeClass(
                    service.status
                  )}`}
                >
                  {service.status}
                </span>

                {service.hasCpuRequest && (
                  <span className="text-xs text-slate-500">
                    Waste {service.wastePercent}%
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Requested
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {service.requestedCpu}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Actual usage
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {service.usedCpu}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-300/80">
                  Waste
                </p>
                <p className="mt-2 text-3xl font-semibold text-amber-300">
                  {service.wasteCpu}
                </p>
              </div>
            </div>
          </div>
        ))}

        {!loading && displayedServices.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
            No resource waste data available.
          </div>
        )}
      </div>
    </section>
  );
}