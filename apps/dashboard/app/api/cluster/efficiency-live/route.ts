import { NextResponse } from "next/server";
import { execSync } from "child_process";

const NAMESPACE = "cost-detective";

type K8sDeployment = {
  metadata?: {
    name?: string;
  };
  spec?: {
    replicas?: number;
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

function safeExec(command: string) {
  return execSync(command, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "ignore"],
  });
}

function extractDeploymentNameFromPod(podName: string): string {
  const match = podName.match(/^(.*)-[a-z0-9]+-[a-z0-9]+$/);

  return match?.[1] ?? podName;
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

      if (parts.length < 3) {
        return null;
      }

      const pod = parts[0];
      const cpu = parts[1];
      const memory = parts[2];

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
  if (!cpu) {
    return 0;
  }

  if (cpu.endsWith("m")) {
    return Number(cpu.replace("m", ""));
  }

  const parsed = Number(cpu);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed * 1000;
}

function calculateWorkloadScore(params: {
  hasCpuRequest: boolean;
  hasMemoryRequest: boolean;
  hasCpuLimit: boolean;
  hasMemoryLimit: boolean;
  cpuRequestMillicores: number;
  actualUsageMillicores: number;
  replicas: number;
}) {
  let score = 100;
  const reasons: string[] = [];

  const {
    hasCpuRequest,
    hasMemoryRequest,
    hasCpuLimit,
    hasMemoryLimit,
    cpuRequestMillicores,
    actualUsageMillicores,
    replicas,
  } = params;

  if (!hasCpuRequest) {
    score -= 25;
    reasons.push("Missing CPU request");
  }

  if (!hasMemoryRequest) {
    score -= 20;
    reasons.push("Missing memory request");
  }

  if (!hasCpuLimit) {
    score -= 10;
    reasons.push("Missing CPU limit");
  }

  if (!hasMemoryLimit) {
    score -= 10;
    reasons.push("Missing memory limit");
  }

  if (replicas === 0) {
    score -= 15;
    reasons.push("Deployment has zero replicas");
  }

  if (hasCpuRequest && cpuRequestMillicores > 0) {
    const usageRatio =
      actualUsageMillicores / cpuRequestMillicores;

    if (usageRatio < 0.05) {
      score -= 25;
      reasons.push("CPU request massively overprovisioned");
    } else if (usageRatio < 0.15) {
      score -= 15;
      reasons.push("CPU request heavily oversized");
    } else if (usageRatio < 0.3) {
      score -= 10;
      reasons.push("CPU request slightly oversized");
    }

    if (usageRatio > 0.9) {
      score -= 15;
      reasons.push("CPU usage close to request limit");
    }

    if (usageRatio > 1.2) {
      score -= 25;
      reasons.push("CPU usage exceeds requested resources");
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

export async function GET() {
  try {
    const deploymentsRaw = safeExec(
      `kubectl get deployments -n ${NAMESPACE} -o json`
    );

    const metricsRaw = safeExec(
      `kubectl top pods -n ${NAMESPACE}`
    );

    const parsedDeployments = JSON.parse(deploymentsRaw);

    const podMetrics = parseKubectlTopOutput(metricsRaw);

    const usageByDeployment = new Map<string, number>();

    for (const metric of podMetrics) {
      const current =
        usageByDeployment.get(metric.deployment) ?? 0;

      usageByDeployment.set(
        metric.deployment,
        current + parseCpuToMillicores(metric.cpu)
      );
    }

    const workloads =
      parsedDeployments.items?.map((item: K8sDeployment) => {
        const name = item.metadata?.name ?? "unknown";

        const replicas = item.spec?.replicas ?? 0;

        const firstContainer =
          item.spec?.template?.spec?.containers?.[0];

        const cpuRequest =
          firstContainer?.resources?.requests?.cpu;

        const memoryRequest =
          firstContainer?.resources?.requests?.memory;

        const cpuLimit =
          firstContainer?.resources?.limits?.cpu;

        const memoryLimit =
          firstContainer?.resources?.limits?.memory;

        const cpuRequestMillicores =
          parseCpuToMillicores(cpuRequest);

        const actualUsageMillicores =
          usageByDeployment.get(name) ?? 0;

        const result = calculateWorkloadScore({
          hasCpuRequest: Boolean(cpuRequest),
          hasMemoryRequest: Boolean(memoryRequest),
          hasCpuLimit: Boolean(cpuLimit),
          hasMemoryLimit: Boolean(memoryLimit),
          cpuRequestMillicores,
          actualUsageMillicores,
          replicas,
        });

        return {
          name,
          score: result.score,
          reasons:
            result.reasons.length > 0
              ? result.reasons
              : ["No major efficiency issues detected"],
          replicas,
          cpuRequest: cpuRequest ?? "not set",
          cpuLimit: cpuLimit ?? "not set",
          actualUsage: `${actualUsageMillicores}m`,
          usageVsRequest:
            cpuRequestMillicores > 0
              ? `${Math.round(
                  (actualUsageMillicores /
                    cpuRequestMillicores) *
                    100
                )}%`
              : "n/a",
        };
      }) ?? [];

    const totalScore =
      workloads.length > 0
        ? Math.round(
            workloads.reduce(
              (
                sum: number,
                item: { score: number }
              ) => sum + item.score,
              0
            ) / workloads.length
          )
        : 0;

    const weakestWorkloads = [...workloads]
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      namespace: NAMESPACE,
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
          error?.message ??
          "Unknown error while calculating efficiency score",
      },
      { status: 500 }
    );
  }
}