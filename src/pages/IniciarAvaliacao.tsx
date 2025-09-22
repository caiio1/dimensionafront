/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  avaliacoesSessaoApi,
  leitosApi,
  unidadesApi,
  hospitaisApi,
  metodosScpApi,
} from "@/lib/api";
import { normalizeList, unwrapData } from "@/lib/apiUtils";
import {
  User,
  Bed,
  FileText,
  ArrowLeft,
  CheckCircle,
  LogOut,
} from "lucide-react";
import { DimensionaLogo } from "@/components/DimensionaLogo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Leito {
  id: string;
  numero: string;
  unidadeId: string;
}

interface Unidade {
  id: string;
  nome: string;
  hospitalId?: string;
  hospital?: { id?: string; nome?: string };
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

interface MetodoScpModel {
  id: string;
  key: string;
  title: string;
  description?: string;
  questions: MetodoScpQuestion[];
  faixas?: { min: number; max: number; classe: string }[];
}

interface Hospital {
  id: string;
  nome: string;
  scpMetodoId: string;
  scpMetodo: { id: string };
}

export default function IniciarAvaliacao() {
  const { unidadeId, leitoId } = useParams<{
    unidadeId: string;
    leitoId: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const [leito, setLeito] = useState<Leito | null>(null);
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [metodoScp, setMetodoScp] = useState<MetodoScpModel | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [prontuarioValue, setProntuarioValue] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [existingSessao, setExistingSessao] = useState<any | null>(null);

  // Remove prefixo de pontos (ex: "04 PONTOS - ") para não induzir o avaliador
  const formatOptionLabel = (label: string): string => {
    if (!label) return label;
    return label.replace(/^\s*\d+\s*PONTOS?\s*-\s*/i, "").trim();
  };

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

  useEffect(() => {
    const carregarDados = async () => {
      if (!unidadeId || !leitoId) {
        toast({
          title: "Erro",
          description: "Parâmetros inválidos",
          variant: "destructive",
        });
        navigate(-1);
        return;
      }

      try {
        setLoading(true);

        // Carregar unidade
        const unidadeResp = await unidadesApi.obter(unidadeId);
        const unidadeData =
          (unidadeResp as { data?: Unidade })?.data || (unidadeResp as Unidade);
        setUnidade(unidadeData);

        // Carregar leitos da unidade e encontrar o leito específico
        const leitosResp = await leitosApi.listar(unidadeId);
        const leitosData = Array.isArray(leitosResp)
          ? (leitosResp as Leito[])
          : (leitosResp as { data?: Leito[] })?.data || [];

        const leitoEncontrado = leitosData.find((l: Leito) => l.id === leitoId);
        if (!leitoEncontrado) {
          throw new Error("Leito não encontrado");
        }
        setLeito(leitoEncontrado);

        // Carregar método SCP: prefer unidade.scpMetodo/scpMetodoId, fallback para hospital
        if (
          (unidadeData as any).scpMetodo &&
          (unidadeData as any).scpMetodo.id
        ) {
          const scpResp = await metodosScpApi.obter(
            (unidadeData as any).scpMetodo.id
          );
          const scp =
            unwrapData<MetodoScpModel>(scpResp) || (scpResp as MetodoScpModel);
          setMetodoScp(scp);
        } else if ((unidadeData as any).scpMetodoId) {
          const scpResp = await metodosScpApi.obter(
            (unidadeData as any).scpMetodoId
          );
          const scp =
            unwrapData<MetodoScpModel>(scpResp) || (scpResp as MetodoScpModel);
          setMetodoScp(scp);
        } else {
          // fallback to hospital-level method
          const hospitalId = unidadeData.hospital?.id;
          if (!hospitalId) {
            throw new Error("Hospital não encontrado");
          }

          const hospitalResp = await hospitaisApi.obter(hospitalId);
          const hospital =
            unwrapData<Hospital>(hospitalResp) || (hospitalResp as Hospital);

          if (!hospital) {
            throw new Error("Hospital não encontrado");
          }

          if (hospital.scpMetodo && hospital.scpMetodo.id) {
            const scpResp = await metodosScpApi.obter(hospital.scpMetodo.id);
            const scp =
              unwrapData<MetodoScpModel>(scpResp) ||
              (scpResp as MetodoScpModel);
            setMetodoScp(scp);
          } else if ((hospital as any).scpMetodoId) {
            const scpResp = await metodosScpApi.obter(
              (hospital as any).scpMetodoId
            );
            const scp =
              unwrapData<MetodoScpModel>(scpResp) ||
              (scpResp as MetodoScpModel);
            setMetodoScp(scp);
          } else {
            throw new Error(
              "Método SCP não configurado para este hospital/unidade"
            );
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados da avaliação",
          variant: "destructive",
        });
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [unidadeId, leitoId, navigate, toast]);

  const salvarAvaliacao = async () => {
    if (!leito || !metodoScp || !unidadeId) return;

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

      // Check active sessions to warn about overwriting an existing session for the same leito today
      try {
        const sessResp = await avaliacoesSessaoApi.listarAtivas(unidadeId);
        const sessoesAtivas = normalizeList<Record<string, unknown>>(sessResp);
        const existing = sessoesAtivas.find(
          (s) =>
            ((s as Record<string, any>).leitoId as string) === leito.id ||
            (((s as Record<string, any>).leito as Record<string, unknown>)
              ?.id as string) === leito.id
        );

        if (existing) {
          // remember existing session so we can call update instead of create
          setExistingSessao(existing as any);
          // open styled confirmation dialog instead of window.confirm
          setShowOverwriteConfirm(true);
          setSalvando(false);
          return;
        }
      } catch (checkErr) {
        // se falhar na checagem, prosseguir e deixar backend decidir
        console.warn("Falha ao checar sessões ativas:", checkErr);
      }

      await doCreateAvaliacao();
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

  // actual creation logic extracted so we can call it from the dialog confirm
  const doCreateAvaliacao = async () => {
    if (!leito || !metodoScp || !unidadeId) return;
    await avaliacoesSessaoApi.criar({
      leitoId: leito.id,
      unidadeId: unidadeId,
      scp: metodoScp.key,
      itens: answers,
      colaboradorId: user?.tipo === "COLAB" ? user.id : undefined,
      prontuario: prontuarioValue?.trim() || undefined,
    });
    toast({
      title: "Sucesso",
      description: "Avaliação registrada com sucesso",
    });

    // Voltar para a página da unidade
    navigate(`/minha-unidade/${unidadeId}`);
  };

  const confirmarSobrescrita = async () => {
    setShowOverwriteConfirm(false);
    try {
      setSalvando(true);
      await doAtualizarAvaliacao();
    } catch (e) {
      toast({
        title: "Erro",
        description: (e as Error)?.message || "Falha ao atualizar avaliação",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  const doAtualizarAvaliacao = async () => {
    if (!existingSessao || !(existingSessao as any).id) return;
    if (!leito || !metodoScp || !unidadeId) return;

    await avaliacoesSessaoApi.atualizar((existingSessao as any).id, {
      itens: answers,
      scp: metodoScp.key,
      colaboradorId: user?.tipo === "COLAB" ? user.id : undefined,
      prontuario: prontuarioValue?.trim() || undefined,
    });
    // clear remembered session
    setExistingSessao(null);
    toast({
      title: "Sucesso",
      description: "Avaliação atualizada com sucesso",
    });

    // Voltar para a página da unidade
    navigate(`/minha-unidade/${unidadeId}`);
  };

  const handleVoltar = () => {
    navigate(`/minha-unidade/${unidadeId}`);
  };

  if (!user || user.tipo !== "COLAB") {
    return (
      <div className="flex h-screen items-center justify-center">
        Acesso restrito.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header profissional com logo integrada */}
        <header className="sticky top-0 z-40 bg-primary text-white shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Logo e botão voltar */}
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoltar}
                className="text-white hover:bg-white/20 px-3 py-2 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <DimensionaLogo size="xxs" variant="white" />
              <span className="text-lg font-semibold text-white">
                hospital1
              </span>
            </div>

            {/* Título centralizado */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-xl font-bold">Iniciar Avaliação</h1>
            </div>

            {/* Menu do usuário */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-semibold tracking-wide bg-white/20 px-3 py-1 rounded-lg backdrop-blur">
                {user.nome?.split(" ")[0] || user.nome}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-1" /> Sair
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 flex items-center justify-center">
          <div>Carregando...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header profissional com logo integrada */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo e botão voltar */}
          <div className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVoltar}
              className="text-white hover:bg-white/20 px-3 py-2 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <DimensionaLogo size="xxs" variant="white" />
            <span className="text-lg font-semibold text-white">hospital1</span>
          </div>

          {/* Título centralizado */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-xl font-bold">Iniciar Avaliação</h1>
          </div>

          {/* Menu do usuário */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold tracking-wide bg-white/20 px-3 py-1 rounded-lg backdrop-blur">
              {user.nome?.split(" ")[0] || user.nome}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Iniciar Avaliação SCP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="font-medium">Leito:</Label>
                <p className="text-muted-foreground">
                  <Bed className="h-4 w-4 inline mr-1" />
                  {leito?.numero || "—"}
                </p>
              </div>
              <div>
                <Label className="font-medium">Unidade:</Label>
                <p className="text-muted-foreground">{unidade?.nome || "—"}</p>
              </div>
              <div>
                <Label className="font-medium">Método:</Label>
                <p className="text-muted-foreground">
                  {metodoScp?.title || metodoScp?.key || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Formulário de Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-4 border border-primary/20 max-w-lg">
              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-2 text-sm font-medium text-primary">
                  <FileText className="h-4 w-4" /> Prontuário *
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
                      <Badge variant="outline" className="shrink-0 mt-1">
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
                                <span>{formatOptionLabel(opt.label)}</span>
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

            {/* Resumo da avaliação */}
            <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
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

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleVoltar}
                className="w-full sm:w-auto"
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
                className="min-w-[140px] w-full sm:w-auto"
              >
                {salvando ? "Salvando..." : "Finalizar Avaliação"}
              </Button>
            </div>
            {/* Styled overwrite confirmation dialog */}
            <Dialog
              open={showOverwriteConfirm}
              onOpenChange={setShowOverwriteConfirm}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Já existe uma avaliação</DialogTitle>
                  <DialogDescription>
                    Já existe uma sessão ativa para este leito hoje — ao
                    confirmar você sobrescreverá a avaliação existente. Deseja
                    continuar?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowOverwriteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={confirmarSobrescrita}
                    >
                      Confirmar e Sobrescrever
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
