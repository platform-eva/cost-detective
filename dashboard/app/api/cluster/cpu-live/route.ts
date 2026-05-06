import { NextResponse } from "next/server";
import { execSync } from "child_process";

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

function parseKubectlTopPodsCpu(raw: string): number {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return 0;
  }

  const dataLines = lines.slice(1);

  return dataLines.reduce((sum, line) => {
    const parts = line.split(/\s+/);
    const cpu = parts[1];
    return sum + parseCpuToMillicores(cpu);
  }, 0);
}

function countNonEmptyLines(raw: string): number {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function buildCpuUsagePercent(totalCpuMillicores: number, nodeCount: number) {
  if (nodeCount <= 0) {
    return 0;
  }

  const assumedCapacityPerNodeMillicores = 1000;
  const totalCapacity = nodeCount * assumedCapacityPerNodeMillicores;

  const percent = Math.round((totalCpuMillicores / totalCapacity) * 100);

  return Math.max(0, percent);
}

function buildTimestampLabel() {
  return new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export async function GET() {
  try {
    const nodesRaw = execSync("kubectl get nodes --no-headers", {
      encoding: "utf-8",
    });

    const podMetricsRaw = execSync("kubectl top pods -n cost-detective", {
      encoding: "utf-8",
    });

    const nodeCount = countNonEmptyLines(nodesRaw);
    const totalCpuMillicores = parseKubectlTopPodsCpu(podMetricsRaw);
    const cpuUsagePercent = buildCpuUsagePercent(totalCpuMillicores, nodeCount);

    return NextResponse.json({
      success: true,
      point: {
        time: buildTimestampLabel(),
        cpu: cpuUsagePercent,
        totalCpuMillicores,
        nodeCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Unknown error while fetching live CPU usage",
      },
      { status: 500 }
    );
  }
}