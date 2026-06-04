import ClusterHealth from "@/components/dashboard/ClusterHealth";
import SummaryCards from "@/components/dashboard/SummaryCards";
import CpuUsageChart from "@/components/charts/CpuUsageChart";
import ResourceWastePanel from "@/components/dashboard/ResourceWastePanel";
import ClusterEfficiencyScore from "@/components/dashboard/ClusterEfficiencyScore";
import TopInefficientWorkloads from "@/components/dashboard/TopInefficientWorkloads";
import OptimizationSuggestions from "@/components/dashboard/OptimizationSuggestions";
import DeploymentsTable from "@/components/dashboard/DeploymentsTable";
import HpaPanel from "@/components/dashboard/HpaPanel";
import CostPanel from "@/components/dashboard/CostPanel";
import MonitoringLearningPanel from "@/components/dashboard/MonitoringLearningPanel";
import AlertingPreviewPanel from "@/components/dashboard/AlertingPreviewPanel";


export const dynamic = "force-dynamic";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://cd-api:8000";

async function getSummary() {
  const res = await fetch(`${baseUrl}/api/prometheus/summary`, {
    cache: "no-store",
  });

   if (!res.ok) {
    return {};
  }

  return res.json();
}

async function getSnapshots() {
  return {
    snapshots: [],
  };
}

async function getWorkloads() {
  const res = await fetch(`${baseUrl}/api/findings`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load workload data");
  }

  return res.json();
}

async function getAlerts() {
  return {
    alerts: [],
  };
}

export default async function DashboardPage() {
  const summary = await getSummary();
  const data = await getWorkloads();
  const snapshots = await getSnapshots();
  const alertsData = await getAlerts();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Cluster analysis preview
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Cost Detective
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">
              Understand Kubernetes workloads, autoscaling behavior and
              infrastructure cost in one clean developer-friendly dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
              Namespace: cost-detective
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
              Environment: local k3d
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
              Version: MVP preview
            </span>
          </div>
        </div>

        <section className="mb-8">
          <ClusterHealth
            status={summary.namespace || "unknown"}
            pods={
              summary.burnerDeployment?.readyReplicas || 0
            }
          />
        </section>

        <section className="mb-8">
          <SummaryCards summary={summary} />
        </section>
        <section className="mb-8">
          <MonitoringLearningPanel />
        </section>
        <section className="mb-8">
          <AlertingPreviewPanel summary={summary} />
        </section>
        <section className="mb-8">
          <CpuUsageChart data={[]} />
        </section>

        <section className="mb-8">
          <ResourceWastePanel services={data.findings ?? []} />        
        </section>

        <section className="mb-8">
          <ClusterEfficiencyScore summary={summary} />
        </section>

        <section className="mb-8">
          <TopInefficientWorkloads workloads={data.findings ?? []} />
        </section>

        <section className="mb-8">
          <OptimizationSuggestions summary={summary} />
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Database history
            </div>
            <h2 className="mt-3 text-2xl font-bold">
              Analysis Snapshots
            </h2>
            <p className="text-sm text-slate-400">
              Persisted analysis runs stored in PostgreSQL.
            </p>
          </div>

          <div className="space-y-3">
            {snapshots.snapshots?.map((s: any) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="font-semibold">
                  {new Date(
                    s.created_at * 1000
                  ).toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">
                  Namespace: {s.namespace} · Findings:{" "}
                  {s.finding_count}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DeploymentsTable deployments={data.findings ?? []} />
          </div>

          <div className="space-y-6">
            <HpaPanel hpa={summary.hpa} />
            <CostPanel cost={{
    current: "0",
    projected: "0",
    savings: "0",
  }}
/>
          </div>
        </section>
      </div>
    </main>
  );
}