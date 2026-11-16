import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { CORRECTOR_VERSION, PROTECTED_SYSTEM_PROMPT } from "@/lib/rubric";
import type {
  HistoryTurn,
  StructuredEvaluation,
  SubmissionMode,
} from "@/lib/types";

const EVALUATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    responseType: {
      type: Type.STRING,
      enum: ["evaluation", "followup", "privacy_block", "refusal"],
    },
    privacyAlert: {
      type: Type.OBJECT,
      properties: {
        detected: { type: Type.BOOLEAN },
        message: { type: Type.STRING },
      },
      required: ["detected", "message"],
    },
    academicAuthenticity: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          enum: ["verde", "ambar", "rojo", "gris"],
        },
        summary: { type: Type.STRING },
        findings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        suggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ["status", "summary", "findings", "suggestions"],
    },
    rubricCriteria: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          applicable: { type: Type.BOOLEAN },
          level: { type: Type.INTEGER, nullable: true },
          gradeRange: { type: Type.STRING },
          status: {
            type: Type.STRING,
            enum: ["verde", "ambar", "rojo", "gris"],
          },
          justification: { type: Type.STRING },
          evidences: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          pendingAspects: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          "id",
          "name",
          "applicable",
          "gradeRange",
          "status",
          "justification",
          "evidences",
          "pendingAspects",
        ],
      },
    },
    formatAudit: {
      type: Type.OBJECT,
      properties: {
        evaluated: { type: Type.BOOLEAN },
        note: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              aspect: { type: Type.STRING },
              status: {
                type: Type.STRING,
                enum: ["verificado_ok", "mejorable", "no_verificable"],
              },
              detail: { type: Type.STRING },
            },
            required: ["aspect", "status", "detail"],
          },
        },
      },
      required: ["evaluated", "note", "items"],
    },
    globalAssessment: {
      type: Type.OBJECT,
      properties: {
        canCalculate: { type: Type.BOOLEAN },
        estimatedRange: { type: Type.STRING },
        note: { type: Type.STRING },
      },
      required: ["canCalculate", "estimatedRange", "note"],
    },
    roadmap: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          problem: { type: Type.STRING },
          importance: { type: Type.STRING },
          technicalChallenge: { type: Type.STRING },
          researchGuidance: { type: Type.STRING },
        },
        required: [
          "problem",
          "importance",
          "technicalChallenge",
          "researchGuidance",
        ],
      },
    },
    tutorFinalQuestion: { type: Type.STRING },
    conversationalReply: { type: Type.STRING },
  },
  required: ["responseType", "privacyAlert", "tutorFinalQuestion"],
};

export interface EvaluateWithGeminiParams {
  mode: SubmissionMode;
  text: string;
  pdfBuffer?: Buffer;
  pdfName?: string;
  history: HistoryTurn[];
}

export async function evaluateWithGemini({
  mode,
  text,
  pdfBuffer,
  pdfName,
  history,
}: EvaluateWithGeminiParams): Promise<StructuredEvaluation> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });

  const modeInstruction =
    mode === "full_document"
      ? "MODALIDAD ACTUAL: Revisión de documento completo (PDF). Evalúa los 5 criterios de la rúbrica oficial, comprueba las 9 fuentes obligatorias, los cálculos en SI, el análisis crítico ambiental en Canarias y la auditoría de formato (marcando explícitamente como 'no_verificable' cualquier propiedad física que no pueda medirse con certeza desde el PDF)."
      : mode === "fragment"
        ? "MODALIDAD ACTUAL: Revisión de fragmento de texto pegado. Analiza ÚNICAMENTE el contenido aportado. NO penalices apartados ausentes propios de una memoria completa, NO evalúes propiedades físicas de maquetación (formatAudit.evaluated = false) y marca como applicable: false (status: 'gris') los criterios que no correspondan al fragmento. NO calcules nota global (globalAssessment.canCalculate = false)."
        : "MODALIDAD ACTUAL: Conversación de seguimiento socrática. Responde a la duda o nueva versión del estudiante manteniendo todas las reglas pedagógicas (sin redactar el trabajo por él). Si el estudiante incluye un texto revisado para volver a evaluar, actualiza la evaluación estructurada; si es solo una pregunta, usa responseType: 'followup' y responde en conversationalReply más tutorFinalQuestion.";

  const contents: Array<{
    role: "user" | "model";
    parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    >;
  }> = [];

  for (const turn of history) {
    if (!turn.text.trim()) continue;
    contents.push({
      role: turn.role,
      parts: [{ text: turn.text }],
    });
  }

  const currentParts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

  if (pdfBuffer) {
    currentParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBuffer.toString("base64"),
      },
    });
  }

  const userPrompt = [
    modeInstruction,
    pdfName ? `Archivo PDF adjunto (en memoria): ${pdfName}` : "",
    text.trim()
      ? `Contenido o consulta del estudiante:\n"""\n${text.trim()}\n"""`
      : "El estudiante ha adjuntado el documento PDF para su revisión técnica y evaluación formativa.",
  ]
    .filter(Boolean)
    .join("\n\n");

  currentParts.push({ text: userPrompt });
  contents.push({ role: "user", parts: currentParts });

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: PROTECTED_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: EVALUATION_SCHEMA,
      temperature: 0.25,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("EMPTY_GEMINI_RESPONSE");
  }

  const parsed = JSON.parse(rawText) as Omit<
    StructuredEvaluation,
    "correctorVersion" | "submissionMode"
  >;

  if (!parsed || !parsed.responseType || !parsed.tutorFinalQuestion) {
    throw new Error("INVALID_GEMINI_RESPONSE");
  }

  return {
    ...parsed,
    correctorVersion: CORRECTOR_VERSION,
    submissionMode: mode,
    isDemo: false,
  };
}

