import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  FileText,
  Users,
  Layers3,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Settings,
  Activity,
  Bed,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { HospitalNavigationCard } from "@/components/HospitalNavigationCard";
import { HierarchyBreadcrumb } from "@/components/HierarchyBreadcrumb";
import {
  hospitaisApi,
  unidadesApi,
  colaboradoresApi,
  leitosApi,
  unidadesNaoInternacao,
} from "@/lib/api";

interface Hospital {
  id: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  regiao?: {
    id: string;
    nome: string;
    grupo?: {
      id: string;
      nome: string;
      rede?: {
        id: string;
        nome: string;
      };
    };
  };
  baseline?: {
    nome: string;
    quantidade_funcionarios?: number;
    custo_total?: string;
    setores?: string[];
    custo?: string[];
  };
  scpMetodo?: {
    id: string;
    key: string;
    title: string;
  };
  created_at: string;
}

interface Unidade {
  id: string;
  nome: string;
  numeroLeitos: number;
  scp?: string;
  scpMetodoKey?: string;
}

interface UnidadeNaoInternacao {
  id: string;
  nome: string;
  tipo: string;
  sitiosFuncionais: Array<{ id: string; status: string }>;
}

interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  ativo: boolean;
}

export default function HospitalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados principais
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadesNaoInt, setUnidadesNaoInt] = useState<UnidadeNaoInternacao[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Estados para modais
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    endereco: "",
    telefone: "",
  });

  // Carregar dados do hospital
  const carregarHospital = useCallback(async () => {
    if (!id) return;
    try {
      const response = await hospitaisApi.obter(id);
      const hospitalData = response as Hospital;
      setHospital(hospitalData);
      setFormData({
        nome: hospitalData.nome,
        cnpj: hospitalData.cnpj || "",
        endereco: hospitalData.endereco || "",
        telefone: hospitalData.telefone || "",
      });
    } catch (error) {
      console.error("Erro ao carregar hospital:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do hospital",
        variant: "destructive",
      });
      navigate("/hospitais");
    }
  }, [id, navigate, toast]);

  // Carregar unidades de internação
  const carregarUnidades = useCallback(async () => {
    if (!id) return;
    try {
      const response = await unidadesApi.listar(id);
      const unidadesData = Array.isArray(response)
        ? response
        : (response as { data?: Unidade[] })?.data || [];
      setUnidades(unidadesData as Unidade[]);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
    }
  }, [id]);

  // Carregar unidades de não-internação
  const carregarUnidadesNaoInternacao = useCallback(async () => {
    if (!id) return;
    try {
      const response = await unidadesNaoInternacao.listarPorHospital(id);
      setUnidadesNaoInt((response as UnidadeNaoInternacao[]) || []);
    } catch (error) {
      console.error("Erro ao carregar unidades de não-internação:", error);
    }
  }, [id]);

  // Carregar colaboradores
  const carregarColaboradores = useCallback(async () => {
    if (!id) return;
    try {
      const response = await colaboradoresApi.listar({ hospitalId: id });
      const colaboradoresData = Array.isArray(response)
        ? response
        : (response as { data?: Colaborador[] })?.data || [];
      setColaboradores(colaboradoresData as Colaborador[]);
    } catch (error) {
      console.error("Erro ao carregar colaboradores:", error);
    }
  }, [id]);

  // Carregar todos os dados
  useEffect(() => {
    const carregarTodos = async () => {
      setLoading(true);
      await Promise.all([
        carregarHospital(),
        carregarUnidades(),
        carregarUnidadesNaoInternacao(),
        carregarColaboradores(),
      ]);
      setLoading(false);
    };
    carregarTodos();
  }, [carregarHospital, carregarUnidades, carregarUnidadesNaoInternacao, carregarColaboradores]);

  // Atualizar hospital
  const handleUpdateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await hospitaisApi.atualizar(id, formData);
      toast({
        title: "Sucesso",
        description: "Hospital atualizado com sucesso",
      });
      setEditModalOpen(false);
      await carregarHospital();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar hospital",
        variant: "destructive",
      });
    }
  };

  // Calcular estatísticas
  const stats = {
    totalUnidades: unidades.length + unidadesNaoInt.length,
    unidadesInternacao: unidades.length,
    unidadesNaoInternacao: unidadesNaoInt.length,
    totalLeitos: unidades.reduce((acc, u) => acc + (u.numeroLeitos || 0), 0),
    totalSitios: unidadesNaoInt.reduce(
      (acc, u) => acc + (u.sitiosFuncionais?.length || 0),
      0
    ),
    sitiosDisponiveis: unidadesNaoInt.reduce(
      (acc, u) =>
        acc +
        (u.sitiosFuncionais?.filter((s) => s.status === "DISPONIVEL")?.length || 0),
      0
    ),
    colaboradoresAtivos: colaboradores.filter((c) => c.ativo).length,
    totalColaboradores: colaboradores.length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hospital) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-2">Hospital não encontrado</h2>
          <Button onClick={() => navigate("/hospitais")}>
            Voltar para Hospitais
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com navegação breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/hospitais")}
              className="flex items-center space-x-2 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Hospitais</span>
            </Button>
            
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-primary" />
              <span>{hospital.nome}</span>
            </h1>
            
            {/* Hierarquia organizacional */}
            {hospital.regiao && (
              <HierarchyBreadcrumb
                levels={[
                  ...(hospital.regiao.grupo?.rede ? [{
                    id: hospital.regiao.grupo.rede.id,
                    nome: hospital.regiao.grupo.rede.nome,
                    type: "rede" as const,
                  }] : []),
                  ...(hospital.regiao.grupo ? [{
                    id: hospital.regiao.grupo.id,
                    nome: hospital.regiao.grupo.nome,
                    type: "grupo" as const,
                  }] : []),
                  {
                    id: hospital.regiao.id,
                    nome: hospital.regiao.nome,
                    type: "regiao" as const,
                  },
                  {
                    id: hospital.id,
                    nome: hospital.nome,
                    type: "hospital" as const,
                  },
                ]}
              />
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Hospital</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateHospital} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome do Hospital</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) =>
                        setFormData({ ...formData, cnpj: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({ ...formData, telefone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="endereco">Endereço</Label>
                    <Textarea
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) =>
                        setFormData({ ...formData, endereco: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => navigate(`/hospitais/${id}/configuracoes`)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>

        {/* Informações básicas do hospital */}
        <Card className="hospital-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Informações Gerais</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hospital.cnpj && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    CNPJ
                  </Label>
                  <p className="text-sm font-semibold">{hospital.cnpj}</p>
                </div>
              )}
              {hospital.telefone && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Telefone
                  </Label>
                  <p className="text-sm font-semibold flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {hospital.telefone}
                  </p>
                </div>
              )}
              {hospital.endereco && (
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Endereço
                  </Label>
                  <p className="text-sm font-semibold flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {hospital.endereco}
                  </p>
                </div>
              )}
              {hospital.scpMetodo && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Método SCP
                  </Label>
                  <Badge variant="outline" className="mt-1">
                    {hospital.scpMetodo.title} ({hospital.scpMetodo.key})
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Unidades"
            value={stats.totalUnidades}
            icon={Layers3}
            description={`${stats.unidadesInternacao} internação + ${stats.unidadesNaoInternacao} não-internação`}
          />
          <StatsCard
            title="Leitos de Internação"
            value={stats.totalLeitos}
            icon={Bed}
            description="em unidades de internação"
          />
          <StatsCard
            title="Sítios Funcionais"
            value={stats.totalSitios}
            icon={Activity}
            description={`${stats.sitiosDisponiveis} disponíveis`}
          />
          <StatsCard
            title="Colaboradores"
            value={stats.colaboradoresAtivos}
            icon={Users}
            description={`${stats.totalColaboradores} total`}
          />
        </div>

        {/* Navegação principal por módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HospitalNavigationCard
            title="Unidades de Internação"
            description="Gerencie UTIs, enfermarias e unidades com leitos para internação de pacientes"
            icon={Bed}
            count={stats.unidadesInternacao}
            countLabel="unidades"
            primaryAction={{
              label: "Gerenciar Unidades",
              onClick: () => navigate(`/unidades?hospitalId=${id}`),
            }}
            secondaryAction={{
              label: "Nova",
              onClick: () => navigate(`/unidades/criar?hospitalId=${id}`),
            }}
          >
            {unidades.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Últimas unidades:
                </p>
                <div className="space-y-1">
                  {unidades.slice(0, 3).map((unidade) => (
                    <div
                      key={unidade.id}
                      className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
                    >
                      <span className="font-medium">{unidade.nome}</span>
                      <span className="text-muted-foreground">
                        {unidade.numeroLeitos} leitos
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </HospitalNavigationCard>

          <HospitalNavigationCard
            title="Unidades Especiais"
            description="Centro cirúrgico, ambulatórios, SADT e outras unidades de não-internação"
            icon={Activity}
            count={stats.unidadesNaoInternacao}
            countLabel="unidades"
            primaryAction={{
              label: "Gerenciar Unidades",
              onClick: () => navigate(`/hospitais/${id}/unidades-nao-internacao`),
              variant: "secondary",
            }}
            secondaryAction={{
              label: "Nova",
              onClick: () => navigate(`/hospitais/${id}/unidades-nao-internacao/criar`),
            }}
          >
            {unidadesNaoInt.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Tipos cadastrados:
                </p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(unidadesNaoInt.map(u => u.tipo))).map((tipo) => (
                    <Badge key={tipo} variant="outline" className="text-xs">
                      {tipo.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </HospitalNavigationCard>

          <HospitalNavigationCard
            title="Equipe e Colaboradores"
            description="Gerencie funcionários, cargos e escalas de trabalho do hospital"
            icon={Users}
            count={stats.colaboradoresAtivos}
            countLabel="ativos"
            primaryAction={{
              label: "Gerenciar Equipe",
              onClick: () => navigate(`/colaboradores?hospitalId=${id}`),
            }}
            secondaryAction={{
              label: "Novo",
              onClick: () => navigate(`/colaboradores/criar?hospitalId=${id}`),
            }}
          >
            {colaboradores.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Distribuição por cargo:
                </p>
                <div className="space-y-1">
                  {Object.entries(
                    colaboradores.reduce((acc, c) => {
                      acc[c.cargo] = (acc[c.cargo] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).slice(0, 3).map(([cargo, count]) => (
                    <div key={cargo} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{cargo}</span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </HospitalNavigationCard>

          <HospitalNavigationCard
            title="Relatórios e Análises"
            description="Acesse relatórios operacionais, estatísticas e análises de performance"
            icon={BarChart3}
            primaryAction={{
              label: "Ver Relatórios",
              onClick: () => navigate(`/relatorios/mensal?hospitalId=${id}`),
              variant: "outline",
            }}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-primary/5 rounded">
                  <p className="text-lg font-bold text-primary">{stats.totalLeitos}</p>
                  <p className="text-xs text-muted-foreground">Leitos</p>
                </div>
                <div className="p-2 bg-secondary/5 rounded">
                  <p className="text-lg font-bold text-secondary">{stats.totalSitios}</p>
                  <p className="text-xs text-muted-foreground">Sítios</p>
                </div>
              </div>
            </div>
          </HospitalNavigationCard>
        </div>

        {/* Baseline de custos (se existir) */}
        {hospital.baseline && (
          <Card className="hospital-card border-l-4 border-l-secondary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                <span>Baseline de Custos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-secondary/5 rounded-lg">
                  <p className="text-2xl font-bold text-secondary">
                    {hospital.baseline.quantidade_funcionarios || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Funcionários</p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    R$ {hospital.baseline.custo_total || "0,00"}
                  </p>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                </div>
                <div className="text-center p-4 bg-muted/20 rounded-lg">
                  <p className="text-2xl font-bold">
                    {hospital.baseline.setores?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Setores/Sítios</p>
                </div>
              </div>
              {hospital.baseline.setores && hospital.baseline.setores.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Setores/Sítios Cadastrados
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {hospital.baseline.setores.map((setor, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {setor}
                        {hospital.baseline?.custo?.[index] && (
                          <span className="ml-1 text-muted-foreground">
                            (R$ {hospital.baseline.custo[index]})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs de conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="unidades" className="flex items-center space-x-2">
              <Layers3 className="h-4 w-4" />
              <span>Unidades</span>
            </TabsTrigger>
            <TabsTrigger value="colaboradores" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Equipe</span>
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Relatórios</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ações rápidas */}
              <Card className="hospital-card">
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center space-y-2"
                      onClick={() => navigate(`/unidades?hospitalId=${id}`)}
                    >
                      <Layers3 className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium">Nova Unidade</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center space-y-2"
                      onClick={() =>
                        navigate(`/hospitais/${id}/unidades-nao-internacao`)
                      }
                    >
                      <Activity className="h-6 w-6 text-secondary" />
                      <span className="text-sm font-medium">Unidades Especiais</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center space-y-2"
                      onClick={() => navigate(`/colaboradores?hospitalId=${id}`)}
                    >
                      <Users className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium">Novo Colaborador</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center space-y-2"
                      onClick={() => navigate(`/relatorios/mensal?hospitalId=${id}`)}
                    >
                      <TrendingUp className="h-6 w-6 text-secondary" />
                      <span className="text-sm font-medium">Relatórios</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Baseline de custos */}
              {hospital.baseline && (
                <Card className="hospital-card">
                  <CardHeader>
                    <CardTitle>Baseline de Custos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Funcionários
                          </Label>
                          <p className="text-lg font-bold">
                            {hospital.baseline.quantidade_funcionarios || 0}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Custo Total
                          </Label>
                          <p className="text-lg font-bold text-primary">
                            R$ {hospital.baseline.custo_total || "0,00"}
                          </p>
                        </div>
                      </div>
                      {hospital.baseline.setores && hospital.baseline.setores.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Setores/Sítios
                          </Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hospital.baseline.setores.map((setor, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {setor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Unidades */}
          <TabsContent value="unidades" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unidades de Internação */}
              <Card className="hospital-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Bed className="h-5 w-5 text-primary" />
                      <span>Unidades de Internação</span>
                      <Badge variant="secondary">{stats.unidadesInternacao}</Badge>
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/unidades?hospitalId=${id}`)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nova
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {unidades.length === 0 ? (
                    <div className="text-center py-8">
                      <Bed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Nenhuma unidade de internação cadastrada
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/unidades?hospitalId=${id}`)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeira Unidade
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {unidades.map((unidade) => (
                        <div
                          key={unidade.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/unidades/${unidade.id}/leitos`)}
                        >
                          <div>
                            <p className="font-medium">{unidade.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {unidade.numeroLeitos} leitos
                              {unidade.scpMetodoKey && (
                                <span className="ml-2">• {unidade.scpMetodoKey}</span>
                              )}
                            </p>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Unidades de Não-Internação */}
              <Card className="hospital-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-secondary" />
                      <span>Unidades Especiais</span>
                      <Badge variant="secondary">{stats.unidadesNaoInternacao}</Badge>
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate(`/hospitais/${id}/unidades-nao-internacao`)
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nova
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {unidadesNaoInt.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Nenhuma unidade especial cadastrada
                      </p>
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(`/hospitais/${id}/unidades-nao-internacao`)
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeira Unidade
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {unidadesNaoInt.map((unidade) => (
                        <div
                          key={unidade.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() =>
                            navigate(
                              `/hospitais/${id}/unidades-nao-internacao/${unidade.id}`
                            )
                          }
                        >
                          <div>
                            <p className="font-medium">{unidade.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {unidade.tipo.replace(/_/g, " ")} •{" "}
                              {unidade.sitiosFuncionais?.length || 0} sítios
                            </p>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Colaboradores */}
          <TabsContent value="colaboradores" className="space-y-6">
            <Card className="hospital-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Equipe do Hospital</span>
                    <Badge variant="secondary">{stats.colaboradoresAtivos}</Badge>
                  </CardTitle>
                  <Button
                    onClick={() => navigate(`/colaboradores?hospitalId=${id}`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Colaborador
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {colaboradores.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Nenhum colaborador cadastrado
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/colaboradores?hospitalId=${id}`)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Colaborador
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {colaboradores.slice(0, 10).map((colaborador) => (
                      <div
                        key={colaborador.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{colaborador.nome}</p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {colaborador.cargo}
                            </Badge>
                            <Badge
                              variant={colaborador.ativo ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {colaborador.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {colaboradores.length > 10 && (
                      <div className="text-center pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/colaboradores?hospitalId=${id}`)
                          }
                        >
                          Ver todos ({colaboradores.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Relatórios */}
          <TabsContent value="relatorios" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="hospital-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span>Relatórios Operacionais</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate(`/relatorios/mensal?hospitalId=${id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Relatórios Mensais
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate(`/avaliacoes?hospitalId=${id}`)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Avaliações SCP
                  </Button>
                  <Button
                    variant="outline"
                    className="