export default async function Page() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Cost Detective (MVP)</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Mini-Lab: Findings + HPA Scaling Demo (Burner + Loadgen Job)
      </p>

      <ul style={{ lineHeight: 1.8 }}>
        <li><a href="/findings">Findings</a></li>
        <li><a href="/scaling">Scaling Demo</a></li>
      </ul>

      <hr style={{ margin: "24px 0" }} />

      <p>
        Tipp: Öffne parallel im Terminal:
      </p>
      <pre style={{ background: "#111", color: "#eee", padding: 12, borderRadius: 8 }}>
kubectl -n cost-detective get hpa -w
kubectl -n cost-detective get deploy -w
kubectl top pods -n cost-detective
      </pre>
    </main>
  );
}
