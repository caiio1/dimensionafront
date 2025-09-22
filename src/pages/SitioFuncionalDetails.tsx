/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Plus, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { unidadesNaoInternacao } from "@/lib/api";
import {
  SitioFuncionalResponse,
  StatusSitioFuncional,
  PosicaoResponse,
} from "@/types/unidadeNaoInternacao";

export default function SitioFuncionalDetails() {
  const navigate = useNavigate();
  const { hospitalId, unidadeId, sitioId } = useParams();
  const { toast } = useToast();

  const [sitio, setSitio] = useState<SitioFuncionalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [atualizandoStatus, setAtualizandoStatus] = useState<string | null>(
    null
  );

  // Estados para modais
  const [posicaoModalOpen, setPosicaoModalOpen] = useState(false);
  const [justificativaModalOpen, setJustificativaModalOpen] = useState(false);
  const [posicaoSelecionadaParaStatus, setPosicaoSelecionadaParaStatus] =
    useState<{ posicaoId: string; novoStatus: StatusSitioFuncional } | null>(
      null
    );
  // Modal de detalhes da posição (quando clicar na posição)
  const [detalhesPosicaoOpen, setDetalhesPosicaoOpen] = useState(false);
  const [posicaoAtiva, setPosicaoAtiva] = useState<PosicaoResponse | null>(
    null
  );

  // Estados para formulários
  const [posicaoFormData, setPosicaoFormData] = useState({
    numero: "",
    descricao: "",
  });

  const [justificativaFormData, setJustificativaFormData] = useState({
    justificativa: "",
  });

  const carregarSitio = useCallback(async () => {
    if (!sitioId || !unidadeId) return;

    setLoading(true);
    try {
      // Buscar dados básicos do sítio
      const sitioResponse = await unidadesNaoInternacao.obterSitio(
        unidadeId,
        sitioId
      );

      // Buscar cargos atribuídos ao sítio (nova modelagem)
      const rawCargosResponse = await unidadesNaoInternacao.obterCargosSitio(
        sitioId
      );

      const cargos = Array.isArray((rawCargosResponse as any).data)
        ? (rawCargosResponse as any).data
        : Array.isArray(rawCargosResponse)
        ? rawCargosResponse
        : (rawCargosResponse as any).data || [];

      // Combinar os dados
      const sitioCompleto = {
        ...(sitioResponse as object),
        cargos,
      };

      setSitio(sitioCompleto as SitioFuncionalResponse);
    } catch (error) {
      console.error("Erro ao carregar sítio:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do sítio funcional",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sitioId, unidadeId, toast]);

  // Função otimizada para recarregar apenas as posições
  const recarregarCargos = useCallback(async () => {
    if (!sitioId || !sitio) return;

    try {
      const rawCargosResponse = await unidadesNaoInternacao.obterCargosSitio(
        sitioId
      );

      const cargos = Array.isArray((rawCargosResponse as any).data)
        ? (rawCargosResponse as any).data
        : Array.isArray(rawCargosResponse)
        ? rawCargosResponse
        : (rawCargosResponse as any).data || [];

      // Atualizar apenas os cargos no estado atual
      setSitio((prevSitio) => ({
        ...prevSitio!,
        cargos,
      }));
    } catch (error) {
      console.error("Erro ao recarregar cargos:", error);
      // Em caso de erro, fazer recarga completa
      await carregarSitio();
    }
  }, [sitioId, sitio, carregarSitio]);

  useEffect(() => {
    if (sitioId) {
      carregarSitio();
    }
  }, [sitioId, carregarSitio]);

  // Função para atualizar status de posição
  const atualizarStatusPosicao = async (
    posicaoId: string,
    novoStatus: StatusSitioFuncional,
    justificativa?: string
  ) => {
    // Deprecated: posições foram substituídas por cargos/funcionários.
    toast({
      title: "Ação não disponível",
      description:
        "As posições foram removidas. Use os endpoints de cargos por sítio para gerenciar alocações de funcionários.",
      variant: "destructive",
    });
  };

  // Função para ativar posição (usando a nova rota)
  const ativarPosicao = async (posicaoId: string) => {
    toast({
      title: "Ação não disponível",
      description:
        "Ativar/Inativar posições não é suportado — agora gerenciamos cargos no sítio.",
      variant: "destructive",
    });
  };

  // Função para inativar posição (usando a nova rota)
  const inativarPosicao = async (posicaoId: string, justificativa: string) => {
    toast({
      title: "Ação não disponível",
      description:
        "Ativar/Inativar posições não é suportado — agora gerenciamos cargos no sítio.",
      variant: "destructive",
    });
  };

  // Função para lidar com mudança de status de posição
  const handleStatusPosicaoChange = (
    posicaoId: string,
    novoStatus: StatusSitioFuncional
  ) => {
    if (novoStatus === "INATIVO") {
      // Abrir modal para justificativa
      setPosicaoSelecionadaParaStatus({ posicaoId, novoStatus });
      setJustificativaFormData({ justificativa: "" });
      setJustificativaModalOpen(true);
    } else {
      // Atualizar diretamente
      atualizarStatusPosicao(posicaoId, novoStatus);
    }
  };

  // Função para confirmar status inativo com justificativa
  const confirmarStatusInativo = async () => {
    if (!posicaoSelecionadaParaStatus) return;

    if (!justificativaFormData.justificativa.trim()) {
      toast({
        title: "Erro",
        description: "Justificativa é obrigatória para status Inativo",
        variant: "destructive",
      });
      return;
    }

    await inativarPosicao(
      posicaoSelecionadaParaStatus.posicaoId,
      justificativaFormData.justificativa
    );

    setJustificativaModalOpen(false);
    setPosicaoSelecionadaParaStatus(null);
    setJustificativaFormData({ justificativa: "" });
  };

  // Funções para gerenciar modal de posição
  const abrirModalPosicao = () => {
    setPosicaoFormData({ numero: "", descricao: "" });
    setPosicaoModalOpen(true);
  };

  const fecharModalPosicao = () => {
    setPosicaoModalOpen(false);
    setPosicaoFormData({ numero: "", descricao: "" });
  };

  // Função para criar posição
  const criarPosicao = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!posicaoFormData.numero.trim()) {
      toast({
        title: "Erro",
        description: "Número da posição é obrigatório",
        variant: "destructive",
      });
      return;
    }

    // Deprecated: criar posições não é mais suportado — a modelagem mudou para alocação de funcionários (cargos)
    toast({
      title: "Ação não disponível",
      description:
        "Criar posições foi removido. Use a atribuição de cargos ao sítio para alocar funcionários.",
      variant: "destructive",
    });
    fecharModalPosicao();
  };

  const fecharDetalhesPosicao = () => {
    setDetalhesPosicaoOpen(false);
    setPosicaoAtiva(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Carregando detalhes...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!sitio) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Sítio funcional não encontrado
          </h2>
          <p className="text-gray-600 mb-4">
            O sítio funcional solicitado não foi encontrado
          </p>
          <Button
            onClick={() =>
              navigate(
                `/hospitais/${hospitalId}/unidades-nao-internacao/${unidadeId}`
              )
            }
          >
            Voltar para Unidade
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Contadores baseados em cargos atribuídos (quantidade de funcionários alocados)
  const totalCargos = sitio.cargos?.length || 0;
  const totalFuncionariosAlocados = (sitio.cargos || []).reduce(
    (acc, c) => acc + (c.quantidade_funcionarios || 0),
    0
  );

  // Quantos cargos estão com funcionários alocados vs vazios
  const cargosDisponiveisCount = (sitio.cargos || []).filter(
    (c) => !c.quantidade_funcionarios || c.quantidade_funcionarios === 0
  ).length;
  const cargosEmUsoCount = totalCargos - cargosDisponiveisCount;

  // Exibir um percentual simplificado: se houver cargos, considerar ocupação = totalFuncionariosAlocados / (totalCargos || 1)
  const percentualOcupacao =
    totalCargos > 0
      ? (totalFuncionariosAlocados / (totalCargos || 1)) * 100
      : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() =>
                navigate(
                  `/hospitais/${hospitalId}/unidades-nao-internacao/${unidadeId}`
                )
              }
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Unidade
            </Button>
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {sitio.nome}
                </h1>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline">Sítio Funcional</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas de Vagas/Cargos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total de Vagas</p>
                  <p className="text-2xl font-bold">{totalCargos}</p>
                </div>
                <MapPin className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Vagas Disponíveis</p>
                  <p className="text-2xl font-bold ">
                    {cargosDisponiveisCount}
                  </p>
                </div>
                <Activity className="h-8 w-8 " />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Vagas Em Uso</p>
                  <p className="text-2xl font-bold ">{cargosEmUsoCount}</p>
                </div>
                <Clock className="h-8 w-8 " />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Taxa de Ocupação</p>
                  <p className="text-2xl font-bold ">
                    {percentualOcupacao.toFixed(1)}%
                  </p>
                </div>
                <Activity className="h-8 w-8 " />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Cargos atribuídos ao Sítio */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gestão de Cargos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {sitio.cargos && sitio.cargos.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sitio.cargos.map((cargo) => (
                  <Card
                    key={cargo.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>
                            {cargo.cargoUnidade?.cargo?.nome || "Cargo"}
                          </span>
                        </CardTitle>
                        <Badge className="text-xs">
                          x {cargo.quantidade_funcionarios}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {cargo.cargoUnidade?.cargo?.nome && (
                        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                          <strong>Cargo:</strong>{" "}
                          {cargo.cargoUnidade.cargo.nome}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">
                  Nenhum cargo atribuído a este sítio funcional.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    toast({
                      title: "Ação",
                      description:
                        "Use a aba de cargos da unidade para atribuir cargos a este sítio.",
                    });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Atribuir Cargo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal para Criar Nova Posição */}
        <Dialog open={posicaoModalOpen} onOpenChange={setPosicaoModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Posição</DialogTitle>
              <DialogDescription>
                Adicionar uma nova posição ao sítio funcional.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={criarPosicao} className="space-y-4">
              <div>
                <Label htmlFor="numero">Número da Posição *</Label>
                <input
                  id="numero"
                  type="text"
                  value={posicaoFormData.numero}
                  onChange={(e) =>
                    setPosicaoFormData({
                      ...posicaoFormData,
                      numero: e.target.value,
                    })
                  }
                  placeholder="Ex: 01, A1, Mesa 1..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={posicaoFormData.descricao}
                  onChange={(e) =>
                    setPosicaoFormData({
                      ...posicaoFormData,
                      descricao: e.target.value,
                    })
                  }
                  placeholder="Descrição adicional da posição..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={fecharModalPosicao}
                >
                  Cancelar
                </Button>
                <Button type="submit">Criar Posição</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal para Justificativa de Status Inativo */}
        <Dialog
          open={justificativaModalOpen}
          onOpenChange={setJustificativaModalOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Justificativa para Status Inativo</DialogTitle>
              <DialogDescription>
                Informe o motivo pelo qual esta posição está sendo marcada como
                inativa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="justificativa">Justificativa *</Label>
                <Textarea
                  id="justificativa"
                  value={justificativaFormData.justificativa}
                  onChange={(e) =>
                    setJustificativaFormData({
                      justificativa: e.target.value,
                    })
                  }
                  placeholder="Ex: Equipamento em manutenção, reforma do local, falta de pessoal..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setJustificativaModalOpen(false);
                    setPosicaoSelecionadaParaStatus(null);
                    setJustificativaFormData({ justificativa: "" });
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={confirmarStatusInativo}>
                  Confirmar Status Inativo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
