export type WorkloadInput = {
  name: string;
  requested: number;
  used: number;
};

export type WorkloadAnalysis = {
  name: string;
  requested: number;
  used: number;
  waste: number;
  efficiency: number;
  recommendedRequest: number;
  potentialSavingsPercent: number;
};

export function analyzeWorkloads(
  workloads: WorkloadInput[],
): WorkloadAnalysis[] {
  return workloads
    .map((workload) => {
      const waste = Math.max(workload.requested - workload.used, 0);

      // Effizienz in Prozent:
      // Wie viel von der angeforderten CPU wird wirklich genutzt?
      const efficiency =
        workload.requested > 0
          ? Math.round((workload.used / workload.requested) * 100)
          : 0;

      // Sehr einfache erste Empfehlung:
      // Wir geben 30 % Sicherheitsreserve auf die tatsächliche Nutzung.
      // Später kann man das schlauer machen (z. B. Peak-Werte).
      const recommendedRequest = Math.max(
        Math.ceil(workload.used * 1.3),
        50,
      );

      // Wie viel Prozent der angeforderten CPU könnte eingespart werden?
      const potentialSavingsPercent =
        workload.requested > 0
          ? Math.max(
              0,
              Math.round(
                ((workload.requested - recommendedRequest) /
                  workload.requested) *
                  100,
              ),
            )
          : 0;

      return {
        ...workload,
        waste,
        efficiency,
        recommendedRequest,
        potentialSavingsPercent,
      };
    })
    .sort((a, b) => b.waste - a.waste);
}

export function getClusterEfficiencyScore(workloads: WorkloadInput[]): number {
  const totalRequested = workloads.reduce(
    (sum, workload) => sum + workload.requested,
    0,
  );

  const totalUsed = workloads.reduce(
    (sum, workload) => sum + workload.used,
    0,
  );

  if (totalRequested === 0) {
    return 0;
  }

  return Math.round((totalUsed / totalRequested) * 100);
}