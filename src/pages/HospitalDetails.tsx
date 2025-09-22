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
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/hospitais")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Hospitais</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-2xl font-bold flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-primary" />
                <span>{hospital.nome}</span>
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                {hospital.regiao && (
                  <div className="text-sm text-muted-foreground">
                    {hospital.regiao.grupo?.rede?.nome && (
                      <span>{hospital.regiao.grupo.rede.nome} → </span>
                    )}
                    {hospital.regiao.grupo?.nome && (
                      <span>{hospital.regiao.grupo.nome} → </span>
                    )}
                    <span>{hospital.regiao.nome}</span>
                  </div>
                )}
              </div>
            </div>
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
                    className="w-full justify-start"
                    onClick={() => navigate(`/leitos?hospitalId=${id}`)}
                  >
                    <Bed className="h-4 w-4 mr-2" />
                    Status dos Leitos
                  </Button>
                </CardContent>
              </Card>

              <Card className="hospital-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-secondary" />
                    <span>Análises e Estatísticas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {Math.round((stats.colaboradoresAtivos / (stats.totalLeitos || 1)) * 10) / 10}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Colaboradores por leito
                      </p>
                    </div>
                    <div className="p-3 bg-secondary/5 rounded-lg">
                      <p className="text-2xl font-bold text-secondary">
                        {stats.totalSitios > 0
                          ? Math.round((stats.sitiosDisponiveis / stats.totalSitios) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sítios disponíveis
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}