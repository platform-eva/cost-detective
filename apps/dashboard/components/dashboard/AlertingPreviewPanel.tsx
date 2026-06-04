type Props = {
  summary: {
    podsRunning?: number;
    memoryUsageBytes?: number;
    podRestarts?: number;
  };
};

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 MB";
  const gib = bytes / 1024 / 1024 / 1024;
  if (gib >= 1) return `${gib.toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

export default function AlertingPreviewPanel({ summary }: Props) {
  const alerts = [
    {
      name: "NoRunningPods",
      severity: "critical",
      active: (summary.podsRunning ?? 0) === 0,
      message: "Keine laufenden Pods erkannt.",
    },
    {
      name: "HighMemoryUsage",
      severity: "warning",
      active: (summary.memoryUsageBytes ?? 0) > 2 * 1024 * 1024 * 1024,
      message: `Memory Usage liegt bei ${formatBytes(summary.memoryUsageBytes)}.`,
    },
    {
      name: "PodRestartsDetected",
      severity: "warning",
      active: (summary.podRestarts ?? 0) > 0,
      message: `${summary.podRestarts ?? 0} Container-Restarts erkannt.`,
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-6">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Alerting preview
        </div>

        <h2 className="mt-3 text-2xl font-bold">Monitoring Alert Rules</h2>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Vereinfachte Alert-Regeln auf Basis der Prometheus-Metriken. So wird
          sichtbar, wann aus Monitoring-Daten konkrete Warnungen entstehen.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {alerts.map((alert) => (
          <div
            key={alert.name}
            className={`rounded-2xl border p-5 ${
              alert.active
                ? alert.severity === "critical"
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">{alert.name}</h3>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                {alert.active ? alert.severity : "healthy"}
              </span>
            </div>

            <p className="text-sm leading-6 text-slate-300">
              {alert.active ? alert.message : "Keine Auffälligkeit erkannt."}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}