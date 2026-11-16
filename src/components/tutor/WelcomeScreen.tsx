"use client";

import { FileText, FileUp, MessageSquareText, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WelcomeScreenProps {
  onSelectUploadPdf: () => void;
  onSelectPasteText: () => void;
}

export function WelcomeScreen({
  onSelectUploadPdf,
  onSelectPasteText,
}: WelcomeScreenProps) {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-[#64748B] shadow-2xs">
          <Compass className="h-3.5 w-3.5 text-[#14B8A6]" />
          <span>Energías Renovables · Canarias</span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-[#1E293B] sm:text-3xl">
          Tu trabajo puede mejorar. Vamos a descubrir cómo.
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-[#64748B] sm:text-base">
          Soy tu tutor de Tecnología e Ingeniería. Revisaré tu memoria sobre
          energías renovables, identificaré aspectos que puedes mejorar y te
          ayudaré a alcanzar los niveles más altos de la rúbrica. No haré el
          trabajo por ti: aprenderemos mediante preguntas, reflexión y revisión.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            size="lg"
            onClick={onSelectUploadPdf}
            className="min-w-[165px]"
          >
            <FileUp className="h-4 w-4" />
            Subir PDF
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onSelectPasteText}
            className="min-w-[165px]"
          >
            <FileText className="h-4 w-4 text-[#14B8A6]" />
            Pegar texto
          </Button>
        </div>
      </div>

      <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
        <Card className="transition-shadow hover:shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#3B82F6]">
              <FileUp className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#1E293B]">
              Revisa tu memoria
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
              Sube tu PDF y recibe una evaluación estructurada por cada criterio
              de la rúbrica oficial.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0FDFA] text-[#14B8A6]">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#1E293B]">
              Consulta un fragmento
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
              Pega un apartado concreto o un cálculo y recibe recomendaciones sin
              penalizar lo que aún no has enviado.
            </p>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0FDF4] text-[#16A34A]">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-[#1E293B]">
              Mejora paso a paso
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
              Conversa con el tutor, resuelve retos técnicos y vuelve a revisar
              tu trabajo mejorado.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
