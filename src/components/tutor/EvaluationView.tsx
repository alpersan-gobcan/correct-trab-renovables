"use client";

import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileCheck2,
  HelpCircle,
  Info,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CriterionStatus, StructuredEvaluation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EvaluationViewProps {
  evaluation: StructuredEvaluation;
}

const STATUS_LABELS: Record<CriterionStatus, string> = {
  verde: "Bien desarrollado",
  ambar: "Necesita mejoras",
  rojo: "Deficiencias importantes",
  gris: "No evaluable",
};

const STATUS_CARD_BORDER: Record<CriterionStatus, string> = {
  verde: "border-l-4 border-l-[#16A34A]",
  ambar: "border-l-4 border-l-[#D97706]",
  rojo: "border-l-4 border-l-[#EF4444]",
  gris: "border-l-4 border-l-[#94A3B8]",
};

export function EvaluationView({ evaluation }: EvaluationViewProps) {
  return (
    <div className="space-y-4">
      {evaluation.isDemo && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-xs text-[#92400E] sm:text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
          <div>
            <p className="font-semibold">
              Evaluación de demostración (sin conexión real con Gemini)
            </p>
            <p className="mt-0.5 leading-relaxed">
              La rúbrica oficial está verificada, pero falta configurar{" "}
              <code className="rounded bg-[#FEF3C7] px-1 py-0.5 font-mono text-xs">
                GEMINI_API_KEY
              </code>{" "}
              en el servidor para realizar una evaluación académica real.
            </p>
          </div>
        </div>
      )}

      {evaluation.privacyAlert?.detected && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" />
          <div>
            <p className="font-semibold">Aviso de privacidad y anonimización</p>
            <p className="mt-1 leading-relaxed">
              {evaluation.privacyAlert.message}
            </p>
          </div>
        </div>
      )}

      {evaluation.conversationalReply && (
        <Card>
          <CardContent className="p-4 text-sm leading-relaxed text-[#1E293B] sm:p-5">
            <p className="whitespace-pre-line">{evaluation.conversationalReply}</p>
          </CardContent>
        </Card>
      )}

      {evaluation.academicAuthenticity && (
        <Card className={STATUS_CARD_BORDER[evaluation.academicAuthenticity.status]}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Sparkles className="h-4 w-4 text-[#3B82F6]" />
                Diagnóstico de autenticidad académica
              </CardTitle>
              <Badge variant={evaluation.academicAuthenticity.status}>
                {STATUS_LABELS[evaluation.academicAuthenticity.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="leading-relaxed text-[#1E293B]">
              {evaluation.academicAuthenticity.summary}
            </p>

            {evaluation.academicAuthenticity.findings.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Observaciones técnicas
                </p>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[#334155] sm:text-sm">
                  {evaluation.academicAuthenticity.findings.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.academicAuthenticity.suggestions.length > 0 && (
              <div className="rounded-xl bg-[#F8FAFC] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Cómo ganar profundidad
                </p>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[#334155] sm:text-sm">
                  {evaluation.academicAuthenticity.suggestions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#14B8A6]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {evaluation.rubricCriteria && evaluation.rubricCriteria.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
              <ClipboardList className="h-4 w-4 text-[#3B82F6]" />
              Evaluación por rúbrica oficial
            </h4>
            <span className="text-xs text-[#64748B]">
              {evaluation.submissionMode === "fragment"
                ? "Modo fragmento (solo criterios aplicables)"
                : "Documento completo"}
            </span>
          </div>

          <div className="grid gap-3">
            {evaluation.rubricCriteria.map((criterion) => (
              <Card
                key={criterion.id}
                className={cn(
                  STATUS_CARD_BORDER[criterion.status],
                  !criterion.applicable && "bg-[#F8FAFC]/80"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-[#1E293B]">
                      {criterion.name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {criterion.applicable && criterion.level !== null ? (
                        <Badge variant="blue">
                          Nivel {criterion.level}/5 ({criterion.gradeRange})
                        </Badge>
                      ) : (
                        <Badge variant="gris">No evaluable</Badge>
                      )}
                      <Badge variant={criterion.status}>
                        {STATUS_LABELS[criterion.status]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  <p className="leading-relaxed text-[#334155]">
                    {criterion.justification}
                  </p>

                  {criterion.evidences.length > 0 && (
                    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <p className="text-xs font-semibold text-[#1E293B]">
                        Evidencias observadas en tu texto
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[#475569]">
                        {criterion.evidences.map((ev, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
                            <span>{ev}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {criterion.pendingAspects.length > 0 && (
                    <div className="rounded-xl border border-[#FDE68A]/70 bg-[#FFFBEB]/60 p-3">
                      <p className="text-xs font-semibold text-[#92400E]">
                        Aspectos pendientes para subir de nivel
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[#78350F]">
                        {criterion.pendingAspects.map((pending, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706]" />
                            <span>{pending}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {evaluation.formatAudit && evaluation.formatAudit.evaluated && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <FileCheck2 className="h-4 w-4 text-[#14B8A6]" />
              Verificación de formato y maquetación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs leading-relaxed text-[#64748B] sm:text-sm">
              {evaluation.formatAudit.note}
            </p>
            {evaluation.formatAudit.items.length > 0 && (
              <div className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0]">
                {evaluation.formatAudit.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#1E293B]">
                        {item.aspect}
                      </p>
                      <p className="text-xs text-[#64748B]">{item.detail}</p>
                    </div>
                    <Badge
                      variant={
                        item.status === "verificado_ok"
                          ? "verde"
                          : item.status === "mejorable"
                            ? "ambar"
                            : "gris"
                      }
                      className="self-start sm:self-center"
                    >
                      {item.status === "verificado_ok"
                        ? "Verificado"
                        : item.status === "mejorable"
                          ? "Mejorable"
                          : "No verificable (revisión manual)"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {evaluation.globalAssessment && (
        <Card className="border-[#BFDBFE] bg-[#EFF6FF]/50">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-[#3B82F6]" />
              <div>
                <p className="text-sm font-semibold text-[#1E293B]">
                  Valoración global orientativa
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">
                  {evaluation.globalAssessment.note}
                </p>
              </div>
            </div>
            {evaluation.globalAssessment.canCalculate && (
              <Badge variant="blue" className="self-start px-3 py-1 text-sm sm:self-center">
                {evaluation.globalAssessment.estimatedRange}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {evaluation.roadmap && evaluation.roadmap.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Compass className="h-4 w-4 text-[#14B8A6]" />
              Hoja de ruta de mejora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {evaluation.roadmap.map((action, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
              >
                <div className="flex items-start gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-semibold text-white">
                    {idx + 1}
                  </span>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <p className="font-semibold text-[#1E293B]">
                      {action.problem}
                    </p>
                    <p className="text-[#475569]">
                      <span className="font-medium text-[#1E293B]">
                        Por qué importa:{" "}
                      </span>
                      {action.importance}
                    </p>
                    <p className="text-[#1D4ED8]">
                      <span className="font-medium">Reto técnico: </span>
                      {action.technicalChallenge}
                    </p>
                    <p className="text-[#0F766E]">
                      <span className="font-medium">Dónde investigar: </span>
                      {action.researchGuidance}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-[#99F6E4] bg-[#F0FDFA]/70">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#14B8A6]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0F766E]">
              Pregunta del tutor
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-[#1E293B]">
              {evaluation.tutorFinalQuestion}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
