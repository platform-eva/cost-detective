export interface WorkloadWaste {
  name: string;
  namespace: string;
  requestedCpuMillicores: number;
  usedCpuMillicores: number;
  wasteCpuMillicores: number;
  efficiencyPercent: number;
  wastePercent: number;
}

export interface WasteAnalysisResponse {
  generatedAt: string;
  workloads: WorkloadWaste[];
}