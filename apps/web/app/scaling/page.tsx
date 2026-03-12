async function getStatus() {
  const base =
    process.env.API_BASE_URL ??
    "http://cd-api.cost-detective.svc.cluster.local:8000";

  const res = await fetch(`${base}/api/status`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed to fetch status");
  return res.json();
}

export default async function ScalingPage() {
  const data = await getStatus();

  const hpa = data?.hpa;
  const curr =
    hpa?.status?.currentMetrics?.[0]?.resource?.current?.averageUtilization;
  const target =
    hpa?.spec?.metrics?.[0]?.resource?.target?.averageUtilization;

  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 28 }}>Scaling Demo</h1>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <b>Burner Deployment</b>
          <div>
            Replicas: <b>{data?.burnerDeployment?.replicas ?? 0}</b> | Ready:{" "}
            <b>{data?.burnerDeployment?.readyReplicas ?? 0}</b>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <b>HPA</b>
          <div>
            Name: <b>{hpa?.metadata?.name ?? "n/a"}</b>
          </div>
          <div>
            Min/Max: <b>{hpa?.spec?.minReplicas ?? "n/a"}</b> /{" "}
            <b>{hpa?.spec?.maxReplicas ?? "n/a"}</b>
          </div>
          <div>
            CPU avgUtil: current <b>{curr ?? "n/a"}%</b> / target{" "}
            <b>{target ?? "n/a"}%</b>
          </div>
          <div style={{ opacity: 0.8, marginTop: 8 }}>
            (MVP) Für Live-Updates einfach refreshen. Später: Polling/WebSockets.
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
          <b>Load</b>
          <p style={{ marginTop: 8, opacity: 0.85 }}>
            Start/Stop machst du über die API (per Port-Forward). Beispiel:
          </p>
          <pre
            style={{
              background: "#111",
              color: "#eee",
              padding: 12,
              borderRadius: 8,
              overflowX: "auto",
            }}
          >
{`# Start load (läuft endlos, bis stop)
curl -XPOST http://localhost:8000/api/load/start -H "content-type: application/json" -d '{"qps":40,"workers":4,"duration_seconds":0}'

# Stop load
curl -XPOST http://localhost:8000/api/load/stop`}
          </pre>
        </div>
      </div>

      <p style={{ marginTop: 18 }}>
        <a href="/">← Home</a>
      </p>
    </main>
  );
}
