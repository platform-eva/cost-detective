type Props = {
  summary: {
    nodes?: number;
    podsRunning?: number;
    cpuUsage?: number;
    memoryUsageBytes?: number;
    podRestarts?: number;
    autoscalingActive?: boolean;
  };
};

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 MB";

  const gib = bytes / 1024 / 1024 / 1024;
  if (gib >= 1) return `${gib.toFixed(2)} GB`;

  const mib = bytes / 1024 / 1024;
  return `${mib.toFixed(0)} MB`;
}

export default function SummaryCards({ summary }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">Nodes</p>
          <span className="h-3 w-3 rounded-full bg-cyan-400" />
        </div>
        <p className="text-4xl font-bold text-white">{summary.nodes ?? 0}</p>
        <p className="mt-3 text-sm text-slate-500">Cluster nodes available</p>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">Pods Running</p>
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <p className="text-4xl font-bold text-white">
          {summary.podsRunning ?? 0}
        </p>
        <p className="mt-3 text-sm text-slate-500">Currently active pods</p>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">CPU Usage</p>
          <span className="h-3 w-3 rounded-full bg-amber-400" />
        </div>
        <p className="text-4xl font-bold text-white">
          {summary.cpuUsage ?? 0}
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Current CPU usage in cores
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">Memory Usage</p>
          <span className="h-3 w-3 rounded-full bg-violet-400" />
        </div>
        <p className="text-4xl font-bold text-white">
          {formatBytes(summary.memoryUsageBytes)}
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Current working set memory
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">Pod Restarts</p>
          <span
            className={`h-3 w-3 rounded-full ${
              (summary.podRestarts ?? 0) > 0 ? "bg-rose-400" : "bg-emerald-400"
            }`}
          />
        </div>
        <p className="text-4xl font-bold text-white">
          {summary.podRestarts ?? 0}
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Container restarts observed
        </p>
      </div>
    </div>
  );
}