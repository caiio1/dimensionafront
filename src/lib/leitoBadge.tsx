/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Bed, AlertCircle, CheckCircle, Clock } from "lucide-react";

type Variant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "neutral"
  | undefined;

export function getLeitoBadge(
  leito: unknown,
  sessaoAtiva?: unknown,
  avaliacaoStatus?: string
) {
  // Returns a consistent badge descriptor used across pages
  let badgeVariant: Variant = "destructive";
  let badgeLabel = "Pendente";
  let badgeIcon: JSX.Element | null = <Bed className="h-3 w-3" />;
  let badgeClassName: string | undefined;

  // Highest priority: client-side in-progress evaluation
  if (avaliacaoStatus === "em_andamento") {
    badgeVariant = "secondary";
    badgeLabel = "Em Andamento";
    badgeIcon = <Clock className="h-3 w-3" />;
    return { badgeVariant, badgeLabel, badgeIcon, badgeClassName };
  }

  // Fallback: derive from stored leito.status
  const ls = String(
    ((leito as any) && (leito as any).status) || ""
  ).toUpperCase();
  if (ls === "VAGO") {
    badgeVariant = "neutral";
    badgeLabel = "Vago";
    badgeIcon = <Bed className="h-3 w-3" />;
    return { badgeVariant, badgeLabel, badgeIcon, badgeClassName };
  }

  if (ls === "PENDENTE") {
    badgeVariant = "destructive";
    badgeLabel = "Pendente";
    badgeIcon = <AlertCircle className="h-3 w-3" />;
    return { badgeVariant, badgeLabel, badgeIcon, badgeClassName };
  }

  if (ls.startsWith("ATIVO")) {
    badgeVariant = "success";
    badgeLabel = "Ativo";
    badgeIcon = <CheckCircle className="h-3 w-3" />;
    return { badgeVariant, badgeLabel, badgeIcon, badgeClassName };
  }

  if (ls === "INATIVO") {
    badgeVariant = "destructive";
    badgeLabel = "Inativo";
    badgeIcon = <AlertCircle className="h-3 w-3" />;
    // Apply subtle yellow styling to match other pages' intent
    badgeClassName = "bg-yellow-50 text-yellow-800 border border-yellow-200";
    return { badgeVariant, badgeLabel, badgeIcon, badgeClassName };
  }

  // Default fallback
  return { badgeVariant, badgeLabel, badgeIcon, badgeClassName };
}

export default getLeitoBadge;
