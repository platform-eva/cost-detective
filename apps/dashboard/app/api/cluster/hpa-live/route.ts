import { NextResponse } from "next/server";
import { execSync } from "child_process";

type HpaItem = {
  metadata?: {
    name?: string;
  };
  spec?: {
    minReplicas?: number;
    maxReplicas?: number;
    scaleTargetRef?: {
      name?: string;
      kind?: string;
    };
    metrics?: Array<{
      type?: string;
      resource?: {
        name?: string;
        target?: {
          type?: string;
          averageUtilization?: number;
          averageValue?: string;
        };
      };
    }>;
  };
  status?: {
    currentReplicas?: number;
    desiredReplicas?: number;
    currentMetrics?: Array<{
      type?: string;
      resource?: {
        name?: string;
        current?: {
          averageUtilization?: number;
          averageValue?: string;
          value?: string;
        };
      };
    }>;
  };
};

function getCpuTarget(item: HpaItem): number | null {
  const cpuMetric = item.spec?.metrics?.find(
    (metric) =>
      metric.type === "Resource" && metric.resource?.name?.toLowerCase() === "cpu"
  );

  return cpuMetric?.resource?.target?.averageUtilization ?? null;
}

function getCurrentCpuUtilization(item: HpaItem): number | null {
  const cpuMetric = item.status?.currentMetrics?.find(
    (metric) =>
      metric.type === "Resource" && metric.resource?.name?.toLowerCase() === "cpu"
  );

  return cpuMetric?.resource?.current?.averageUtilization ?? null;
}

function buildStatus(params: {
  currentReplicas: number;
  desiredReplicas: number;
  minReplicas: number;
  maxReplicas: number;
}) {
  if (params.desiredReplicas > params.currentReplicas) {
    return "Scaling up";
  }

  if (params.desiredReplicas < params.currentReplicas) {
    return "Scaling down";
  }

  if (params.currentReplicas === params.maxReplicas) {
    return "At max replicas";
  }

  if (params.currentReplicas === params.minReplicas) {
    return "At minimum";
  }

  return "Stable";
}

export async function GET() {
  try {
    const raw = execSync("kubectl get hpa -n cost-detective -o json", {
      encoding: "utf-8",
    });

    const parsed = JSON.parse(raw);

    const hpa =
      parsed.items?.map((item: HpaItem) => {
        const minReplicas = item.spec?.minReplicas ?? 1;
        const maxReplicas = item.spec?.maxReplicas ?? 1;
        const currentReplicas = item.status?.currentReplicas ?? minReplicas;
        const desiredReplicas = item.status?.desiredReplicas ?? currentReplicas;
        const cpuTarget = getCpuTarget(item);
        const currentCpuUtilization = getCurrentCpuUtilization(item);

        return {
          name: item.metadata?.name ?? "unknown",
          targetName: item.spec?.scaleTargetRef?.name ?? "unknown",
          targetKind: item.spec?.scaleTargetRef?.kind ?? "Unknown",
          minReplicas,
          maxReplicas,
          currentReplicas,
          desiredReplicas,
          cpuTarget,
          currentCpuUtilization,
          status: buildStatus({
            currentReplicas,
            desiredReplicas,
            minReplicas,
            maxReplicas,
          }),
        };
      }) ?? [];

    return NextResponse.json({
      success: true,
      hpa,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Unknown error while fetching HPA data",
      },
      { status: 500 }
    );
  }
}