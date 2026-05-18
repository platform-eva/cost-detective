type Props = {
  summary: {
    nodes?: number;
    podsRunning?: number;
    cpuUsage?: number;
    autoscaling?: string;
  };
};

export default function SummaryCards({ summary }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
          {summary.cpuUsage ?? 0}%
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Estimated current usage
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-400">Autoscaling</p>
          <span className="h-3 w-3 rounded-full bg-violet-400" />
        </div>
        <p className="text-4xl font-bold text-white">
          {summary.autoscaling ?? "Unknown"}
        </p>
        <p className="mt-3 text-sm text-slate-500">HPA status</p>
      </div>
    </div>
  );
}