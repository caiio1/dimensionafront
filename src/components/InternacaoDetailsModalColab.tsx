import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { avaliacoesSessaoApi } from "@/lib/api";
import { normalizeList } from "@/lib/apiUtils";
import { User, Bed, FileText, Plus } from "lucide-react";

// Tipos reutilizados (subset)
export interface LeitoContextColab {
  leitoId: string;
  numero: string;
  unidadeId: string;
  unidadeNome?: string;
  prontuario?: string;
}

interface MetodoScpQuestionOption {
  label: string;
  value: number;
}
interface MetodoScpQuestion {
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

export interface SessaoScpBasica {
  id: string;
  scp: string;
  statusSessao: "ATIVA" | "EXPIRADA" | "LIBERADA";
  expiresAt?: string;
  totalPontos?: number;
  classificacao?: string;
  prontuario?: string | null;
}

interface InternacaoDetailsModalColabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leito: LeitoContextColab | null;
  metodoScp: MetodoScpModel | null; // já pré-carregado pela página
  sessaoAtiva?: SessaoScpBasica | null; // sessão ativa (se já conhecida fora)
  onSessaoCriada?: (sessao: SessaoScpBasica) => void; // callback pós criação
}

type RawSessao = { leito?: { id?: string }; leitoId?: string } & Record<
  string,
  unknown
>;

