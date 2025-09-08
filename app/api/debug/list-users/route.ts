import { NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop-sdk";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const whop = getWhopSdk();
    const result = await whop.experiences.listUsersForExperience({
      experienceId: "exp_zHM6MFJ0smwUeU",
      first: 10,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
