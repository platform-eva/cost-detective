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

function formatMillicores(value: number): string {
  return `${Math.round(value)}m`;
}

function calculateRecommendedMillicores(usageMillicores: number): number {
  const withBuffer = Math.ceil(usageMillicores * 1.3);
  return Math.max(10, withBuffer);
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

    const recommendations =
      parsedDeployments.items?.map((item: K8sDeployment) => {
        const name = item.metadata?.name ?? "unknown";

        const firstContainer = item.spec?.template?.spec?.containers?.[0];
        const currentRequest = firstContainer?.resources?.requests?.cpu;
        const currentRequestMillicores = parseCpuToMillicores(currentRequest);

        const actualUsageMillicores = usageByDeployment.get(name) ?? 0;
        const recommendedMillicores =
          calculateRecommendedMillicores(actualUsageMillicores);

        const hasCpuRequest = Boolean(currentRequest);
        const potentialSavingsMillicores = hasCpuRequest
          ? Math.max(0, currentRequestMillicores - recommendedMillicores)
          : 0;

        const savingsPercent =
          hasCpuRequest && currentRequestMillicores > 0
            ? Math.round(
                (potentialSavingsMillicores / currentRequestMillicores) * 100
              )
            : 0;

        const suggestion = hasCpuRequest
          ? recommendedMillicores < currentRequestMillicores
            ? `Reduce CPU request from ${formatMillicores(
                currentRequestMillicores
              )} to ${formatMillicores(
                recommendedMillicores
              )}. This could reduce reserved resources by approximately ${savingsPercent}%.`
            : `Current CPU request of ${formatMillicores(
                currentRequestMillicores
              )} already matches current usage closely.`
          : `Set an initial CPU request around ${formatMillicores(
              recommendedMillicores
            )} based on current observed usage.`;

        return {
          name,
          currentRequest: hasCpuRequest
            ? formatMillicores(currentRequestMillicores)
            : "not set",
          actualUsage: formatMillicores(actualUsageMillicores),
          recommended: formatMillicores(recommendedMillicores),
          savePercent: `${savingsPercent}%`,
          hasCpuRequest,
          potentialSavings: formatMillicores(potentialSavingsMillicores),
          suggestion,
        };
      }) ?? [];

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ?? "Unknown error while calculating live recommendations",
      },
      { status: 500 }
    );
  }
}