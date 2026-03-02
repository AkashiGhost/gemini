import { NextResponse } from "next/server";
import { STORY_IDS } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      gemini: process.env.GEMINI_API_KEY ? "configured" : "missing",
    },
    stories: STORY_IDS,
  });
}
