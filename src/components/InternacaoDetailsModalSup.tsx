/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  User,
  Bed,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { unwrapData, normalizeList } from "@/lib/apiUtils";

import { useAuth } from "@/hooks/useAuth";
import {
  avaliacoesSessaoApi,
  unidadesApi,
  hospitaisApi,
  metodosScpApi,
  api,
} from "@/lib/api";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "@radix-ui/react-separator";

import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

// Modelo simplificado sem Internação/Paciente
interface LeitoContext {
  leitoId: string;
  numero: string;
  unidadeId: string;
  unidadeNome?: string;
  prontuario?: string;
}

interface Avaliacao {
  id: string;
  metodo: string;
  dataColeta: string;
  status: "nao_realizada" | "em_andamento" | "concluida";
  resultado?: number;
}

interface AvaliacaoSessao {
  id: string;
  leito: { id: string; numero?: string };
  unidade: { id: string; nome?: string };
  expiresAt: string;
  statusSessao: "ATIVA" | "EXPIRADA" | "LIBERADA";
  scp: string;
  prontuario?: string | null;
  itens?: Record<string, number>;
  totalPontos?: number;
  classificacao?: string;
  autor?: { id: string; nome: string; cargo?: string };
}

interface InternacaoDetailsModalProps {
  leito: LeitoContext | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNovaAvaliacao?: (leitoId: string) => void;
  onAvaliacaoConcluida?: (leitoId: string) => void;
  onSessaoCriada?: (sessao: AvaliacaoSessao) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "concluida":
      return "default";
    case "em_andamento":
      return "secondary";
    case "nao_realizada":
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "concluida":
      return <CheckCircle className="h-4 w-4" />;
    case "em_andamento":
      return <Clock className="h-4 w-4" />;
    case "nao_realizada":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "concluida":
      return "Concluída";
    case "em_andamento":
      return "Em Andamento";
    case "nao_realizada":
      return "Não Realizada";
    default:
      return "Desconhecido";
  }
};

export interface MetodoScpQuestionOption {
  label: string;
  value: number;
}
export interface MetodoScpQuestion {
  key: string;
  text: string;
  options: MetodoScpQuestionOption[];
}
export interface MetodoScpModel {
  id: string;
  key: string;
  title: string;
  description?: string;
  questions: MetodoScpQuestion[];
  faixas?: { min: number; max: number; classe: string }[];
}