export function buildDemoEvaluation(
  mode: SubmissionMode,
  hasPdf: boolean
): StructuredEvaluation {
  return {
    isDemo: true,
    correctorVersion: CORRECTOR_VERSION,
    responseType: "evaluation",
    submissionMode: mode,
    privacyAlert: {
      detected: false,
      message: "",
    },
    academicAuthenticity: {
      status: "ambar",
      summary:
        "EVALUACIÓN DE DEMOSTRACIÓN (sin conexión con Gemini). Configura GEMINI_API_KEY en el servidor para activar la corrección real de tu memoria.",
      findings: [
        "La interfaz y la verificación SHA-256 de la rúbrica oficial funcionan correctamente.",
        hasPdf
          ? "Se ha recibido y validado un archivo PDF en memoria (<= 10 MB) sin almacenarlo en disco."
          : "Se ha recibido el fragmento de texto en memoria temporal.",
      ],
      suggestions: [
        "Añade tu clave de Google AI Studio en .env.local como GEMINI_API_KEY para obtener una auditoría técnica real.",
      ],
    },
    rubricCriteria: [
      {
        id: "c1",
        name: "1. Identificación y explicación de fuentes renovables",
        applicable: true,
        level: 3,
        gradeRange: "5-6",
        status: "ambar",
        justification:
          "Ejemplo de tarjeta de criterio en modo demostración. En la evaluación real, Gemini comprobará las 9 fuentes (hidráulica, solar, eólica, biomasa, RSU, mareomotriz, undimotriz, geotérmica e hidrotérmica).",
        evidences: [
          "Modo demostración: conecta GEMINI_API_KEY para extraer evidencias reales de tu texto.",
        ],
        pendingAspects: [
          "Distinguir principio físico, usos, desarrollo mundial y vinculación canaria en cada fuente.",
        ],
      },
      {
        id: "c2",
        name: "2. Cálculo de magnitudes y análisis de eficiencia",
        applicable: true,
        level: 2,
        gradeRange: "3-4",
        status: "rojo",
        justification:
          "Ejemplo de criterio con margen de mejora importante (rojo suave). Se exige al menos 2-3 desarrollos matemáticos en unidades del SI.",
        evidences: ["Modo demostración."],
        pendingAspects: [
          "Incluir fórmulas, definición de variables en SI y análisis crítico del rendimiento.",
        ],
      },
      {
        id: "c3",
        name: "3. Valoración de sostenibilidad y repercusiones ambientales",
        applicable: mode === "full_document",
        level: mode === "full_document" ? 4 : null,
        gradeRange: mode === "full_document" ? "7-8" : "No evaluable",
        status: mode === "full_document" ? "verde" : "gris",
        justification:
          mode === "full_document"
            ? "Ejemplo de criterio bien desarrollado (verde)."
            : "No evaluable en este fragmento de demostración.",
        evidences: ["Modo demostración."],
        pendingAspects: [],
      },
      {
        id: "c4",
        name: "4. Actualización, precisión de datos y vinculación con Canarias",
        applicable: true,
        level: 3,
        gradeRange: "5-6",
        status: "ambar",
        justification:
          "Ejemplo de criterio sobre datos actualizados y contexto canario (Gorona del Viento, Salto de Chira, ITER, Red Eléctrica, Anuario Energético de Canarias).",
        evidences: ["Modo demostración."],
        pendingAspects: [
          "Citar fecha y fuente de los datos y diferenciar proyectos reales de potencial teórico.",
        ],
      },
      {
        id: "c5",
        name: "5. Coherencia, formato y presentación APA 7",
        applicable: mode === "full_document",
        level: mode === "full_document" ? 3 : null,
        gradeRange: mode === "full_document" ? "5-6" : "No evaluable",
        status: mode === "full_document" ? "ambar" : "gris",
        justification:
          mode === "full_document"
            ? "Ejemplo de revisión estructural y APA 7."
            : "En fragmentos pegados no se evalúa la maquetación física.",
        evidences: ["Modo demostración."],
        pendingAspects: [],
      },
    ],
    formatAudit: {
      evaluated: mode === "full_document",
      note:
        mode === "full_document"
          ? "En modo demostración no se inspecciona el documento con Gemini. Los parámetros físicos requieren verificación."
          : "No se evalúan propiedades físicas de maquetación en fragmentos de texto pegado.",
      items:
        mode === "full_document"
          ? [
              {
                aspect: "Extensión (15-20 páginas de contenido)",
                status: "no_verificable",
                detail: "Requiere evaluación real con Gemini o revisión manual.",
              },
              {
                aspect: "Márgenes (2,5 cm sup/inf; 3 cm izq/der) e interlineado 1,5",
                status: "no_verificable",
                detail: "No verificable automáticamente sin inspección visual/manual.",
              },
            ]
          : [],
    },
    globalAssessment: {
      canCalculate: false,
      estimatedRange: "Modo demostración",
      note: "No se emite calificación académica hasta configurar GEMINI_API_KEY.",
    },
    roadmap: [
      {
        problem: "Evaluación ejecutada en modo demostración",
        importance: "Sin GEMINI_API_KEY no se realiza análisis real del contenido académico.",
        technicalChallenge: "¿Qué fuente de datos oficial usarás para contrastar los porcentajes de generación renovable en Canarias?",
        researchGuidance: "Consulta el Anuario Energético de Canarias y los informes de Red Eléctrica.",
      },
    ],
    tutorFinalQuestion:
      "Mientras configuras tu clave de Gemini en .env.local, ¿qué apartado de tu memoria consideras que tiene cálculos más sólidos y por qué?",
  };
}
