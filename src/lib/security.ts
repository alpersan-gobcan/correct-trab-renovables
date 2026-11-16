export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TEXT_LENGTH = 120_000;
export const MAX_HISTORY_TURNS = 16;

export interface PdfValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePdfBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): PdfValidationResult {
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    return {
      valid: false,
      error: "El archivo debe tener extensión .pdf.",
    };
  }

  if (mimeType && mimeType !== "application/pdf" && mimeType !== "application/x-pdf") {
    return {
      valid: false,
      error: "El tipo MIME del archivo no corresponde a un documento PDF.",
    };
  }

  if (buffer.byteLength === 0) {
    return {
      valid: false,
      error: "El archivo PDF está vacío.",
    };
  }

  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "El archivo supera el límite máximo permitido de 10 MB.",
    };
  }

  // Verificar firma mágica %PDF- en los primeros bytes
  const header = buffer.subarray(0, 5).toString("ascii");
  if (header !== "%PDF-") {
    return {
      valid: false,
      error: "El contenido del archivo no corresponde a un PDF válido.",
    };
  }

  return { valid: true };
}

export interface PersonalDataCheckResult {
  detected: boolean;
  reasons: string[];
}

/**
 * Comprueba patrones obvios de datos identificativos antes de enviar texto a Gemini.
 * No almacena ni registra el contenido analizado.
 */
export function detectPersonalDataInText(text: string): PersonalDataCheckResult {
  if (!text) {
    return { detected: false, reasons: [] };
  }

  const reasons: string[] = [];

  // Correo electrónico
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  if (emailRegex.test(text)) {
    reasons.push("dirección de correo electrónico");
  }

  // DNI o NIE español (8 dígitos + letra, o X/Y/Z + 7 dígitos + letra)
  const dniNieRegex = /\b(?:\d{8}[-\s]?[A-HJ-NP-TV-Z]|[XYZ][-\s]?\d{7}[-\s]?[A-HJ-NP-TV-Z])\b/i;
  if (dniNieRegex.test(text)) {
    reasons.push("DNI/NIE");
  }

  // Teléfonos españoles (9 dígitos empezando por 6, 7, 8 o 9)
  const phoneRegex = /(?:\+34\s?)?\b[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/;
  if (phoneRegex.test(text)) {
    reasons.push("número de teléfono");
  }

  // Etiquetas explícitas de autoría con valor rellenado
  const labeledNameRegex =
    /(?:^|\n)\s*(?:nombre\s*(?:y\s*apellidos)?|alumn[oa]|autor(?:a)?|realizado\s+por|elaborado\s+por)\s*:\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}/im;
  if (labeledNameRegex.test(text)) {
    reasons.push("nombre propio en campo de autoría");
  }

  return {
    detected: reasons.length > 0,
    reasons,
  };
}

/**
 * Detecta intentos explícitos de alterar o anular las reglas del sistema del corrector.
 */
export function detectRuleTamperingAttempt(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();

  const suspiciousPatterns: RegExp[] = [
    /ignora\s+(?:todas\s+)?las\s+instrucciones\s+anteriores/i,
    /olvida\s+(?:todas\s+)?(?:tus\s+)?reglas/i,
    /cambia\s+(?:tu\s+)?prompt\s+de\s+sistema/i,
    /act[uú]a\s+como\s+si\s+no\s+tuvieras\s+r[uú]brica/i,
    /ponme\s+un\s+10\s+(?:directamente|sin\s+corregir)/i,
    /ignore\s+previous\s+instructions/i,
    /system\s+prompt\s*:/i,
    /developer\s+message\s*:/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(normalized));
}
