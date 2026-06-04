type Props = {
  summary?: {
    podsRunning?: number;
    cpuUsage?: number;
    memoryUsageBytes?: number;
    podRestarts?: number;
  };
};

function getSuggestions(summary?: Props["summary"]) {
  const suggestions = [];

  if ((summary?.podsRunning ?? 0) === 0) {
    suggestions.push({
      title: "No Running Pods",
      text: "Check deployments and pod scheduling immediately.",
      severity: "critical",
    });
  }

  if ((summary?.podRestarts ?? 0) > 5) {
    suggestions.push({
      title: "Frequent Restarts",
      text: "Investigate crash loops, logs, or unstable containers.",
      severity: "warning",
    });
  }

  if ((summary?.memoryUsageBytes ?? 0) > 2 * 1024 * 1024 * 1024) {
    suggestions.push({
      title: "High Memory Usage",
      text: "Review memory requests/limits and workload sizing.",
      severity: "warning",
    });
  }

  if ((summary?.cpuUsage ?? 0) < 0.2) {
    suggestions.push({
      title: "Low CPU Utilization",
      text: "Possible overprovisioning. Consider reducing requests.",
      severity: "info",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: "Cluster Healthy",
      text: "No optimization recommendations currently required.",
      severity: "healthy",
    });
  }

  return suggestions;
}

function getColor(severity: string) {
  switch (severity) {
    case "critical":
      return "border-rose-500/40 text-rose-300";
    case "warning":
      return "border-amber-500/40 text-amber-300";
    case "info":
      return "border-cyan-500/40 text-cyan-300";
    default:
      return "border-emerald-500/40 text-emerald-300";
  }
}

export default function OptimizationSuggestions({ summary }: Props) {
  const suggestions = getSuggestions(summary);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Optimization insights
        </div>

        <h2 className="mt-3 text-2xl font-bold">
          Recommendations Panel
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Actionable suggestions derived from live cluster metrics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {suggestions.map((item) => (
          <div
            key={item.title}
            className={`rounded-2xl border bg-slate-950 p-5 ${getColor(
              item.severity
            )}`}
          >
            <h3 className="font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-6">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}