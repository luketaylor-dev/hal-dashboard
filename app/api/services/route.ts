import { NextResponse } from "next/server";
import { services } from "@/lib/config";
import { getStatus, type ServiceStatus } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const results = await Promise.all(
    services.map(async (s): Promise<ServiceStatus> => {
      try {
        return await getStatus(s.name);
      } catch (e) {
        return {
          service: s,
          state: "unknown",
          startedAt: undefined,
          uptimeSeconds: undefined,
        };
      }
    }),
  );
  return NextResponse.json({ services: results });
}
