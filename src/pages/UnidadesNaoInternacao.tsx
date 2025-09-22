import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { UnidadeCard } from "@/components/UnidadeCard";
import { unidadesNaoInternacao } from "@/lib/api";
import {
  UnidadeNaoInternacaoResponse,
  TipoUnidadeNaoInternacao,
  TIPOS_UNIDADE_CONFIG,
} from "@/types/unidadeNaoInternacao";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UnidadesNaoInternacao() {
  const navigate = useNavigate();
  const { hospitalId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const [unidades, setUnidades] = useState<UnidadeNaoInternacaoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<
    TipoUnidadeNaoInternacao | "TODOS"
  >("TODOS");
  const [unidadeParaDeletar, setUnidadeParaDeletar] = useState<string | null>(
    null
  );

  const buscarUnidades = useCallback(async () => {
    if (!hospitalId) return;

    setLoading(true);
    try {
      const response = await unidadesNaoInternacao.listarPorHospital(
        hospitalId
      );
      setUnidades((response as UnidadeNaoInternacaoResponse[]) || []);
    } catch (error) {
      console.error("Erro ao buscar unidades:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar unidades de não-internação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [hospitalId, toast]);

  useEffect(() => {
    buscarUnidades();
  }, [buscarUnidades]);

  const unidadesFiltradas = unidades.filter((unidade) => {
    const matchesSearch =
      unidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unidade.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFiltro === "TODOS" || unidade.tipo === tipoFiltro;
    return matchesSearch && matchesTipo;
  });

  const estatisticasPorTipo = Object.keys(TIPOS_UNIDADE_CONFIG)
    .map((tipo) => {
      const unidadesTipo = unidades.filter((u) => u.tipo === tipo);
      const totalSitios = unidadesTipo.reduce(
        (acc, u) => acc + u.sitiosFuncionais.length,
        0
      );
      const sitiosDisponiveis = unidadesTipo.reduce(
        (acc, u) =>
          acc +
          u.sitiosFuncionais.filter((s) => s.status === "DISPONIVEL").length,
        0
      );

      return {
        tipo: tipo as TipoUnidadeNaoInternacao,
        quantidade: unidadesTipo.length,
        totalSitios,
        sitiosDisponiveis,
        config: TIPOS_UNIDADE_CONFIG[tipo as TipoUnidadeNaoInternacao],
      };
    })
    .filter((stat) => stat.quantidade > 0);

  const handleView = (id: string) => {
    navigate(`/hospitais/${hospitalId}/unidades-nao-internacao/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/hospitais/${hospitalId}/unidades-nao-internacao/${id}/editar`);
  };

  const handleDelete = async () => {
    if (!unidadeParaDeletar) return;

    try {
      await unidadesNaoInternacao.deletar(unidadeParaDeletar);
      toast({
        title: "Sucesso",
        description: "Unidade deletada com sucesso",
      });
      setUnidadeParaDeletar(null);
      buscarUnidades();
    } catch (error) {
      console.error("Erro ao deletar unidade:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar unidade",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando unidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Unidades de Não-Internação
          </h1>
          <p className="text-gray-600">
            Centro Cirúrgico, Ambulatórios, SADT e outros serviços
          </p>
        </div>
        <Button
          onClick={() =>
            navigate(`/hospitais/${hospitalId}/unidades-nao-internacao/criar`)
          }
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Unidade</span>
        </Button>
      </div>

      {/* Estatísticas por Tipo */}
      {estatisticasPorTipo.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {estatisticasPorTipo.map(
            ({ tipo, quantidade, totalSitios, sitiosDisponiveis, config }) => (
              <Card key={tipo} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{config.label}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {quantidade} unidade{quantidade !== 1 ? "s" : ""}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {sitiosDisponiveis}/{totalSitios} disponíveis
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome ou descrição da unidade"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Unidade</label>
              <Select
                value={tipoFiltro}
                onValueChange={(value) =>
                  setTipoFiltro(value as TipoUnidadeNaoInternacao | "TODOS")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os tipos</SelectItem>
                  {Object.entries(TIPOS_UNIDADE_CONFIG).map(
                    ([tipo, config]) => (
                      <SelectItem key={tipo} value={tipo}>
                        {config.icon} {config.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Unidades */}
      {unidadesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {unidades.length === 0
                ? "Nenhuma unidade cadastrada"
                : "Nenhuma unidade encontrada"}
            </h3>
            <p className="text-gray-600 mb-4">
              {unidades.length === 0
                ? "Comece criando sua primeira unidade de não-internação"
                : "Tente ajustar os filtros de busca"}
            </p>
            {unidades.length === 0 && (
              <Button
                onClick={() =>
                  navigate(
                    `/hospitais/${hospitalId}/unidades-nao-internacao/criar`
                  )
                }
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Criar Primeira Unidade</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unidadesFiltradas.map((unidade) => (
            <UnidadeCard
              key={unidade.id}
              unidade={unidade}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={(id) => setUnidadeParaDeletar(id)}
            />
          ))}
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!unidadeParaDeletar}
        onOpenChange={() => setUnidadeParaDeletar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta unidade? Esta ação não pode
              ser desfeita. Todos os sítios funcionais e dados relacionados
              serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
