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

const CPU_COST_PER_VCPU_HOUR_EUR = 0.04;

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

function formatCurrency(value: number): string {
  return `€${value.toFixed(2)}`;
}

function cpuMillicoresToDailyCostEur(millicores: number): number {
  const vcpu = millicores / 1000;
  return vcpu * 24 * CPU_COST_PER_VCPU_HOUR_EUR;
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

    const deployments =
      parsedDeployments.items?.map((item: K8sDeployment) => {
        const name = item.metadata?.name ?? "unknown";
        const firstContainer = item.spec?.template?.spec?.containers?.[0];

        const requestedMillicores = parseCpuToMillicores(
          firstContainer?.resources?.requests?.cpu
        );
        const usedMillicores = usageByDeployment.get(name) ?? 0;
        const wasteMillicores = Math.max(0, requestedMillicores - usedMillicores);

        const estimatedDailyCost = cpuMillicoresToDailyCostEur(requestedMillicores);
        const estimatedWasteDailyCost = cpuMillicoresToDailyCostEur(wasteMillicores);

        return {
          name,
          requestedMillicores,
          usedMillicores,
          wasteMillicores,
          estimatedDailyCost,
          estimatedWasteDailyCost,
        };
      }) ?? [];

    const totalEstimatedDailyCost = deployments.reduce(
      (sum: number, item: { estimatedDailyCost: number }) => sum + item.estimatedDailyCost,
      0
    );

    const totalEstimatedWasteDailyCost = deployments.reduce(
      (sum: number, item: { estimatedWasteDailyCost: number }) =>
        sum + item.estimatedWasteDailyCost,
      0
    );

    const topCostWorkload =
      [...deployments].sort(
        (a, b) => b.estimatedDailyCost - a.estimatedDailyCost
      )[0] ?? null;

    const topWasteWorkload =
      [...deployments].sort(
        (a, b) => b.estimatedWasteDailyCost - a.estimatedWasteDailyCost
      )[0] ?? null;

    return NextResponse.json({
      success: true,
      cost: {
        estimatedDailyCost: formatCurrency(totalEstimatedDailyCost),
        estimatedWastePerDay: formatCurrency(totalEstimatedWasteDailyCost),
        topCostWorkload: topCostWorkload
          ? {
              name: topCostWorkload.name,
              value: formatCurrency(topCostWorkload.estimatedDailyCost),
            }
          : null,
        topWasteWorkload: topWasteWorkload
          ? {
              name: topWasteWorkload.name,
              value: formatCurrency(topWasteWorkload.estimatedWasteDailyCost),
            }
          : null,
        cpuPricingModel: `€${CPU_COST_PER_VCPU_HOUR_EUR.toFixed(2)}/vCPU-hour`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Unknown error while calculating live cost data",
      },
      { status: 500 }
    );
  }
}