import { NextResponse } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await whopSdk.experiences.listUsersForExperience({
      experienceId: "exp_zHM6MFJ0smwUeU",
      first: 10,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
