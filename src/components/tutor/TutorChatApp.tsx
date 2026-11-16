"use client";

import * as React from "react";
import {
  AlertCircle,
  FileText,
  Loader2,
  Paperclip,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { EvaluationView } from "@/components/tutor/EvaluationView";
import { HeaderBar } from "@/components/tutor/HeaderBar";
import { WelcomeScreen } from "@/components/tutor/WelcomeScreen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ChatMessage,
  HistoryTurn,
  StructuredEvaluation,
  SubmissionMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function summarizeEvaluationForHistory(ev: StructuredEvaluation): string {
  if (ev.conversationalReply) {
    return `${ev.conversationalReply}\n\nPregunta del tutor: ${ev.tutorFinalQuestion}`;
  }
  const criteriaSummary = (ev.rubricCriteria ?? [])
    .filter((c) => c.applicable)
    .map((c) => `${c.name}: Nivel ${c.level ?? "-"} (${c.gradeRange})`)
    .join("; ");
  return [
    ev.academicAuthenticity?.summary ?? "",
    criteriaSummary,
    `Pregunta del tutor: ${ev.tutorFinalQuestion}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function TutorChatApp() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputText, setInputText] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [mode, setMode] = React.useState<SubmissionMode>("fragment");
  const [isSending, setIsSending] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [clientError, setClientError] = React.useState<string | null>(null);

  const [integrityError, setIntegrityError] = React.useState<string | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = React.useState<boolean | null>(
    null
  );

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as {
          integrityOk?: boolean;
          error?: string;
          apiKeyConfigured?: boolean;
        };
        if (!active) return;
        if (!res.ok || data.integrityOk === false) {
          setIntegrityError(
            data.error ||
              "ERROR DE INTEGRIDAD: No se ha podido verificar la rúbrica oficial o la configuración del corrector. Comunica la incidencia al profesorado"
          );
        }
        setApiKeyConfigured(Boolean(data.apiKeyConfigured));
      })
      .catch(() => {
        if (!active) return;
        setApiKeyConfigured(null);
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleFileSelection = (file: File | null) => {
    setClientError(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setClientError("Solo se admiten archivos en formato PDF (.pdf).");
      return;
    }
    if (file.size === 0) {
      setClientError("El archivo PDF seleccionado está vacío.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError(
        `El archivo supera el límite máximo de 10 MB (${formatBytes(file.size)}).`
      );
      return;
    }

    setSelectedFile(file);
    setMode("full_document");
  };

  const handleNewConversation = () => {
    setMessages([]);
    setInputText("");
    setSelectedFile(null);
    setMode("fragment");
    setClientError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSending || integrityError) return;

    const trimmedText = inputText.trim();
    if (!trimmedText && !selectedFile) {
      setClientError("Escribe un fragmento o adjunta tu memoria en PDF.");
      return;
    }

    setClientError(null);

    const activeMode: SubmissionMode = selectedFile ? "full_document" : mode;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content:
        trimmedText ||
        `He adjuntado el documento «${selectedFile?.name}» para su revisión completa.`,
      mode: activeMode,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
      createdAt: Date.now(),
    };

    const historyTurns: HistoryTurn[] = messages.slice(-12).map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      text:
        msg.role === "user"
          ? msg.content
          : msg.evaluation
            ? summarizeEvaluationForHistory(msg.evaluation)
            : msg.content,
    }));

    const fileToSend = selectedFile;
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("mode", activeMode);
      formData.append("text", trimmedText);
      formData.append("history", JSON.stringify(historyTurns));
      if (fileToSend) {
        formData.append("file", fileToSend);
      }

      const response = await fetch("/api/evaluate", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      const payload = (await response.json()) as StructuredEvaluation & {
        error?: string;
      };

      if (!response.ok) {
        if (
          payload.error &&
          payload.error.startsWith("ERROR DE INTEGRIDAD:")
        ) {
          setIntegrityError(payload.error);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "",
            error:
              payload.error ||
              "No se pudo completar la evaluación. Inténtalo de nuevo.",
            createdAt: Date.now(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "",
          mode: activeMode,
          evaluation: payload,
          createdAt: Date.now(),
        },
      ]);

      // Tras la primera evaluación, facilitar conversación de seguimiento
      setMode("followup");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "",
          error:
            "Error de conexión con el servidor al enviar la consulta. Comprueba tu red e inténtalo de nuevo.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC]">
      <HeaderBar
        onNewConversation={handleNewConversation}
        hasMessages={messages.length > 0 || Boolean(selectedFile) || Boolean(inputText)}
        apiKeyConfigured={apiKeyConfigured}
      />

      {integrityError && (
        <div className="mx-auto mt-4 w-full max-w-4xl px-4 sm:px-6">
          <div className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B] shadow-xs">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" />
            <p className="font-medium leading-relaxed">{integrityError}</p>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen
            onSelectUploadPdf={() => fileInputRef.current?.click()}
            onSelectPasteText={() => {
              setMode("fragment");
              textareaRef.current?.focus();
            }}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#3B82F6] px-4 py-3 text-sm text-white shadow-xs sm:max-w-[75%]">
                    {msg.fileName && (
                      <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate font-medium">
                          {msg.fileName}
                        </span>
                        {msg.fileSize !== undefined && (
                          <span className="shrink-0 opacity-85">
                            ({formatBytes(msg.fileSize)})
                          </span>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-start">
                  <div className="w-full max-w-full sm:max-w-[92%]">
                    {msg.error ? (
                      <div className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                        <p>{msg.error}</p>
                      </div>
                    ) : msg.evaluation ? (
                      <EvaluationView evaluation={msg.evaluation} />
                    ) : null}
                  </div>
                </div>
              )
            )}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#64748B] shadow-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-[#3B82F6]" />
                  <span>
                    Analizando tu trabajo con la rúbrica oficial…
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-xs">
        <div className="mx-auto w-full max-w-4xl px-4 py-3 sm:px-6">
          <form
            onSubmit={handleSubmit}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files?.[0] ?? null;
              handleFileSelection(dropped);
            }}
            className={cn(
              "rounded-2xl border bg-[#F8FAFC] p-3 transition-colors",
              isDragging
                ? "border-[#3B82F6] bg-[#EFF6FF]/60"
                : "border-[#E2E8F0]"
            )}
          >
            {/* Selector de modalidad + indicador de archivo */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode("fragment")}
                  disabled={Boolean(selectedFile)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                    mode === "fragment" && !selectedFile
                      ? "bg-[#3B82F6] text-white"
                      : "bg-white text-[#64748B] hover:text-[#1E293B] border border-[#E2E8F0]"
                  )}
                >
                  Revisar fragmento
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("full_document");
                    if (!selectedFile) fileInputRef.current?.click();
                  }}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                    mode === "full_document" || selectedFile
                      ? "bg-[#3B82F6] text-white"
                      : "bg-white text-[#64748B] hover:text-[#1E293B] border border-[#E2E8F0]"
                  )}
                >
                  Documento completo (PDF)
                </button>
                {messages.length > 0 && !selectedFile && (
                  <button
                    type="button"
                    onClick={() => setMode("followup")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                      mode === "followup"
                        ? "bg-[#14B8A6] text-white"
                        : "bg-white text-[#64748B] hover:text-[#1E293B] border border-[#E2E8F0]"
                    )}
                  >
                    Duda / seguimiento
                  </button>
                )}
              </div>

              {selectedFile ? (
                <Badge variant="blue" className="max-w-full">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[180px]">
                    {selectedFile.name}
                  </span>
                  <span className="opacity-80">
                    ({formatBytes(selectedFile.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setMode(messages.length > 0 ? "followup" : "fragment");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="Quitar PDF adjunto"
                    className="ml-1 rounded-full p-0.5 hover:bg-black/10 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : (
                <span className="hidden items-center gap-1 text-xs text-[#64748B] sm:inline-flex">
                  <UploadCloud className="h-3.5 w-3.5 text-[#14B8A6]" />
                  Arrastra un PDF aquí (máx. 10 MB)
                </span>
              )}
            </div>

            {clientError && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{clientError}</span>
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) =>
                  handleFileSelection(e.target.files?.[0] ?? null)
                }
              />

              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || Boolean(integrityError)}
                title="Adjuntar PDF (máximo 10 MB)"
                aria-label="Adjuntar archivo PDF"
                className="shrink-0"
              >
                <Paperclip className="h-4 w-4 text-[#64748B]" />
              </Button>

              <textarea
                ref={textareaRef}
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending || Boolean(integrityError)}
                placeholder={
                  selectedFile
                    ? "Opcional: añade una nota sobre tu PDF o pulsa Enviar para evaluarlo..."
                    : mode === "followup"
                      ? "Escribe tu duda o pega tu apartado mejorado para volver a revisarlo..."
                      : "Pega aquí un apartado o cálculo de tu memoria (o arrastra un PDF)..."
                }
                className="max-h-40 min-h-[44px] w-full resize-y rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 disabled:opacity-60"
              />

              <Button
                type="submit"
                disabled={
                  isSending ||
                  Boolean(integrityError) ||
                  (!inputText.trim() && !selectedFile)
                }
                className="shrink-0"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Evaluando</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Enviar</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          <p className="mt-2 text-center text-[11px] leading-snug text-[#64748B]">
            No incluyas nombres ni datos personales. La evaluación es orientativa.
            Los envíos se procesan mediante la API de Google Gemini según sus
            condiciones aplicables.
          </p>
        </div>
      </footer>
    </div>
  );
}
