import { NextResponse } from "next/server";
import { execSync } from "child_process";

type K8sDeployment = {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
  };
  spec?: {
    replicas?: number;
    template?: {
      spec?: {
        containers?: Array<{
          name?: string;
          image?: string;
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
  status?: {
    readyReplicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
  };
};

function buildRuntimeStatus(ready: number, desired: number, available: number) {
  if (desired === 0) return "Scaled to zero";
  if (ready === desired && available === desired) return "Healthy";
  if (ready > 0) return "Degraded";
  return "Unavailable";
}

function buildIssues(firstContainer?: {
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
}) {
  const issues: string[] = [];

  const cpuRequest = firstContainer?.resources?.requests?.cpu;
  const memoryRequest = firstContainer?.resources?.requests?.memory;
  const cpuLimit = firstContainer?.resources?.limits?.cpu;
  const memoryLimit = firstContainer?.resources?.limits?.memory;

  if (!cpuRequest) issues.push("Missing CPU request");
  if (!memoryRequest) issues.push("Missing memory request");
  if (!cpuLimit) issues.push("Missing CPU limit");
  if (!memoryLimit) issues.push("Missing memory limit");

  return issues;
}

export async function GET() {
  try {
    const raw = execSync(
      "kubectl get deployments -n cost-detective -o json",
      {
        encoding: "utf-8",
      }
    );

    const parsed = JSON.parse(raw);

    const deployments =
      parsed.items?.map((item: K8sDeployment) => {
        const desired = item.spec?.replicas ?? 0;
        const ready = item.status?.readyReplicas ?? 0;
        const available = item.status?.availableReplicas ?? 0;
        const upToDate = item.status?.updatedReplicas ?? 0;

        const firstContainer = item.spec?.template?.spec?.containers?.[0];

        const cpuRequest = firstContainer?.resources?.requests?.cpu ?? "not set";
        const memoryRequest =
          firstContainer?.resources?.requests?.memory ?? "not set";
        const cpuLimit = firstContainer?.resources?.limits?.cpu ?? "not set";
        const memoryLimit = firstContainer?.resources?.limits?.memory ?? "not set";

        const issues = buildIssues(firstContainer);
        const issueCount = issues.length;

        return {
          name: item.metadata?.name ?? "unknown",
          namespace: item.metadata?.namespace ?? "unknown",
          desired,
          ready,
          available,
          upToDate,
          replicas: `${ready}/${desired}`,
          cpu: cpuRequest,
          memory: memoryRequest,
          cpuLimit,
          memoryLimit,
          image: firstContainer?.image ?? "unknown",
          runtimeStatus: buildRuntimeStatus(ready, desired, available),
          configStatus: issueCount === 0 ? "Healthy" : "Needs attention",
          hasCpuRequest: cpuRequest !== "not set",
          hasMemoryRequest: memoryRequest !== "not set",
          hasCpuLimit: cpuLimit !== "not set",
          hasMemoryLimit: memoryLimit !== "not set",
          issues,
          issueCount,
          createdAt: item.metadata?.creationTimestamp ?? null,
        };
      }) ?? [];

    return NextResponse.json({
      success: true,
      deployments,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Unknown error while fetching deployments",
      },
      { status: 500 }
    );
  }
}