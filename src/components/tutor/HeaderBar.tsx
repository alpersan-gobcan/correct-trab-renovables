"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HeaderBarProps {
  onNewConversation: () => void;
  hasMessages: boolean;
  apiKeyConfigured: boolean | null;
}

export function HeaderBar({
  onNewConversation,
  hasMessages,
  apiKeyConfigured,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#3B82F6] ring-1 ring-[#BFDBFE]"
            aria-hidden="true"
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-[#1E293B] sm:text-lg">
                Tutor IA
              </h1>
              <Badge variant="teal" className="hidden sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
                Evaluación formativa
              </Badge>
              {apiKeyConfigured === false && (
                <Badge variant="ambar">Modo demostración</Badge>
              )}
            </div>
            <p className="truncate text-xs text-[#64748B] sm:text-sm">
              Tecnología e Ingeniería · 1.º Bachillerato
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onNewConversation}
            disabled={!hasMessages}
            title="Borrar mensajes, archivos y evaluaciones de esta sesión"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nueva conversación</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
