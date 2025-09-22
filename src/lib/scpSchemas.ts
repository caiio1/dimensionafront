// Lightweight shared types for SCP methods used by the UI.
export enum SCPType {
  FUGULIN = "FUGULIN",
  PERROCA = "PERROCA",
  DINI = "DINI",
}

export interface Option {
  label: string;
  value: number;
}

export interface Question {
  key: string; // chave que será usada no objeto `itens` na avaliação
  text: string;
  options: Option[];
}

export interface SCPSchema {
  id?: string;
  scp: SCPType | string;
  key?: string;
  title: string;
  description?: string;
  questions: Question[];
}

// Runtime helpers: fetch SCP methods from backend
import { api } from "@/lib/api";

type ApiResponse<T> = { data: T };

export async function fetchScpMetodos(): Promise<SCPSchema[]> {
  const res = (await api.get("/scp-metodos")) as ApiResponse<SCPSchema[]>;
  return res.data;
}
export async function fetchScpMetodoByKey(
  key: string
): Promise<SCPSchema | null> {
  try {
    const res = (await api.get(
      `/scp-metodos/key/${encodeURIComponent(key)}`
    )) as ApiResponse<SCPSchema>;
    return res.data;
  } catch {
    return null;
  }
}

// default empty export kept for compatibility with some existing imports
const scpSchemas: Record<string, SCPSchema> = Object.create(null);
export default scpSchemas;
