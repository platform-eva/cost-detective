import type { WasteAnalysisResponse } from "../types/analysis";

export async function getWasteAnalysis(): Promise<WasteAnalysisResponse> {
  return {
    generatedAt: new Date().toISOString(),
    workloads: [
      {
        name: "cd-api",
        namespace: "cost-detective",
        requestedCpuMillicores: 500,
        usedCpuMillicores: 120,
        wasteCpuMillicores: 380,
        efficiencyPercent: 24,
        wastePercent: 76,
      },
      {
        name: "cd-web",
        namespace: "cost-detective",
        requestedCpuMillicores: 300,
        usedCpuMillicores: 110,
        wasteCpuMillicores: 190,
        efficiencyPercent: 37,
        wastePercent: 63,
      },
      {
        name: "cd-burner",
        namespace: "cost-detective",
        requestedCpuMillicores: 250,
        usedCpuMillicores: 148,
        wasteCpuMillicores: 102,
        efficiencyPercent: 59,
        wastePercent: 41,
      },
    ],
  };
}