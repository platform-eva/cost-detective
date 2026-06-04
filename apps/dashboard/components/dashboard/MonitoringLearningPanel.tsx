const items = [
  {
    type: "Gauge",
    title: "Memory Usage",
    query: "sum(container_memory_working_set_bytes)",
    meaning: "Zeigt den aktuellen Speicherverbrauch des Clusters.",
  },
  {
    type: "Counter",
    title: "Pod Restarts",
    query: "sum(kube_pod_container_status_restarts_total)",
    meaning: "Zählt Container-Restarts seit dem Start der Pods.",
  },
  {
    type: "Gauge",
    title: "Running Pods",
    query: 'count(kube_pod_status_phase{phase="Running"})',
    meaning: "Zeigt, wie viele Pods aktuell im Status Running sind.",
  },
];

export default function MonitoringLearningPanel() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-6">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Monitoring learning
        </div>

        <h2 className="mt-3 text-2xl font-bold">
          Prometheus Metrics & PromQL
        </h2>

        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Dieser Bereich zeigt, welche Prometheus-Metriken Cost Detective nutzt
          und wie sie mit PromQL abgefragt werden.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {item.title}
              </h3>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                {item.type}
              </span>
            </div>

            <p className="mb-4 text-sm leading-6 text-slate-400">
              {item.meaning}
            </p>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">
                PromQL
              </p>
              <code className="break-words text-sm text-cyan-300">
                {item.query}
              </code>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}