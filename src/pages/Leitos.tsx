/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bed,
  Search,
  Building,
  User,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button"; // ainda usado no modal de edição
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast, useToast } from "@/hooks/use-toast";
import { leitosApi, unidadesApi, avaliacoesSessaoApi } from "@/lib/api";
import getLeitoBadge from "@/lib/leitoBadge";
import { normalizeList, unwrapData } from "@/lib/apiUtils";
import { DashboardLayout } from "@/components/DashboardLayout";

export interface Leito {
  id: string;
  numero: string;
  unidadeId: string;
  unidade?: { nome: string };
  ocupado?: boolean;
  created_at: string;
  status: string;
}

interface Unidade {
  id: string;
  nome: string;
  hospital?: { id?: string; nome?: string };
  hospitalId?: string;
}

export default function Leitos() {
  const [leitos, setLeitos] = useState<Leito[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeito, setEditingLeito] = useState<Leito | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState("todas");
  const [formData, setFormData] = useState({
    numero: "",
    unidadeId: "",
  });
  const { toast } = useToast();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  // Sessões ativas (avaliacoes em andamento) agregadas por unidade
  const [sessoesAtivas, setSessoesAtivas] = useState<any[]>([]);

  const carregarTodasSessoes = useCallback(async () => {
    try {
      const response = await avaliacoesSessaoApi.listarAtivas();
      setSessoesAtivas(normalizeList(response));
    } catch (e) {
      console.error("Erro ao carregar sessões ativas", e);
    }
  }, []);

  const carregarLeitos = useCallback(async () => {
    try {
      const response = await leitosApi.listar(
        filtroUnidade && filtroUnidade !== "todas" ? filtroUnidade : undefined
      );
      const raw = normalizeList(response);
      setLeitos(
        raw.map((l: any) => ({
          ...l,
          ocupado: ["ATIVO", "PENDENTE"].includes(
            ((l.status || "") as string).toUpperCase()
          ),
        }))
      );
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar leitos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filtroUnidade, toast]);

  const carregarUnidades = useCallback(async () => {
    try {
      const response = await unidadesApi.listar();
      setUnidades(normalizeList(response));
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
    }
  }, []);

  useEffect(() => {
    // Garante carregar unidades primeiro para mapear nomes antes de agrupar
    (async () => {
      await carregarUnidades();
      await carregarLeitos();
      await carregarTodasSessoes();
    })();
  }, [carregarLeitos, carregarUnidades, carregarTodasSessoes]);

  useEffect(() => {
    if (!loading) carregarLeitos();
  }, [carregarLeitos, loading]);

  // Backend will handle expiry; no client-side countdowns needed

  // (definida acima)

  // Polling leve a cada 30s
  useEffect(() => {
    const interval = setInterval(() => carregarTodasSessoes(), 30000);
    return () => clearInterval(interval);
  }, [carregarTodasSessoes]);

  // No client-side countdown formatter

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Garantir que, ao atualizar, a unidade não seja perdida:
      // usa valor do form se presente, caso contrário usa o editingLeito.unidadeId
      const unidadeIdToSend =
        formData.unidadeId || editingLeito?.unidadeId || "";

      // Payload compatível com diferentes convenções (camelCase e snake_case)
      const payload: any = {
        numero: formData.numero,
        unidadeId: unidadeIdToSend,
        unidade_id: unidadeIdToSend,
      };

      if (editingLeito) {
        await leitosApi.atualizar(editingLeito.id, payload);
        toast({
          title: "Sucesso",
          description: "Leito atualizado com sucesso",
        });
      } else {
        // Criar usa valores diretamente do form (exige que o usuário escolha unidade)
        await leitosApi.criar({
          numero: formData.numero,
          unidadeId: formData.unidadeId,
        });
        toast({
          title: "Sucesso",
          description: "Leito criado com sucesso",
        });
      }

      setDialogOpen(false);
      setEditingLeito(null);
      setFormData({ numero: "", unidadeId: "" });
      carregarLeitos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar leito",
        variant: "destructive",
      });
    }
  };

  // Nova implementação: garante que 'unidades' esteja carregado e contenha a unidade do leito
  const handleEdit = async (leito: Leito) => {
    setEditingLeito(leito);

    // Se não houver unidades carregadas ou a unidade do leito não estiver na lista, carregue
    if (
      unidades.length === 0 ||
      !unidades.find((u) => u.id === leito.unidadeId)
    ) {
      await carregarUnidades();
    }

    // Agora preenche o formulário e abre o modal (Select terá o item correspondente)
    setFormData({
      numero: leito.numero,
      unidadeId: leito.unidadeId || "",
    });

    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este leito?")) return;

    try {
      await leitosApi.excluir(id);
      toast({
        title: "Sucesso",
        description: "Leito excluído com sucesso",
      });
      carregarLeitos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir leito",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    // currentStatus was a boolean flag in older code.
    // Now we accept explicit backend enum values. We'll map the boolean intent
    // to a desired status (toggle between VAGO and PENDENTE) and update from API.
    const desiredStatus = currentStatus ? "VAGO" : "PENDENTE"; // if was occupied -> set VAGO, else mark PENDENTE
    try {
      const resp = await leitosApi.alterarStatus(id, desiredStatus);
      // try to extract updated entity
      const updated =
        unwrapData<Record<string, any>>(resp) || (resp as Record<string, any>);
      if (updated && updated.id) {
        setLeitos((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...updated } : l))
        );
      } else {
        // fallback: reload list
        await carregarLeitos();
      }
      toast({ title: "Sucesso", description: "Status do leito atualizado" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status do leito",
        variant: "destructive",
      });
      // reload to restore truth
      await carregarLeitos();
    }
  };

  const filteredLeitos = leitos.filter((leito) =>
    leito.numero.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Agrupamento memoizado por unidade (antes de qualquer return condicional para não quebrar ordem de hooks)
  const grupos = useMemo(() => {
    const unidadeMap = new Map<string, Unidade>();
    for (const u of unidades) {
      if (u && u.id) unidadeMap.set(String(u.id), u);
    }
    return leitos.reduce<
      Record<string, { unidade?: Unidade; leitos: Leito[] }>
    >((acc, l) => {
      const unidade =
        unidadeMap.get(String(l.unidadeId)) || l.unidade
          ? ({
              id: l.unidadeId,
              nome: l.unidade?.nome || `Unidade ${l.unidadeId}`,
            } as Unidade)
          : undefined;
      const chave = unidade?.nome || "Sem Unidade";
      if (!acc[chave]) acc[chave] = { unidade, leitos: [] };
      acc[chave].leitos.push(l);
      return acc;
    }, {});
  }, [leitos, unidades]);

  const groupKeys = useMemo(() => Object.keys(grupos), [grupos]);

  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const updated: Record<string, boolean> = { ...prev };
      for (const k of groupKeys) {
        if (updated[k] === undefined) {
          updated[k] = true;
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [groupKeys]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Abrir modal de criação: reseta estado de edição e formulário
  const handleOpenCreateModal = () => {
    setEditingLeito(null);
    setFormData({ numero: "", unidadeId: "" });
    setDialogOpen(true);
  };

  // Garantir reset quando o modal for fechado por qualquer ação
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingLeito(null);
      setFormData({ numero: "", unidadeId: "" });
    }
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Leitos</h1>
            <p className="text-muted-foreground">
              Visualização geral dos leitos por hospital
            </p>
          </div>
          {/* Botão de criação removido conforme solicitação */}
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            {/* Modal permanece apenas para edição quando acionado por lógica futura */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Leito</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="numero">Código do Leito *</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) =>
                      setFormData({ ...formData, numero: e.target.value })
                    }
                    placeholder="Ex: 101, 102A, UTI-01"
                    required
                  />
                </div>
                <div>
                  <Label>Unidade *</Label>
                  <Select
                    value={formData.unidadeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unidadeId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as unidades</SelectItem>
              {unidades.map((unidade) => (
                <SelectItem key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botões de expandir/colapsar removidos conforme solicitação */}

        <div className="space-y-6">
          {Object.entries(grupos).map(([unidadeNome, grupo]) => {
            const visiveis = grupo.leitos
              .filter((l) =>
                l.numero.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .slice()
              .sort((a, b) =>
                a.numero.localeCompare(b.numero, undefined, {
                  numeric: true,
                  sensitivity: "base",
                })
              );
            if (!visiveis.length) return null;
            return (
              <div
                key={unidadeNome}
                className="space-y-2 border rounded-md p-3 bg-background/50"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(unidadeNome)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {openGroups[unidadeNome] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="text-lg font-semibold flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />{" "}
                      {unidadeNome}
                    </span>
                    {grupo.unidade?.hospital?.nome && (
                      <Badge variant="secondary" className="text-xs">
                        {grupo.unidade.hospital.nome}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">
                    {visiveis.length} leito(s)
                  </span>
                </button>
                {openGroups[unidadeNome] && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-2">
                    {visiveis.map((leito) => {
                      const sessaoAtiva = sessoesAtivas.find(
                        (s: any) => (s?.leito?.id || s?.leitoId) === leito.id
                      );

                      const {
                        badgeVariant,
                        badgeLabel,
                        badgeIcon,
                        badgeClassName,
                      } = getLeitoBadge(leito, sessaoAtiva);

                      const expired = !!(
                        sessaoAtiva && sessaoAtiva.statusSessao === "EXPIRADA"
                      );
                      const borderColorClass = expired
                        ? "border-l-destructive"
                        : "border-l-primary";
                      const classificacao =
                        sessaoAtiva?.classificacao ||
                        sessaoAtiva?.classe ||
                        sessaoAtiva?.classePaciente;
                      const colaboradorNome =
                        sessaoAtiva?.colaborador?.nome ||
                        sessaoAtiva?.colaboradorNome;

                      return (
                        <Card
                          key={leito.id}
                          className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${borderColorClass}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                Leito {leito.numero}
                              </CardTitle>
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant={badgeVariant as any}
                                  className={`flex items-center space-x-1 text-xs ${
                                    (badgeClassName as string) || ""
                                  }`}
                                >
                                  {badgeIcon}
                                  <span>{badgeLabel}</span>
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="text-xs space-y-1">
                            {sessaoAtiva && !expired ? (
                              <div className="flex flex-col gap-1">
                                {classificacao && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                      Classificação
                                    </span>
                                    <span className="font-medium">
                                      {String(classificacao).replace(/_/g, " ")}
                                    </span>
                                  </div>
                                )}
                                {colaboradorNome && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                      Avaliador
                                    </span>
                                    <span className="font-medium text-primary">
                                      {colaboradorNome}
                                    </span>
                                  </div>
                                )}
                                {sessaoAtiva.prontuario && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                      Prontuário
                                    </span>
                                    <span className="font-medium">
                                      {sessaoAtiva.prontuario}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-muted-foreground">
                                {sessaoAtiva
                                  ? "Sessão expirada"
                                  : "Clique para ver detalhes"}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredLeitos.length === 0 && searchTerm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum leito encontrado
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Tente buscar com outros termos
              </p>
            </CardContent>
          </Card>
        )}

        {leitos.length === 0 && !searchTerm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bed className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum leito cadastrado
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece criando o primeiro leito
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
