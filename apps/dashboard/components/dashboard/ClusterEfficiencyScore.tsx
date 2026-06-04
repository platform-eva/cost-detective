type Props = {
  summary?: {
    podsRunning?: number;
    cpuUsage?: number;
    memoryUsageBytes?: number;
    podRestarts?: number;
  };
};

function getScore(summary?: Props["summary"]) {
  let score = 100;

  if ((summary?.podsRunning ?? 0) === 0) score -= 35;
  if ((summary?.podRestarts ?? 0) > 0) score -= 25;
  if ((summary?.memoryUsageBytes ?? 0) > 2 * 1024 * 1024 * 1024) score -= 20;
  if ((summary?.cpuUsage ?? 0) === 0) score -= 10;

  return Math.max(score, 0);
}

function getStatus(score: number) {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Warning";
  return "Critical";
}

export default function ClusterEfficiencyScore({ summary }: Props) {
  const score = getScore(summary);
  const status = getStatus(score);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-6">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Cluster efficiency
        </div>

        <h2 className="mt-3 text-2xl font-bold">Cluster Efficiency Score</h2>
        <p className="mt-2 text-sm text-slate-400">
          Bewertet den aktuellen Cluster-Zustand anhand von Prometheus-Metriken.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center">
          <p className="text-6xl font-bold text-white">{score}</p>
          <p className="mt-2 text-sm text-slate-400">out of 100</p>

          <div className="mt-6 h-3 rounded-full bg-slate-800">
            <div
              className="h-3 rounded-full bg-cyan-400"
              style={{ width: `${score}%` }}
            />
          </div>

          <p className="mt-4 text-sm font-semibold text-cyan-300">{status}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="mb-3 font-semibold text-white">Score Factors</h3>

            <ul className="space-y-3 text-sm text-slate-300">
              <li>
                Running Pods:{" "}
                <span className="font-semibold text-white">
                  {summary?.podsRunning ?? 0}
                </span>
              </li>
              <li>
                CPU Usage:{" "}
                <span className="font-semibold text-white">
                  {summary?.cpuUsage ?? 0} cores
                </span>
              </li>
              <li>
                Memory Usage:{" "}
                <span className="font-semibold text-white">
                  {(((summary?.memoryUsageBytes ?? 0) / 1024 / 1024 / 1024).toFixed(2))} GB
                </span>
              </li>
              <li>
                Pod Restarts:{" "}
                <span className="font-semibold text-white">
                  {summary?.podRestarts ?? 0}
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="mb-3 font-semibold text-white">Interpretation</h3>
            <p className="text-sm leading-6 text-slate-400">
              Der Score übersetzt Monitoring-Daten in eine einfache Bewertung.
              So wird sichtbar, ob aus Metriken konkrete technische Risiken
              entstehen.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}