export function InternacaoDetailsModalColab({
  open,
  onOpenChange,
  leito,
  metodoScp,
  sessaoAtiva,
  onSessaoCriada,
}: InternacaoDetailsModalColabProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Remove prefixo de pontos (ex: "04 PONTOS - ") para não induzir o avaliador
  const formatOptionLabel = (label: string): string => {
    if (!label) return label;
    return label.replace(/^\s*\d+\s*PONTOS?\s*-\s*/i, "").trim();
  };

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [avaliacaoAberta, setAvaliacaoAberta] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [prontuarioValue, setProntuarioValue] = useState("");
  const [sessaoLocal, setSessaoLocal] = useState<SessaoScpBasica | null>(null);

  // Sessão efetiva (preferir recém-criada local > prop externa)
  const sessao = sessaoLocal || sessaoAtiva || null;

  // Atualiza prontuário ao abrir/trocar leito
  useMemo(() => {
    if (open && leito?.prontuario) setProntuarioValue(leito.prontuario);
  }, [open, leito?.prontuario]);

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

  const handleAbrirAvaliacao = () => {
    if (!metodoScp) {
      toast({
        title: "Método SCP não definido",
        description: "Configure o método antes de avaliar.",
        variant: "destructive",
      });
      return;
    }
    if (!leito) return;
    setAnswers({});
    setAvaliacaoAberta(true);
  };

  const salvarAvaliacao = async () => {
    if (!leito || !metodoScp) return;

    // Validação do prontuário (mínimo 3 dígitos)
    if (!prontuarioValue?.trim() || prontuarioValue.trim().length < 3) {
      toast({
        title: "Prontuário obrigatório",
        description: "O prontuário deve ter no mínimo 3 caracteres.",
        variant: "destructive",
      });
      return;
    }

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
      // check active sessions to warn about overwrite
      try {
        const sessoesAtivas = await avaliacoesSessaoApi.listarAtivas(
          leito.unidadeId
        );
        const sessoesArr = normalizeList<RawSessao>(sessoesAtivas);
        const existing = sessoesArr.find(
          (s) => s?.leito?.id === leito.leitoId || s?.leitoId === leito.leitoId
        );
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

      interface CriarSessaoResp {
        id: string;
        scp: string;
        statusSessao?: "ATIVA" | "EXPIRADA" | "LIBERADA";
        expiresAt?: string;
        totalPontos?: number;
        classificacao?: string;
        prontuario?: string | null;
      }
      const resp = (await avaliacoesSessaoApi.criar({
        leitoId: leito.leitoId,
        unidadeId: leito.unidadeId,
        scp: metodoScp.key,
        itens: answers,
        colaboradorId: user?.tipo === "COLAB" ? user.id : undefined,
        prontuario: prontuarioValue?.trim() || undefined,
      })) as unknown as { data?: CriarSessaoResp } | CriarSessaoResp;
      const rUnknown: unknown = resp;
      let av: CriarSessaoResp;
      if (
        typeof rUnknown === "object" &&
        rUnknown !== null &&
        "data" in rUnknown &&
        typeof (rUnknown as { data?: unknown }).data === "object" &&
        (rUnknown as { data?: unknown }).data !== null
      ) {
        av = (rUnknown as { data: CriarSessaoResp }).data;
      } else {
        av = rUnknown as CriarSessaoResp;
      }
      const sessaoNormalizada: SessaoScpBasica = {
        id: av.id,
        scp: av.scp,
        statusSessao: av.statusSessao || "ATIVA",
        expiresAt: av.expiresAt,
        totalPontos: av.totalPontos,
        classificacao: av.classificacao,
        prontuario: av.prontuario ?? leito.prontuario,
      };
      setSessaoLocal(sessaoNormalizada);
      if (sessaoNormalizada.prontuario) {
        setProntuarioValue(sessaoNormalizada.prontuario);
      }
      onSessaoCriada?.(sessaoNormalizada);
      toast({ title: "Sucesso", description: "Avaliação registrada" });
      setAvaliacaoAberta(false);
    } catch (e) {
      toast({
        title: "Erro",
        description: (e as Error)?.message || "Falha ao salvar avaliação",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  if (!leito) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nenhum leito selecionado</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Selecione um leito para avaliar.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Detalhes do Leito
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  <Bed className="h-4 w-4" /> <span>Leito</span>
                  {sessao && (
                    <Badge
                      variant={
                        sessao.statusSessao === "ATIVA"
                          ? "default"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {sessao.statusSessao}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium">Número:</span>{" "}
                  <span className="text-muted-foreground">
                    {leito.numero || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Unidade:</span>{" "}
                  <span className="text-muted-foreground">
                    {leito.unidadeNome || "—"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Prontuário:</span>{" "}
                  <span className="text-muted-foreground">
                    {sessao?.prontuario || prontuarioValue || "—"}
                  </span>
                </div>
                {sessao && (
                  <div className="flex gap-6 flex-wrap pt-2">
                    <div>
                      <span className="font-medium">Classificação:</span>{" "}
                      {sessao.classificacao ? (
                        <Badge variant="outline" className="ml-1">
                          {sessao.classificacao}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />
          {(() => {
            const isSessaoAtiva = !!sessao && sessao.statusSessao === "ATIVA";
            const statusLabel = isSessaoAtiva ? "Ocupado" : "Livre";
            const statusClasses = isSessaoAtiva
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
            return (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div
                    className={`h-9 inline-flex items-center rounded-md border px-4 text-sm font-medium tracking-wide ${statusClasses}`}
                  >
                    {statusLabel}
                  </div>
                  <Button
                    onClick={handleAbrirAvaliacao}
                    disabled={isSessaoAtiva}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Iniciar Avaliação
                  </Button>
                </div>
                {avaliacaoAberta && !isSessaoAtiva && (
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">
                        Avaliação SCP (
                        {metodoScp?.title || metodoScp?.key || "—"})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="bg-muted/30 rounded-lg p-4 border border-primary/20 max-w-lg">
                        <div className="flex flex-col gap-2">
                          <Label className="flex items-center gap-2 text-sm font-medium text-primary">
                            <FileText className="h-4 w-4" /> Prontuário
                          </Label>
                          <Input
                            value={prontuarioValue}
                            onChange={(e) => setProntuarioValue(e.target.value)}
                            placeholder="Digite o prontuário (mín. 3 caracteres)..."
                            className="max-w-xs"
                            required
                            minLength={3}
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        {(metodoScp?.questions || []).map((q, index) => (
                          <Card key={q.key} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <Badge
                                  variant="outline"
                                  className="shrink-0 mt-1"
                                >
                                  {index + 1}
                                </Badge>
                                <div className="flex-1">
                                  <Label className="text-sm font-medium leading-relaxed">
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
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent className="z-50 bg-background">
                                    {q.options.map((opt) => (
                                      <SelectItem
                                        key={`${q.key}-${opt.label}`}
                                        value={String(opt.value)}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <span>
                                            {formatOptionLabel(opt.label)}
                                          </span>
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
                      <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
                        {metodoScp?.faixas?.length &&
                        Object.keys(answers).length ===
                          (metodoScp?.questions || []).length ? (
                          <div className="text-xs">
                            Classificação:{" "}
                            <Badge variant="default" className="ml-1">
                              {calcularClassificacao()}
                            </Badge>
                          </div>
                        ) : null}
                        <div className="text-[11px] text-muted-foreground">
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
                      <div className="flex justify-between items-center pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setAvaliacaoAberta(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={salvarAvaliacao}
                          disabled={
                            salvando ||
                            !metodoScp ||
                            !prontuarioValue?.trim() ||
                            prontuarioValue.trim().length < 3 ||
                            Object.keys(answers).length <
                              (metodoScp?.questions || []).length
                          }
                          className="min-w-[140px]"
                        >
                          {salvando ? "Salvando..." : "Finalizar"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
