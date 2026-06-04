import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://api:8000";

  const res = await fetch(`${baseUrl}/api/prometheus/summary`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to load Prometheus summary" },
      { status: 500 }
    );
  }

  const data = await res.json();

  return NextResponse.json({
    nodes: data.nodes ?? 0,
    podsRunning: data.runningPods ?? 0,
    cpuUsage: Math.round((data.cpuUsageCores ?? 0) * 100) / 100,
    memoryUsageBytes: data.memoryUsageBytes ?? 0,
    podRestarts: data.podRestarts ?? 0,
    autoscalingActive: true,
    clusterHealth: data.podRestarts > 0 ? "warning" : "healthy",
    prometheus: data,
  });
}