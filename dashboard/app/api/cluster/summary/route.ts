import ClusterHealth from "@/components/dashboard/ClusterHealth";
import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        nodes: 1,
        podsRunning:3,
        cpuUsage: 12,
        autoscalingActive: true,
        ClusterHealth: "healthy",
    });
    
}