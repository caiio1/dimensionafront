import React, { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Activity, Calendar, FileText, Heart, User } from "lucide-react";
import { avaliacoesApi } from "@/lib/api";
import { fetchScpMetodoByKey } from "@/lib/scpSchemas";

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  prontuario?: string;
  sexo: "M" | "F";
  dataNascimento: string;
  idade: number;
  created_at: string;
  updated_at: string;
}

interface AvaliacaoSCP {
  id: string;
  dataAplicacao: string;
  scp: string;
  itens: Record<string, number>;
  totalPontos: number;
  classificacao: string;
}

interface PatientDetailsModalProps {
  paciente: Paciente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SchemaOption = { label: string; value: number };
type SchemaQuestion = { key: string; text: string; options: SchemaOption[] };
type Schema = { title?: string; questions?: SchemaQuestion[] };
// fetch per-scp template when needed

export function PatientDetailsModal({
  paciente,
  open,
  onOpenChange,
}: PatientDetailsModalProps) {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoSCP[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaCache, setSchemaCache] = useState<
    Record<string, Schema | undefined>
  >({});

  const isWithData = (x: unknown): x is { data: AvaliacaoSCP[] } => {
    return (
      typeof x === "object" &&
      x !== null &&
      "data" in x &&
      Array.isArray((x as { data?: unknown }).data)
    );
  };

  const carregarAvaliacoes = useCallback(async () => {
    if (!paciente) return;
    setLoading(true);
    try {
      const resp = await avaliacoesApi.listarPorPaciente(paciente.id);
      const lista: AvaliacaoSCP[] = Array.isArray(resp)
        ? resp
        : isWithData(resp)
        ? resp.data
        : [];
      setAvaliacoes(lista);
    } catch (e) {
      console.error("Erro ao carregar avaliações:", e);
      setAvaliacoes([]);
    } finally {
      setLoading(false);
    }
  }, [paciente]);

  useEffect(() => {
    if (open && paciente) {
      void carregarAvaliacoes();
    }
  }, [open, paciente, carregarAvaliacoes]);

  // quando avaliações carregarem, busque templates necessários
  useEffect(() => {
    const keys = Array.from(new Set(avaliacoes.map((a) => a.scp)));
    if (!keys.length) return;

    let mounted = true;
    (async () => {
      for (const k of keys) {
        if (schemaCache[k]) continue;
        try {
          const t = await fetchScpMetodoByKey(k);
          if (!mounted) return;
          if (t) {
            setSchemaCache((s) => ({
              ...s,
              [k]: { title: t.title, questions: t.questions },
            }));
          }
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [avaliacoes, schemaCache]);

  const formatarIdade = (dataNascimento: string) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    if (isNaN(nascimento.getTime())) return "Idade não disponível";
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate()))
      idade--;
    idade = Math.max(0, idade);
    if (idade === 0) return "Recém-nascido";
    if (idade === 1) return "1 ano";
    return `${idade} anos`;
  };

  const formatarData = (data: string) =>
    new Date(data).toLocaleDateString("pt-BR");

  const formatarClassificacao = (classificacao: string) => {
    const map: Record<string, string> = {
      MINIMOS: "Cuidados Mínimos",
      INTERMEDIARIOS: "Cuidados Intermediários",
      ALTA_DEPENDENCIA: "Alta Dependência",
      SEMI_INTENSIVOS: "Semi-Intensivos",
      INTENSIVOS: "Cuidados Intensivos",
    };
    return map[classificacao] || classificacao;
  };

  const badgeVariant = (classificacao: string) => {
    switch (classificacao) {
      case "MINIMOS":
        return "secondary" as const;
      case "INTERMEDIARIOS":
        return "outline" as const;
      case "ALTA_DEPENDENCIA":
        return "secondary" as const;
      case "SEMI_INTENSIVOS":
        return "default" as const;
      case "INTENSIVOS":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  if (!paciente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Detalhes do Paciente</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Informações Pessoais</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Nome
                  </div>
                  <div className="text-lg font-semibold">{paciente.nome}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    CPF
                  </div>
                  <div className="text-lg font-semibold">{paciente.cpf}</div>
                </div>
                {paciente.prontuario && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Prontuário
                    </div>
                    <div className="text-lg font-semibold">
                      {paciente.prontuario}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Sexo
                  </div>
                  <div className="text-lg font-semibold">
                    {paciente.sexo === "M" ? "Masculino" : "Feminino"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Data de Nascimento
                  </div>
                  <div className="text-lg font-semibold">
                    {formatarData(paciente.dataNascimento)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Idade
                  </div>
                  <div className="text-lg font-semibold">
                    {formatarIdade(paciente.dataNascimento)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Cadastrado em
                  </div>
                  <div className="text-lg font-semibold">
                    {formatarData(paciente.created_at)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Avaliações SCP</span>
                {avaliacoes.length > 0 && (
                  <Badge variant="secondary">{avaliacoes.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : avaliacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma avaliação SCP registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {avaliacoes.map((av) => {
                    const schema =
                      (schemaCache[av.scp] as Schema | undefined) || undefined;
                    return (
                      <Card key={av.id} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Heart className="h-4 w-4 text-primary" />
                              <span className="font-medium">
                                {schema?.title || av.scp}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Data:</span>
                              <span className="text-foreground">
                                {formatarData(av.dataAplicacao)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <span>Método:</span>
                              <Badge variant="outline">
                                {schema?.title || av.scp}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <span>Resultado:</span>
                              <Badge variant={badgeVariant(av.classificacao)}>
                                {formatarClassificacao(av.classificacao)}
                              </Badge>
                              <span className="ml-2">
                                • Total: {av.totalPontos}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Separator className="mb-3" />
                          {schema?.questions ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {schema.questions.map((q) => (
                                <div key={q.key} className="space-y-1">
                                  <div className="font-medium text-muted-foreground">
                                    {q.text}
                                  </div>
                                  <div className="text-foreground">
                                    {av.itens[q.key] !== undefined ? (
                                      <span className="flex items-center space-x-2">
                                        <Badge variant="outline">
                                          {av.itens[q.key]} pontos
                                        </Badge>
                                        <span className="text-xs">
                                          {q.options.find(
                                            (opt) =>
                                              opt.value === av.itens[q.key]
                                          )?.label || "Opção não encontrada"}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground italic">
                                        Não respondido
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Método desconhecido para detalhar perguntas.
                              Itens:
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-foreground">
                                {Object.entries(av.itens).map(([k, v]) => (
                                  <div
                                    key={k}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="font-medium">{k}</span>
                                    <Badge variant="outline">{v} pontos</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
