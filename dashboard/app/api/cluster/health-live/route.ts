import { NextResponse } from "next/server";
import { execSync } from "child_process";

type PodCondition = {
  type?: string;
  status?: string;
};

type ContainerStatus = {
  ready?: boolean;
  restartCount?: number;
  state?: {
    waiting?: {
      reason?: string;
    };
    terminated?: {
      reason?: string;
    };
  };
};

type PodItem = {
  metadata?: {
    name?: string;
  };
  status?: {
    phase?: string;
    conditions?: PodCondition[];
    containerStatuses?: ContainerStatus[];
  };
};

function isPodReady(pod: PodItem): boolean {
  const conditions = pod.status?.conditions ?? [];
  const readyCondition = conditions.find((condition) => condition.type === "Ready");
  return readyCondition?.status === "True";
}

function getPodAlerts(pod: PodItem): number {
  let alerts = 0;

  const phase = pod.status?.phase;
  const containerStatuses = pod.status?.containerStatuses ?? [];

  if (phase === "Pending" || phase === "Failed" || phase === "Unknown") {
    alerts += 1;
  }

  for (const containerStatus of containerStatuses) {
    const waitingReason = containerStatus.state?.waiting?.reason;
    const terminatedReason = containerStatus.state?.terminated?.reason;
    const restartCount = containerStatus.restartCount ?? 0;

    if (
      waitingReason === "CrashLoopBackOff" ||
      waitingReason === "ImagePullBackOff" ||
      waitingReason === "ErrImagePull"
    ) {
      alerts += 1;
    }

    if (terminatedReason && terminatedReason !== "Completed") {
      alerts += 1;
    }

    if (restartCount >= 3) {
      alerts += 1;
    }
  }

  return alerts;
}

function buildClusterStatus(params: {
  podCount: number;
  readyPodCount: number;
  alerts: number;
}) {
  if (params.podCount === 0) {
    return "Critical";
  }

  if (params.alerts > 0) {
    return "Critical";
  }

  if (params.readyPodCount < params.podCount) {
    return "Warning";
  }

  return "Healthy";
}

export async function GET() {
  try {
    const podsRaw = execSync("kubectl get pods -n cost-detective -o json", {
      encoding: "utf-8",
    });

    const hpaRaw = execSync("kubectl get hpa -n cost-detective -o json", {
      encoding: "utf-8",
    });

    const parsedPods = JSON.parse(podsRaw);
    const parsedHpa = JSON.parse(hpaRaw);

    const pods: PodItem[] = parsedPods.items ?? [];
    const hpaItems = parsedHpa.items ?? [];

    const podCount = pods.length;
    const readyPodCount = pods.filter(isPodReady).length;
    const alerts = pods.reduce((sum, pod) => sum + getPodAlerts(pod), 0);

    const status = buildClusterStatus({
      podCount,
      readyPodCount,
      alerts,
    });

    return NextResponse.json({
      success: true,
      health: {
        status,
        workloads: podCount,
        scaling: hpaItems.length > 0 ? "Active" : "Inactive",
        alerts,
        readyPods: readyPodCount,
        totalPods: podCount,
        hpaCount: hpaItems.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Unknown error while fetching cluster health",
      },
      { status: 500 }
    );
  }
}