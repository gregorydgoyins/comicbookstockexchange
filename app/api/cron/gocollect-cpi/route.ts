import { NextRequest, NextResponse } from "next/server";
import { syncGoCollectCpi } from "@/lib/gocollect/cpi-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Weekly (see vercel.json). GoCollect updates Mondays; this runs Tuesday so the new values are published.
export async function GET(req: NextRequest) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const secrets = [process.env.CRON_SECRET, process.env.GPA_INGESTION_SECRET].filter(Boolean);
  const fromVercelCron = (req.headers.get("user-agent") || "").startsWith("vercel-cron/");
  if (!fromVercelCron && !(bearer && secrets.includes(bearer))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncGoCollectCpi();
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
