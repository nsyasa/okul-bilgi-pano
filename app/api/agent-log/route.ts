import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const logDir = path.join(process.cwd(), ".cursor");
    const logPath = path.join(logDir, "debug.log");

    // Fire and forget file write (don't await critical path if sluggish)
    // But for a simple logger, await is fine as long as we catch validation errors
    await fs.mkdir(logDir, { recursive: true }).catch(() => { });

    const entry: any = { ...body };
    if (!entry.timestamp) entry.timestamp = Date.now();
    if (!entry.id) entry.id = `log_${entry.timestamp}_${Math.random().toString(36).slice(2, 8)}`;

    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(logPath, line, "utf8").catch(err => console.error("Log write failed", err));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("agent-log error", e);
    // Return 200 even on error to stop client from freaking out or retrying if it thinks it's a temp fail
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}

