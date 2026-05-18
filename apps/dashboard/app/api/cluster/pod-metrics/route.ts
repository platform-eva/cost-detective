import { NextResponse } from "next/server";
import { execSync } from "child_process";

type PodMetric = {
  pod: string;
  cpu: string;
  memory: string;
  deployment: string;
};

function parseKubectlTopOutput(raw: string): PodMetric[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const dataLines = lines.slice(1);

  return dataLines
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

function extractDeploymentNameFromPod(podName: string): string {
  const match = podName.match(/^(.*)-[a-z0-9]+-[a-z0-9]+$/);

  if (match?.[1]) {
    return match[1];
  }

  return podName;
}

function parseCpuToMillicores(cpu: string): number {
  if (cpu.endsWith("m")) {
    return Number(cpu.replace("m", ""));
  }

  const numericCpu = Number(cpu);

  if (Number.isNaN(numericCpu)) {
    return 0;
  }

  return numericCpu * 1000;
}

function parseMemoryToMi(memory: string): number {
  if (memory.endsWith("Ki")) {
    return Number(memory.replace("Ki", "")) / 1024;
  }

  if (memory.endsWith("Mi")) {
    return Number(memory.replace("Mi", ""));
  }

  if (memory.endsWith("Gi")) {
    return Number(memory.replace("Gi", "")) * 1024;
  }

  const numericMemory = Number(memory);

  if (Number.isNaN(numericMemory)) {
    return 0;
  }

  return numericMemory;
}

export async function GET() {
  try {
    const raw = execSync("kubectl top pods -n cost-detective", {
      encoding: "utf-8",
    });

    const podMetrics = parseKubectlTopOutput(raw);

    const deploymentsMap = new Map<
      string,
      {
        deployment: string;
        pods: string[];
        totalCpuMillicores: number;
        totalMemoryMi: number;
      }
    >();

    for (const metric of podMetrics) {
      const existing = deploymentsMap.get(metric.deployment);

      if (existing) {
        existing.pods.push(metric.pod);
        existing.totalCpuMillicores += parseCpuToMillicores(metric.cpu);
        existing.totalMemoryMi += parseMemoryToMi(metric.memory);
      } else {
        deploymentsMap.set(metric.deployment, {
          deployment: metric.deployment,
          pods: [metric.pod],
          totalCpuMillicores: parseCpuToMillicores(metric.cpu),
          totalMemoryMi: parseMemoryToMi(metric.memory),
        });
      }
    }

    const deployments = Array.from(deploymentsMap.values()).map((item) => ({
      deployment: item.deployment,
      pods: item.pods,
      cpu: `${item.totalCpuMillicores}m`,
      memory: `${Math.round(item.totalMemoryMi)}Mi`,
      podCount: item.pods.length,
    }));

    return NextResponse.json({
      success: true,
      podMetrics,
      deployments,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Unknown error while fetching pod metrics",
      },
      { status: 500 }
    );
  }
}