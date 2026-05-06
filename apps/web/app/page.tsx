export const dynamic = "force-dynamic";
declare const process: any;

async function getSnapshots() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const res = await fetch(`${baseUrl}/api/snapshots`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return { snapshots: [] };
  }

  return res.json();
}

export default async function Page() {
  const data = await getSnapshots();

  return (
    <div style={{ padding: "20px" }}>
      <h1>Cost Detective Dashboard</h1>

      <h2>Snapshots</h2>

      <ul>
        {data.snapshots?.map((s: any) => (
          <li key={s.id}>
            {new Date(s.created_at * 1000).toLocaleString()} –{" "}
            {s.finding_count} findings
          </li>
        ))}
      </ul>
    </div>
  );
}