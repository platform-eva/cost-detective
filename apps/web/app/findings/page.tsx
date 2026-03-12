async function getFindings() {
  const base = process.env.API_BASE_URL || "http://cd-api.cost-detective.svc.cluster.local:8000";
  const res = await fetch(`${base}/api/findings`, { cache: "no-store" });
  if (!res.ok) throw new Error("failed to fetch findings");
  return res.json();
}

export default async function FindingsPage() {
  const data = await getFindings();

  return (
    <main style={{ fontFamily: "system-ui", padding: 24, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 28 }}>Findings</h1>
      <p style={{ opacity: 0.8 }}>
        Namespace: <b>{data.namespace}</b> — Findings: <b>{data.count}</b>
      </p>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {data.findings.map((f: any) => (
          <div key={f.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <b>{f.title}</b>
              <span style={{ fontWeight: 700 }}>{f.severity}</span>
            </div>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 10, background: "#f6f6f6", padding: 10, borderRadius: 8 }}>
{JSON.stringify(f.evidence, null, 2)}
            </pre>
            <div style={{ marginTop: 10, opacity: 0.85 }}>
              <b>Fix:</b> {f.fix}
            </div>
          </div>
        ))}
        {data.findings.length === 0 && (
          <div style={{ padding: 16, borderRadius: 10, background: "#f6fff2", border: "1px solid #bde5a8" }}>
            Keine Findings 🎉 (Fürs Lab kannst du absichtlich requests entfernen.)
          </div>
        )}
      </div>

      <p style={{ marginTop: 18 }}><a href="/">← Home</a></p>
    </main>
  );
}
