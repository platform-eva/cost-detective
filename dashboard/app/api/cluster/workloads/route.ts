import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    deployments: [
      {
        name: "cd-api",
        replicas: "1/1",
        cpu: "120m",
        memory: "128Mi",
        status: "Running",
        image: "cost-detective-api:0.1.0",
      },
      {
        name: "cd-web",
        replicas: "1/1",
        cpu: "80m",
        memory: "110Mi",
        status: "Running",
        image: "cost-detective-web:0.1.0",
      },
      {
        name: "cd-burner",
        replicas: "1/1",
        cpu: "220m",
        memory: "140Mi",
        status: "Running",
        image: "cost-detective-api:0.1.0",
      },
    ],
    inefficientWorkloads: [
      { name: "cd-api", requested: 500, used: 120 },
      { name: "cd-web", requested: 300, used: 80 },
      { name: "cd-burner", requested: 500, used: 220 },
    ],
    resourceWaste: [
      { name: "cd-api", requested: 500, used: 120 },
      { name: "cd-web", requested: 300, used: 80 },
      { name: "cd-burner", requested: 500, used: 220 },  ],
    hpa: {
      name: "cd-burner-hpa",
      minReplicas: 1,
      maxReplicas: 5,
      currentReplicas: 1,
      targetCpu: 50,
    },
    cost: {
      estimatedDailyCost: "€4.20",
      topService: "cd-burner",
      potentialSavings: "€1.30 / day",
    },
    cpuTrend: [
      { time: "09:00", cpu: 8 },
      { time: "10:00", cpu: 12 },
      { time: "11:00", cpu: 18 },
      { time: "12:00", cpu: 15 },
      { time: "13:00", cpu: 22 },
      { time: "14:00", cpu: 19 },
      { time: "15:00", cpu: 27 },
      { time: "16:00", cpu: 17 },
    ],
  });
}