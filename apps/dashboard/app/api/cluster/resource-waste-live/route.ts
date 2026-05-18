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

function buildWasteStatus(params: {
  hasCpuRequest: boolean;
  wastePercent: number;
}) {
  if (!params.hasCpuRequest) {
    return "Missing request";
  }

  if (params.wastePercent >= 80) {
    return "High waste";
  }

  if (params.wastePercent >= 40) {
    return "Moderate waste";
  }

  return "Efficient";
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

    const services =
      parsedDeployments.items?.map((item: K8sDeployment) => {
        const name = item.metadata?.name ?? "unknown";
        const firstContainer = item.spec?.template?.spec?.containers?.[0];

        const cpuRequest = firstContainer?.resources?.requests?.cpu;
        const requestedMillicores = parseCpuToMillicores(cpuRequest);
        const usedMillicores = usageByDeployment.get(name) ?? 0;

        const hasCpuRequest = Boolean(cpuRequest);
        const wasteMillicores = hasCpuRequest
          ? Math.max(0, requestedMillicores - usedMillicores)
          : 0;

        const wastePercent =
          hasCpuRequest && requestedMillicores > 0
            ? Math.round((wasteMillicores / requestedMillicores) * 100)
            : 0;

        return {
          name,
          requestedCpu: hasCpuRequest
            ? formatMillicores(requestedMillicores)
            : "not set",
          usedCpu: formatMillicores(usedMillicores),
          wasteCpu: hasCpuRequest ? formatMillicores(wasteMillicores) : "n/a",
          wastePercent,
          hasCpuRequest,
          status: buildWasteStatus({
            hasCpuRequest,
            wastePercent,
          }),
        };
      }) ?? [];

    const sortedServices = [...services].sort((a, b) => {
      if (a.hasCpuRequest !== b.hasCpuRequest) {
        return a.hasCpuRequest ? 1 : -1;
      }

      return b.wastePercent - a.wastePercent;
    });

    return NextResponse.json({
      success: true,
      services: sortedServices,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ?? "Unknown error while calculating resource waste",
      },
      { status: 500 }
    );
  }
}