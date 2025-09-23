import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Building2,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Phone,
  FileText,
  Users,
  Layers3,
  Activity,
  ChevronRight,
  Building,
  Network,
  Globe,
  X,
  Check,
  Save,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { hospitaisApi, redesApi, gruposApi, regioesApi } from "@/lib/api";

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
  };
  scpMetodo?: {
    id: string;
    key: string;
    title: string;
  };
  created_at: string;
}

interface Rede {
  id: string;
  nome: string;
  descricao?: string;
}

interface Grupo {
  id: string;
  nome: string;
  redeId?: string;
  descricao?: string;
}

interface Regiao {
  id: string;
  nome: string;
  grupoId?: string;
  descricao?: string;
}

type ViewMode = "grid" | "hierarchy" | "create" | "edit";

export default function Hospitais() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Estados principais
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [redes, setRedes] = useState<Rede[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de interface
  const [viewMode, setViewMode] = useState<ViewMode>("hierarchy");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRede, setSelectedRede] = useState<string>("todas");
  const [selectedGrupo, setSelectedGrupo] = useState<string>("todos");
  const [selectedRegiao, setSelectedRegiao] = useState<string>("todas");
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    endereco: "",
    telefone: "",
    regiaoId: "",
  });

  const normalizeApiResponse = <T,>(response: unknown): T[] => {
    if (Array.isArray(response)) return response as T[];
    if (response && typeof response === "object" && "data" in response) {
      const data = (response as { data?: unknown }).data;
      if (Array.isArray(data)) return data as T[];
    }
    return [];
  };

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [hospitaisResp, redesResp, gruposResp, regioesResp] = await Promise.all([
        hospitaisApi.listar().catch(() => []),
        redesApi.listar().catch(() => []),
        gruposApi.listar().catch(() => []),
        regioesApi.listar().catch(() => []),
      ]);

      setHospitais(normalizeApiResponse<Hospital>(hospitaisResp));
      setRedes(normalizeApiResponse<Rede>(redesResp));
      setGrupos(normalizeApiResponse<Grupo>(gruposResp));
      setRegioes(normalizeApiResponse<Regiao>(regioesResp));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos hospitais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Filtros aplicados
  const hospitaisFiltrados = hospitais.filter((hospital) => {
    const matchesSearch = hospital.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRede = selectedRede === "todas" || hospital.regiao?.grupo?.rede?.id === selectedRede;
    const matchesGrupo = selectedGrupo === "todos" || hospital.regiao?.grupo?.id === selectedGrupo;
    const matchesRegiao = selectedRegiao === "todas" || hospital.regiao?.id === selectedRegiao;
    
    return matchesSearch && matchesRede && matchesGrupo && matchesRegiao;
  });

  // Organização hierárquica
  const organizacaoHierarquica = redes.map((rede) => {
    const gruposRede = grupos.filter((g) => g.redeId === rede.id);
    return {
      rede,
      grupos: gruposRede.map((grupo) => {
        const regioesGrupo = regioes.filter((r) => r.grupoId === grupo.id);
        return {
          grupo,
          regioes: regioesGrupo.map((regiao) => {
            const hospitaisRegiao = hospitais.filter((h) => h.regiao?.id === regiao.id);
            return {
              regiao,
              hospitais: hospitaisRegiao,
            };
          }),
        };
      }),
    };
  });

  // Hospitais sem hierarquia definida
  const hospitaisSemHierarquia = hospitais.filter((h) => !h.regiao);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do hospital",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        nome: formData.nome,
        cnpj: formData.cnpj || undefined,
        endereco: formData.endereco || undefined,
        telefone: formData.telefone || undefined,
        regiaoId: formData.regiaoId || undefined,
      };

      if (editingHospital) {
        await hospitaisApi.atualizar(editingHospital.id, payload);
        toast({
          title: "Sucesso",
          description: "Hospital atualizado com sucesso",
        });
      } else {
        await hospitaisApi.criar(payload);
        toast({
          title: "Sucesso",
          description: "Hospital criado com sucesso",
        });
      }

      setViewMode("hierarchy");
      setEditingHospital(null);
      setFormData({ nome: "", cnpj: "", endereco: "", telefone: "", regiaoId: "" });
      carregarDados();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar hospital",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setFormData({
      nome: hospital.nome,
      cnpj: hospital.cnpj || "",
      endereco: hospital.endereco || "",
      telefone: hospital.telefone || "",
      regiaoId: hospital.regiao?.id || "",
    });
    setViewMode("edit");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este hospital?")) return;

    try {
      await hospitaisApi.excluir(id);
      toast({
        title: "Sucesso",
        description: "Hospital excluído com sucesso",
      });
      carregarDados();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir hospital",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", cnpj: "", endereco: "", telefone: "", regiaoId: "" });
    setEditingHospital(null);
    setViewMode("hierarchy");
  };

  // Estatísticas gerais
  const stats = {
    totalHospitais: hospitais.length,
    totalRedes: redes.length,
    totalGrupos: grupos.length,
    totalRegioes: regioes.length,
    hospitaisFiltrados: hospitaisFiltrados.length,
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

  // Formulário de criação/edição
  if (viewMode === "create" || viewMode === "edit") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header do formulário */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={resetForm}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold">
                  {viewMode === "edit" ? "Editar Hospital" : "Novo Hospital"}
                </h1>
                <p className="text-muted-foreground">
                  {viewMode === "edit" 
                    ? "Atualize as informações do hospital"
                    : "Preencha os dados para criar um novo hospital"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <Card className="max-w-4xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span>Informações do Hospital</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Hospital *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Hospital Central"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regiao">Região</Label>
                    <Select
                      value={formData.regiaoId}
                      onValueChange={(value) => setFormData({ ...formData, regiaoId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma região" />
                      </SelectTrigger>
                      <SelectContent>
                        {regioes.map((regiao) => (
                          <SelectItem key={regiao.id} value={regiao.id}>
                            {regiao.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Textarea
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Endereço completo do hospital"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {viewMode === "edit" ? "Atualizar" : "Criar"} Hospital
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header principal */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-primary" />
              <span>Gestão de Hospitais</span>
            </h1>
            <p className="text-muted-foreground">
              Gerencie a rede hospitalar e suas hierarquias organizacionais
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                {stats.totalRedes} redes
              </span>
              <span className="flex items-center gap-1">
                <Network className="h-4 w-4" />
                {stats.totalGrupos} grupos
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {stats.totalRegioes} regiões
              </span>
              <span className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {stats.totalHospitais} hospitais
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-1">
              <Button
                variant={viewMode === "hierarchy" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("hierarchy")}
              >
                <Network className="h-4 w-4 mr-1" />
                Hierarquia
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Lista
              </Button>
            </div>
            <Button onClick={() => setViewMode("create")} className="hospital-button-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Hospital
            </Button>
          </div>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Hospitais"
            value={stats.totalHospitais}
            icon={Building2}
            description="na rede"
          />
          <StatsCard
            title="Redes Ativas"
            value={stats.totalRedes}
            icon={Globe}
            description="organizações"
          />
          <StatsCard
            title="Grupos"
            value={stats.totalGrupos}
            icon={Network}
            description="regionais"
          />
          <StatsCard
            title="Regiões"
            value={stats.totalRegioes}
            icon={MapPin}
            description="geográficas"
          />
        </div>

        {/* Filtros avançados */}
        <Card className="hospital-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-primary" />
              <span>Filtros e Busca</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar Hospital</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do hospital..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rede</Label>
                <Select value={selectedRede} onValueChange={setSelectedRede}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Redes</SelectItem>
                    {redes.map((rede) => (
                      <SelectItem key={rede.id} value={rede.id}>
                        {rede.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Grupos</SelectItem>
                    {grupos
                      .filter((g) => selectedRede === "todas" || g.redeId === selectedRede)
                      .map((grupo) => (
                        <SelectItem key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Região</Label>
                <Select value={selectedRegiao} onValueChange={setSelectedRegiao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Regiões</SelectItem>
                    {regioes
                      .filter((r) => selectedGrupo === "todos" || r.grupoId === selectedGrupo)
                      .map((regiao) => (
                        <SelectItem key={regiao.id} value={regiao.id}>
                          {regiao.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(searchTerm || selectedRede !== "todas" || selectedGrupo !== "todos" || selectedRegiao !== "todas") && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {hospitaisFiltrados.length} de {hospitais.length} hospitais
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedRede("todas");
                    setSelectedGrupo("todos");
                    setSelectedRegiao("todas");
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conteúdo baseado no modo de visualização */}
        {viewMode === "hierarchy" ? (
          <div className="space-y-8">
            {/* Visualização hierárquica */}
            {organizacaoHierarquica.map((redeItem) => (
              <Card key={redeItem.rede.id} className="hospital-card border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <Globe className="h-6 w-6 text-blue-600" />
                    <span className="text-xl">{redeItem.rede.nome}</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Rede
                    </Badge>
                  </CardTitle>
                  {redeItem.rede.descricao && (
                    <p className="text-sm text-muted-foreground">{redeItem.rede.descricao}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {redeItem.grupos.map((grupoItem) => (
                    <div key={grupoItem.grupo.id} className="border-l-2 border-l-green-300 pl-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <Network className="h-5 w-5 text-green-600" />
                        <span className="text-lg font-semibold">{grupoItem.grupo.nome}</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Grupo
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        {grupoItem.regioes.map((regiaoItem) => (
                          <div key={regiaoItem.regiao.id} className="border-l-2 border-l-purple-300 pl-4">
                            <div className="flex items-center space-x-3 mb-3">
                              <MapPin className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">{regiaoItem.regiao.nome}</span>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Região
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {regiaoItem.hospitais.length} hospital(is)
                              </span>
                            </div>
                            
                            {regiaoItem.hospitais.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {regiaoItem.hospitais
                                  .filter((h) => 
                                    h.nome.toLowerCase().includes(searchTerm.toLowerCase())
                                  )
                                  .map((hospital) => (
                                    <HospitalCard
                                      key={hospital.id}
                                      hospital={hospital}
                                      onView={() => navigate(`/hospitais/${hospital.id}`)}
                                      onEdit={() => handleEdit(hospital)}
                                      onDelete={() => handleDelete(hospital.id)}
                                    />
                                  ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                                Nenhum hospital nesta região
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {/* Hospitais sem hierarquia */}
            {hospitaisSemHierarquia.length > 0 && (
              <Card className="hospital-card border-l-4 border-l-gray-400">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <Building className="h-6 w-6 text-gray-600" />
                    <span className="text-xl">Hospitais Independentes</span>
                    <Badge variant="outline" className="bg-gray-100 text-gray-700">
                      Sem Hierarquia
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Hospitais que não estão vinculados a uma região específica
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hospitaisSemHierarquia
                      .filter((h) => 
                        h.nome.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((hospital) => (
                        <HospitalCard
                          key={hospital.id}
                          hospital={hospital}
                          onView={() => navigate(`/hospitais/${hospital.id}`)}
                          onEdit={() => handleEdit(hospital)}
                          onDelete={() => handleDelete(hospital.id)}
                        />
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estado vazio */}
            {hospitais.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum hospital cadastrado</h3>
                  <p className="text-muted-foreground text-center mb-6">
                    Comece criando seu primeiro hospital na rede
                  </p>
                  <Button onClick={() => setViewMode("create")} className="hospital-button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Hospital
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Visualização em grade */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {hospitaisFiltrados.map((hospital) => (
                <HospitalCard
                  key={hospital.id}
                  hospital={hospital}
                  onView={() => navigate(`/hospitais/${hospital.id}`)}
                  onEdit={() => handleEdit(hospital)}
                  onDelete={() => handleDelete(hospital.id)}
                  showHierarchy
                />
              ))}
            </div>

            {hospitaisFiltrados.length === 0 && searchTerm && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum hospital encontrado</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Tente ajustar os filtros de busca
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedRede("todas");
                      setSelectedGrupo("todos");
                      setSelectedRegiao("todas");
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Componente de card do hospital otimizado
interface HospitalCardProps {
  hospital: Hospital;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showHierarchy?: boolean;
}

function HospitalCard({ hospital, onView, onEdit, onDelete, showHierarchy = false }: HospitalCardProps) {
  return (
    <Card className="hospital-card-enhanced group cursor-pointer" onClick={onView}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>{hospital.nome}</span>
            </CardTitle>
            
            {/* Hierarquia organizacional */}
            {showHierarchy && hospital.regiao && (
              <div className="mt-2 space-y-1">
                {hospital.regiao.grupo?.rede && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {hospital.regiao.grupo.rede.nome}
                  </Badge>
                )}
                {hospital.regiao.grupo && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 ml-1">
                    {hospital.regiao.grupo.nome}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 ml-1">
                  {hospital.regiao.nome}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Informações básicas */}
        <div className="space-y-2 text-sm">
          {hospital.endereco && (
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground line-clamp-2">{hospital.endereco}</span>
            </div>
          )}
          {hospital.telefone && (
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{hospital.telefone}</span>
            </div>
          )}
          {hospital.cnpj && (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-mono text-xs">{hospital.cnpj}</span>
            </div>
          )}
        </div>

        {/* Baseline de custos */}
        {hospital.baseline && (
          <div className="bg-muted/30 rounded-lg p-3 border">
            <div className="text-xs font-medium text-muted-foreground mb-2">Baseline</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Funcionários:</span>
                <span className="font-medium ml-1">{hospital.baseline.quantidade_funcionarios || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Custo:</span>
                <span className="font-medium ml-1">R$ {hospital.baseline.custo_total || "0,00"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Método SCP */}
        {hospital.scpMetodo && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Método SCP:</span>
            <Badge variant="outline" className="text-xs">
              {hospital.scpMetodo.key}
            </Badge>
          </div>
        )}

        {/* Ações rápidas */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="flex-1 mr-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver Detalhes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // Navegar diretamente para unidades do hospital
              window.location.href = `/#/unidades?hospitalId=${hospital.id}`;
            }}
            className="flex-1 ml-1"
          >
            <Layers3 className="h-4 w-4 mr-1" />
            Unidades
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}