export function InternacaoDetailsModalSup({
  leito,
  open,
  onOpenChange,
  onNovaAvaliacao,
  onAvaliacaoConcluida,
  onSessaoCriada,
}: InternacaoDetailsModalProps) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // contexto para carregar método e unidade
  const [unidadeNome, setUnidadeNome] = useState<string>("");
  const [metodoScp, setMetodoScp] = useState<MetodoScpModel | null>(null);

  // sub-modal de avaliação
  const [avaliacaoDialogOpen, setAvaliacaoDialogOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [obs, setObs] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  // Sessão de avaliação
  const [sessao, setSessao] = useState<AvaliacaoSessao | null>(null);
  const [pollFlag, setPollFlag] = useState(0); // usado para forçar polling manual
  const SESSION_POLL_INTERVAL = 45000; // 45s

  const [startedSessao, setStartedSessao] = useState(false);
  // prontuário editável
  const [prontuarioValue, setProntuarioValue] = useState("");

  // Referência estável do contexto de leito
  const int = useMemo<LeitoContext | null>(() => {
    if (!leito) return null;
    return {
      leitoId: leito.leitoId,
      numero: leito.numero,
      unidadeId: leito.unidadeId,
      unidadeNome: leito.unidadeNome,
      prontuario: leito.prontuario,
    };
  }, [leito]);

  useEffect(() => {
    if (!open || !int?.leitoId) return;
    // Reset somente quando abre ou muda o leitoId (evita flicker do nome da unidade)
    setAvaliacoes([]);
    setMetodoScp(null);
    setUnidadeNome("");
    setAnswers({});
    setObs("");
    setSessao(null);
    setStartedSessao(false);

    let cancelled = false;
    (async () => {
      try {
        const unidadeResp = await unidadesApi.obter(int.unidadeId);
        if (cancelled) return;
        const u =
          unwrapData<Record<string, unknown>>(unidadeResp) ||
          (unidadeResp as Record<string, unknown>);
        setUnidadeNome((u?.nome as string) || "");
        console.log(u);
        const hId =
          (u?.hospitalId as string) ||
          ((u?.hospital as Record<string, unknown>)?.id as string);
        if (hId) {
          try {
            const hospResp = await hospitaisApi.obter(hId);
            if (cancelled) return;
            const hosp =
              unwrapData<Record<string, unknown>>(hospResp) ||
              (hospResp as Record<string, unknown>);
            if (hosp && hosp.scpMetodo) {
              setMetodoScp(hosp.scpMetodo as MetodoScpModel);
            } else if (hosp && hosp.scpMetodoId) {
              const metodo = await metodosScpApi.obter(
                hosp.scpMetodoId as string
              );
              if (cancelled) return;
              setMetodoScp(unwrapData<MetodoScpModel>(metodo) || null);
            } else {
              setMetodoScp(null);
            }
          } catch {
            if (!cancelled) setMetodoScp(null);
          }
        } else {
          setMetodoScp(null);
        }
      } catch {
        if (!cancelled) setMetodoScp(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, int?.leitoId, int?.unidadeId]);

  // Atualiza prontuário em separado (não queremos resetar unidadeNome por polling externo)
  useEffect(() => {
    if (open) {
      setProntuarioValue(leito?.prontuario || "");
    }
  }, [open, leito?.prontuario]);

  // Limpeza ao fechar o modal
  useEffect(() => {
    if (!open) {
      setAvaliacoes([]);
      setMetodoScp(null);
      setUnidadeNome("");
      setAnswers({});
      setObs("");
      // não limpa prontuarioValue para manter enquanto modal principal aberto
    }
  }, [open]);

  // Alta removida

  const handleNovaAvaliacao = () => {
    if (!metodoScp) {
      toast({
        title: "Método SCP não definido",
        description: "Defina um método SCP no hospital antes de avaliar.",
        variant: "destructive",
      });
      return;
    }
    if (!int) return;

    // Se há sessão ativa, carregar dados para edição
    if (sessao && sessao.statusSessao === "ATIVA" && sessao.itens) {
      setAnswers(sessao.itens);
      if (sessao.prontuario) {
        setProntuarioValue(sessao.prontuario);
      }
    }

    // Se já existe sessão ativa, apenas abre para exibir (não cria outra)
    setAvaliacaoDialogOpen(true);
    // se não há sessão ainda, garantir que countdown não apareça
    if (!sessao) setStartedSessao(false);
  };

  // diasInternado removido (não há internação)

  const resultadoTotal = Object.values(answers).reduce(
    (a, b) => a + (Number(b) || 0),
    0
  );

  const calcularClassificacao = (): string => {
    const faixas = metodoScp?.faixas || [];
    const faixa = faixas.find(
      (f) => resultadoTotal >= f.min && resultadoTotal <= f.max
    );
    return faixa?.classe || "MINIMOS";
  };

  const formatDateYMD = (d: Date) => d.toISOString().slice(0, 10);

  const salvarAvaliacao = async () => {
    if (!int || !metodoScp) return;
    const faltando = (metodoScp.questions || []).some(
      (q) => answers[q.key] === undefined
    );
    if (faltando) {
      toast({
        title: "Responda todas as questões",
        description: "Existem questões sem resposta.",
        variant: "destructive",
      });
      return;
    }
    try {
      setSalvando(true);
      // Backend (repositorio) cria sessão + avaliação numa chamada /avaliacoes/sessao
      // check active sessions to warn about overwrite
      try {
        const sessResp = await avaliacoesSessaoApi.listarAtivas(int.unidadeId);
        const sessoesArr = normalizeList<Record<string, unknown>>(sessResp);
        const existing = sessoesArr.find((s) => {
          const srec = s as Record<string, unknown>;
          const leitoObj = srec.leito as Record<string, unknown> | undefined;
          return (
            (leitoObj && String(leitoObj.id) === int.leitoId) ||
            String(srec.leitoId) === int.leitoId
          );
        });
        if (existing) {
          const ok = window.confirm(
            "Já existe uma sessão ativa para este leito hoje — ao confirmar você sobrescreverá a avaliação existente. Deseja continuar?"
          );
          if (!ok) {
            setSalvando(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Falha ao checar sessões ativas:", err);
      }

      const resp = await avaliacoesSessaoApi.criar({
        leitoId: int.leitoId,
        unidadeId: int.unidadeId,
        scp: metodoScp.key,
        itens: answers,
        colaboradorId: user?.tipo === "COLAB" ? user.id : undefined,
        prontuario: prontuarioValue?.trim() || undefined,
      });
      const av = (resp as any)?.data || resp;
      // guarda como sessão ativa para countdown
      // garante estrutura mínima de leito para evitar crashes em renders que assumem sessao.leito
      const sessaoNormalizada: AvaliacaoSessao = {
        id: av.id,
        scp: av.scp,
        expiresAt:
          av.expiresAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        statusSessao: av.statusSessao || "ATIVA",
        leito:
          av.leito && av.leito.id
            ? av.leito
            : { id: int.leitoId, numero: int.numero || "" },
        unidade:
          av.unidade && av.unidade.id ? av.unidade : { id: int.unidadeId },
        prontuario: av.prontuario ?? int.prontuario,
        itens: av.itens,
        totalPontos: av.totalPontos,
        classificacao: av.classificacao,
        autor: av.autor
          ? { id: av.autor.id, nome: av.autor.nome, cargo: av.autor.cargo }
          : undefined,
      };
      setSessao(sessaoNormalizada);
      setStartedSessao(true); // inicia countdown após confirmação backend
      if (sessaoNormalizada.prontuario) {
        setProntuarioValue(sessaoNormalizada.prontuario);
      }
      // Notifica container para atualizar imediatamente card sem esperar polling
      onSessaoCriada?.(sessaoNormalizada);
      // adiciona/atualiza lista local de avaliações (fallback se rota por internação não refletir)
      setAvaliacoes((prev) => [
        {
          id: av.id,
          metodo: av.scp,
          dataColeta: av.dataAplicacao || formatDateYMD(new Date()),
          status: "concluida",
          resultado: av.totalPontos,
        } as Avaliacao,
        ...prev,
      ]);
      toast({ title: "Sucesso", description: "Avaliação registrada" });
      onAvaliacaoConcluida?.(int.leitoId);
      setAvaliacaoDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao salvar avaliação",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  // Sessão agora é criada somente junto com a avaliação (/avaliacoes/sessao).

  const refreshSessaoAtual = useCallback(async () => {
    if (!int) return;
    try {
      const lista = await avaliacoesSessaoApi.listarAtivas(int.unidadeId);
      const raw = normalizeList<Record<string, unknown>>(lista);
      // filtra itens nulos/indefinidos ou sem objeto leito
      const arr = raw
        .filter((s) => s && typeof s === "object")
        .map((s) => {
          const srec = s as Record<string, unknown>;
          const leitoObj = srec.leito;
          return {
            ...srec,
            leito:
              leitoObj && typeof leitoObj === "object"
                ? {
                    id: String((leitoObj as Record<string, unknown>).id || ""),
                    numero: String(
                      (leitoObj as Record<string, unknown>).numero || ""
                    ),
                  }
                : null,
          };
        }) as AvaliacaoSessao[];
      const found = arr.find((s: any) => s?.leito?.id === int.leitoId);
      if (!found && arr.length) {
        console.debug("[Sessao] Sem correspondência de leito", {
          esperado: int.leitoId,
          recebidos: arr.map((a) => a?.leito?.id),
        });
      }
      if (found) setSessao(found);
      if (found) setStartedSessao(true);
      else if (sessao && sessao.statusSessao === "ATIVA") setSessao(null);
    } catch {
      /* ignore */
    }
  }, [int, sessao]);

  const cancelarSessao = async () => {
    if (!sessao) return;
    try {
      await avaliacoesSessaoApi.liberar(sessao.id);
      setSessao((prev) =>
        prev ? { ...prev, statusSessao: "LIBERADA" } : prev
      );
      toast({ title: "Sessão liberada" });
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message || "Falha ao liberar",
        variant: "destructive",
      });
    }
  };

  // No client-side countdown; rely on backend session.statusSessao

  // Polling periódico de sessões ativas (lista) + manual via pollFlag
  useEffect(() => {
    if (!open || !int) return;
    // enquanto formulário aberto e ainda sem sessão, não pollar
    if (avaliacaoDialogOpen && !sessao) return;
    let cancelled = false;
    const run = async () => {
      await refreshSessaoAtual();
    };
    run();
    const id = setInterval(() => {
      if (!cancelled) run();
    }, SESSION_POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    open,
    int,
    int?.leitoId,
    pollFlag,
    refreshSessaoAtual,
    avaliacaoDialogOpen,
    sessao,
  ]);

  // Ao trocar de internação, limpar sessão
  useEffect(() => {
    if (!open) setSessao(null);
  }, [open, int?.leitoId, int?.unidadeId]);

  // removed countdown formatting helpers

  const sessionStatusVariant = (status: string): any => {
    switch (status) {
      case "ATIVA":
        return "default";
      case "EXPIRADA":
        return "destructive";
      case "LIBERADA":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Se ainda não há contexto de leito, apenas mantém o Dialog para permitir fechamento
  if (!int) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nenhum leito selecionado</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Selecione um leito para visualizar detalhes e realizar avaliação.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={int?.leitoId || "none"}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Detalhes do Leito</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {startedSessao && sessao && sessao.leito && (
            <div
              className={`p-3 border rounded-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm ${
                sessao.statusSessao === "EXPIRADA"
                  ? "border-destructive/60 bg-destructive/10"
                  : sessao.statusSessao === "LIBERADA"
                  ? "border-muted bg-muted/30"
                  : "border-primary/30 bg-muted/40"
              }`}
            >
              <div className="flex-1 space-y-1">
                <div>
                  Sessão SCP <span className="font-semibold">{sessao.scp}</span>{" "}
                  • Status: {sessao.statusSessao}
                </div>
                {sessao.statusSessao === "EXPIRADA" && (
                  <div className="text-xs text-destructive">
                    Sessão expirada – atualize ou inicie outra avaliação.
                  </div>
                )}
              </div>
              <div className="flex gap-2 items-center">
                {sessao.statusSessao === "ATIVA" && (
                  <Button size="sm" variant="outline" onClick={cancelarSessao}>
                    Liberar
                  </Button>
                )}
              </div>
            </div>
          )}
          {/* Informações Gerais */}
          <div className="grid grid-cols-1 gap-4">
            {/* Leito */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <Bed className="h-4 w-4" />
                  <span>Leito</span>
                  {sessao && (
                    <Badge
                      variant={sessionStatusVariant(sessao.statusSessao) as any}
                      className="text-[10px] tracking-wide"
                    >
                      {sessao.statusSessao}
                    </Badge>
                  )}
                  {sessao && (
                    <Badge variant="outline" className="text-[10px]">
                      {sessao.statusSessao}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Número:</span>
                  <p className="text-sm text-muted-foreground">
                    {int?.numero || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Unidade:</span>
                  <p className="text-sm text-muted-foreground">
                    {unidadeNome || "—"}
                  </p>
                </div>
                {/* Data de Entrada removida */}
                <div>
                  <span className="text-sm font-medium">
                    Próxima Avaliação:
                  </span>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    {sessao ? (
                      sessao.statusSessao === "EXPIRADA" ? (
                        <span className="text-xs text-destructive">
                          expirada
                        </span>
                      ) : (
                        <span>Sessão {sessao.statusSessao}</span>
                      )
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </p>
                </div>
                {/* Status removido */}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Ações</h3>
            <div className="flex space-x-2">
              <Button
                onClick={handleNovaAvaliacao}
                disabled={!!sessao && sessao.statusSessao === "ATIVA"}
              >
                <Plus className="h-4 w-4 mr-2" />
                {sessao && sessao.statusSessao === "ATIVA"
                  ? "Sessão Ativa"
                  : "Nova Avaliação"}
              </Button>
              {/* Botão para editar avaliação quando leito está avaliado */}
              {sessao && sessao.statusSessao === "ATIVA" && (
                <Button variant="outline" onClick={handleNovaAvaliacao}>
                  <FileText className="h-4 w-4 mr-2" />
                  Editar Avaliação
                </Button>
              )}
              {/* Botão de Alta removido */}
            </div>
          </div>

          {/* Última Avaliação */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Última Avaliação
            </h4>
            {sessao ? (
              <Card className="border-l-4 border-l-primary/60">
                <CardContent className="py-4 space-y-2 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="font-medium block mb-0.5">
                        Prontuário
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {sessao.prontuario || prontuarioValue || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium block mb-0.5">
                        Pontuação
                      </span>
                      <span className="text-muted-foreground">
                        {sessao.totalPontos !== undefined
                          ? sessao.totalPontos
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium block mb-0.5">
                        Classificação
                      </span>
                      {sessao.classificacao ? (
                        <Badge variant="outline" className="font-medium">
                          {sessao.classificacao}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  {sessao.autor && (
                    <div className="text-xs text-muted-foreground">
                      Registrado por: {sessao.autor.nome}
                      {sessao.autor.cargo ? ` (${sessao.autor.cargo})` : ""}
                    </div>
                  )}
                  {/* Expira em removido: backend trata expiração */}
                </CardContent>
              </Card>
            ) : (
              <div className="text-xs text-muted-foreground border rounded-md p-3">
                Nenhuma avaliação realizada ainda.
              </div>
            )}
          </div>
        </div>

        {/* Sub-modal: Criar Avaliação */}
        <Dialog
          open={avaliacaoDialogOpen}
          onOpenChange={setAvaliacaoDialogOpen}
        >
          <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-xl font-semibold">
                Questionário de Avaliação SCP
              </DialogTitle>

              {/* Campo Prontuário no topo */}
              <div className="bg-muted/30 rounded-lg p-4 mt-4 border border-primary/20">
                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-2 text-sm font-medium text-primary">
                    <FileText className="h-4 w-4" /> Prontuário
                  </Label>
                  <Input
                    value={prontuarioValue}
                    onChange={(e) => setProntuarioValue(e.target.value)}
                    placeholder="Digite o prontuário..."
                    className="max-w-xs"
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-2">
                  <span>
                    Método:{" "}
                    <span className="font-medium">
                      {metodoScp?.title || metodoScp?.key || "—"}
                    </span>
                  </span>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 py-4">
              <div className="text-center text-sm text-muted-foreground mb-6">
                Responda todas as questões para completar a avaliação
              </div>

              {(metodoScp?.questions || []).map((q, index) => (
                <Card key={q.key} className="p-4 border-l-4 border-l-primary">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="shrink-0 mt-1">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <Label className="text-base font-medium leading-relaxed">
                          {q.text}
                        </Label>
                      </div>
                    </div>
                    <div className="ml-10">
                      <Select
                        value={
                          answers[q.key] !== undefined
                            ? String(answers[q.key])
                            : undefined
                        }
                        onValueChange={(v) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.key]: Number(v),
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione uma opção..." />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {q.options.map((opt) => (
                            <SelectItem
                              key={`${q.key}-${opt.label}`}
                              value={String(opt.value)}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{opt.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
                <div className="text-center space-y-2">
                  <div className="text-lg font-semibold">
                    Pontuação Total:{" "}
                    <span className="text-primary">{resultadoTotal}</span>{" "}
                    pontos
                  </div>
                  {metodoScp?.faixas?.length ? (
                    <div className="text-sm">
                      Classificação:{" "}
                      <Badge variant="default" className="ml-1">
                        {calcularClassificacao()}
                      </Badge>
                    </div>
                  ) : null}
                  <div className="text-xs text-muted-foreground">
                    {(metodoScp?.questions || []).length -
                      Object.keys(answers).length >
                      0 && (
                      <span className="text-orange-600">
                        {(metodoScp?.questions || []).length -
                          Object.keys(answers).length}{" "}
                        questão(ões) pendente(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setAvaliacaoDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={salvarAvaliacao}
                  disabled={
                    salvando ||
                    !metodoScp ||
                    Object.keys(answers).length <
                      (metodoScp?.questions || []).length
                  }
                  className="min-w-[140px]"
                >
                  {salvando ? "Salvando..." : "Finalizar Avaliação"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
