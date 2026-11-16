import { NextRequest, NextResponse } from "next/server";
import { buildDemoEvaluation, evaluateWithGemini } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  CORRECTOR_VERSION,
  INTEGRITY_ERROR_MESSAGE,
  verifyCorrectorIntegrity,
} from "@/lib/rubric";
import {
  detectPersonalDataInText,
  detectRuleTamperingAttempt,
  MAX_HISTORY_TURNS,
  MAX_TEXT_LENGTH,
  validatePdfBuffer,
} from "@/lib/security";
import type {
  HistoryTurn,
  StructuredEvaluation,
  SubmissionMode,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
};

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return request.headers.get("x-real-ip")?.trim() || "local-client";
}

function parseMode(rawMode: FormDataEntryValue | null, hasPdf: boolean): SubmissionMode {
  if (rawMode === "full_document" || rawMode === "fragment" || rawMode === "followup") {
    return rawMode;
  }
  return hasPdf ? "full_document" : "fragment";
}

function parseHistory(rawHistory: FormDataEntryValue | null): HistoryTurn[] {
  if (typeof rawHistory !== "string" || !rawHistory.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawHistory) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is HistoryTurn =>
          typeof item === "object" &&
          item !== null &&
          (item as HistoryTurn).role !== undefined &&
          ((item as HistoryTurn).role === "user" ||
            (item as HistoryTurn).role === "model") &&
          typeof (item as HistoryTurn).text === "string"
      )
      .slice(-MAX_HISTORY_TURNS);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  // 1. Verificación obligatoria de integridad de la rúbrica y prompt protegido
  const integrity = verifyCorrectorIntegrity();
  if (!integrity.ok) {
    return NextResponse.json(
      { error: INTEGRITY_ERROR_MESSAGE },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }

  // 2. Control de abuso / límite configurable de solicitudes
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Has alcanzado el límite temporal de solicitudes. Espera ${rateLimit.retryAfterSeconds} segundos antes de enviar una nueva consulta.`,
      },
      {
        status: 429,
        headers: {
          ...NO_CACHE_HEADERS,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const formData = await request.formData();
    const rawText = formData.get("text");
    const text = typeof rawText === "string" ? rawText : "";
    const fileEntry = formData.get("file");
    const hasPdf = fileEntry instanceof File && fileEntry.size > 0;
    const mode = parseMode(formData.get("mode"), hasPdf);
    const history = parseHistory(formData.get("history"));

    if (!text.trim() && !hasPdf) {
      return NextResponse.json(
        { error: "Escribe un texto o adjunta un archivo PDF para iniciar la revisión." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error: `El texto supera el límite máximo permitido de ${MAX_TEXT_LENGTH.toLocaleString("es-ES")} caracteres.`,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 3. Validar PDF en memoria si existe
    let pdfBuffer: Buffer | undefined;
    let pdfName: string | undefined;
    if (fileEntry instanceof File && fileEntry.size > 0) {
      const arrayBuffer = await fileEntry.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
      pdfName = fileEntry.name;

      const pdfCheck = validatePdfBuffer(pdfBuffer, fileEntry.name, fileEntry.type);
      if (!pdfCheck.valid) {
        return NextResponse.json(
          { error: pdfCheck.error || "Archivo PDF no válido." },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
    }

    // 4. Comprobar intentos de alterar las reglas del corrector
    if (detectRuleTamperingAttempt(text)) {
      const refusalEvaluation: StructuredEvaluation = {
        correctorVersion: CORRECTOR_VERSION,
        responseType: "refusal",
        submissionMode: mode,
        privacyAlert: {
          detected: false,
          message: "",
        },
        conversationalReply:
          "No puedo modificar las reglas de evaluación ni ignorar la rúbrica oficial. Estoy configurado exclusivamente para ayudarte a mejorar tu memoria de Tecnología e Ingeniería mediante evaluación formativa.",
        tutorFinalQuestion:
          "¿Qué apartado concreto de tu memoria sobre energías renovables quieres revisar ahora según la rúbrica?",
      };
      return NextResponse.json(refusalEvaluation, {
        status: 200,
        headers: NO_CACHE_HEADERS,
      });
    }

    // 5. Comprobar presencia de datos personales antes de enviar a Gemini
    const personalData = detectPersonalDataInText(text);
    if (personalData.detected) {
      const privacyEvaluation: StructuredEvaluation = {
        correctorVersion: CORRECTOR_VERSION,
        responseType: "privacy_block",
        submissionMode: mode,
        privacyAlert: {
          detected: true,
          message: `Se han detectado posibles datos identificativos (${personalData.reasons.join(", ")}). Por protección de datos, he detenido la evaluación antes de enviarla al modelo de IA. Elimina nombres, apellidos, correos, DNI o teléfonos y vuelve a enviar tu texto.`,
        },
        tutorFinalQuestion:
          "Cuando hayas anonimizado el texto, ¿qué apartado o cálculo te gustaría que revisemos primero?",
      };
      return NextResponse.json(privacyEvaluation, {
        status: 200,
        headers: NO_CACHE_HEADERS,
      });
    }

    // 6. Si falta GEMINI_API_KEY, devolver evaluación de demostración claramente identificada
    if (!process.env.GEMINI_API_KEY?.trim()) {
      const demo = buildDemoEvaluation(mode, Boolean(pdfBuffer));
      return NextResponse.json(demo, {
        status: 200,
        headers: NO_CACHE_HEADERS,
      });
    }

    // 7. Llamada segura a Gemini en memoria
    const evaluation = await evaluateWithGemini({
      mode,
      text,
      pdfBuffer,
      pdfName,
      history,
    });

    return NextResponse.json(evaluation, {
      status: 200,
      headers: NO_CACHE_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const lower = message.toLowerCase();

    if (message === "MISSING_API_KEY") {
      return NextResponse.json(
        {
          error:
            "Falta configurar la variable de entorno GEMINI_API_KEY en el servidor.",
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    if (
      lower.includes("api_key_invalid") ||
      lower.includes("api key not valid") ||
      lower.includes("permission_denied") ||
      lower.includes("401") ||
      lower.includes("403")
    ) {
      return NextResponse.json(
        {
          error:
            "La clave GEMINI_API_KEY configurada en Vercel no es válida para Gemini API. Verifica en Google AI Studio que tu clave empiece por AIza... y redeploya.",
        },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    if (
      lower.includes("resource_exhausted") ||
      lower.includes("quota") ||
      lower.includes("429")
    ) {
      return NextResponse.json(
        {
          error:
            "Se ha superado temporalmente la cuota de Gemini API. Espera unos segundos o revisa los límites en Google AI Studio.",
        },
        { status: 429, headers: NO_CACHE_HEADERS }
      );
    }

    if (
      (lower.includes("model") && lower.includes("not found")) ||
      lower.includes("404")
    ) {
      return NextResponse.json(
        {
          error:
            "El modelo configurado en GEMINI_MODEL no está disponible. Prueba a configurar GEMINI_MODEL=gemini-3.5-flash en Vercel.",
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    if (
      lower.includes("unavailable") ||
      lower.includes("high demand") ||
      lower.includes("503")
    ) {
      return NextResponse.json(
        {
          error:
            "Los servidores de Gemini están experimentando un pico temporal de demanda. Inténtalo de nuevo en unos segundos.",
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        error:
          "No se pudo completar la evaluación con Gemini en este momento. Inténtalo de nuevo en unos segundos.",
      },
      { status: 502, headers: NO_CACHE_HEADERS }
    );
  }
}
