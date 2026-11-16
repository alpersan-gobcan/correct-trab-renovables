import { NextResponse } from "next/server";
import {
  CORRECTOR_VERSION,
  INTEGRITY_ERROR_MESSAGE,
  verifyCorrectorIntegrity,
} from "@/lib/rubric";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const integrity = verifyCorrectorIntegrity();

  if (!integrity.ok) {
    return NextResponse.json(
      {
        integrityOk: false,
        error: INTEGRITY_ERROR_MESSAGE,
        apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
        version: CORRECTOR_VERSION,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      }
    );
  }

  return NextResponse.json(
    {
      integrityOk: true,
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
      version: CORRECTOR_VERSION,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    }
  );
}
