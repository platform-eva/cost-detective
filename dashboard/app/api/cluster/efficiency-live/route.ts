import { NextResponse } from "next/server";
import { execSync } from "child_process";

type K8sDeployment = {
  metadata?: {
    name?: string;
  };
  spec?: {
    template?: {
      spec?: {
        containers?: Array<{
          resources?: {
            requests?: {
              cpu?: string;
              memory?: string;
            };
            limits?: {
              cpu?: string;
              memory?: string;
            };
          };
        }>;
      };
    };
  };
};

type PodMetric = {
  pod: string;
  cpu: string;
  memory: string;
  deployment: string;
};

function extractDeploymentNameFromPod(podName: string): string {
  const match = podName.match(/^(.*)-[a-z0-9]+-[a-z0-9]+$/);

  if (match?.[1]) {
    return match[1];
  }

  return podName;
}

function parseKubectlTopOutput(raw: string): PodMetric[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => {
      const parts = line.split(/\s+/);

      const pod = parts[0];
      const cpu = parts[1];
      const memory = parts[2];

      if (!pod || !cpu || !memory) {
        return null;
      }

      return {
        pod,
        cpu,
        memory,
        deployment: extractDeploymentNameFromPod(pod),
      };
    })
    .filter((item): item is PodMetric => item !== null);
}

function parseCpuToMillicores(cpu?: string): number {
  if (!cpu) return 0;

  if (cpu.endsWith("m")) {
    return Number(cpu.replace("m", ""));
  }

  const numericCpu = Number(cpu);

  if (Number.isNaN(numericCpu)) {
    return 0;
  }

  return numericCpu * 1000;
}

function calculateWorkloadScore(params: {
  hasCpuRequest: boolean;
  hasMemoryRequest: boolean;
  hasCpuLimit: boolean;
  hasMemoryLimit: boolean;
  cpuRequestMillicores: number;
  actualUsageMillicores: number;
}) {
  let score = 100;
  const reasons: string[] = [];

  if (!params.hasCpuRequest) {
    score -= 20;
    reasons.push("Missing CPU request");
  }

  if (!params.hasMemoryRequest) {
    score -= 20;
    reasons.push("Missing memory request");
  }

  if (!params.hasCpuLimit) {
    score -= 10;
    reasons.push("Missing CPU limit");
  }

  if (!params.hasMemoryLimit) {
    score -= 10;
    reasons.push("Missing memory limit");
  }

  if (params.hasCpuRequest && params.cpuRequestMillicores > 0) {
    const usageRatio = params.actualUsageMillicores / params.cpuRequestMillicores;

    if (usageRatio < 0.1) {
      score -= 20;
      reasons.push("CPU request appears highly overprovisioned");
    } else if (usageRatio < 0.25) {
      score -= 10;
      reasons.push("CPU request appears oversized");
    }
  }

  return {
    score: Math.max(0, score),
    reasons,
  };
}

export async function GET() {
  try {
    const deploymentsRaw = execSync(
      "kubectl get deployments -n cost-detective -o json",
      {
        encoding: "utf-8",
      }
    );

    const metricsRaw = execSync("kubectl top pods -n cost-detective", {
      encoding: "utf-8",
    });

    const parsedDeployments = JSON.parse(deploymentsRaw);
    const podMetrics = parseKubectlTopOutput(metricsRaw);

    const usageByDeployment = new Map<string, number>();

    for (const metric of podMetrics) {
      const current = usageByDeployment.get(metric.deployment) ?? 0;
      usageByDeployment.set(
        metric.deployment,
        current + parseCpuToMillicores(metric.cpu)
      );
    }

    const workloads =
      parsedDeployments.items?.map((item: K8sDeployment) => {
        const name = item.metadata?.name ?? "unknown";
        const firstContainer = item.spec?.template?.spec?.containers?.[0];

        const cpuRequest = firstContainer?.resources?.requests?.cpu;
        const memoryRequest = firstContainer?.resources?.requests?.memory;
        const cpuLimit = firstContainer?.resources?.limits?.cpu;
        const memoryLimit = firstContainer?.resources?.limits?.memory;

        const cpuRequestMillicores = parseCpuToMillicores(cpuRequest);
        const actualUsageMillicores = usageByDeployment.get(name) ?? 0;

        const result = calculateWorkloadScore({
          hasCpuRequest: Boolean(cpuRequest),
          hasMemoryRequest: Boolean(memoryRequest),
          hasCpuLimit: Boolean(cpuLimit),
          hasMemoryLimit: Boolean(memoryLimit),
          cpuRequestMillicores,
          actualUsageMillicores,
        });

        return {
          name,
          score: result.score,
          reasons: result.reasons,
          cpuRequest: cpuRequest ?? "not set",
          actualUsage: `${actualUsageMillicores}m`,
        };
      }) ?? [];

    const totalScore =
      workloads.length > 0
        ? Math.round(
            workloads.reduce((sum: number, item: { score: number }) => sum + item.score, 0) /
              workloads.length
          )
        : 0;

    const weakestWorkloads = [...workloads]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      clusterScore: totalScore,
      workloadCount: workloads.length,
      workloads,
      weakestWorkloads,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ?? "Unknown error while calculating efficiency score",
      },
      { status: 500 }
    );
  }
}