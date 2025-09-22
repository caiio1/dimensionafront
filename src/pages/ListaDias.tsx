import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Calendar,
  Download,
  Eye,
  Filter,
  FileText,
  BarChart3,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useSelectedDate } from "@/hooks/useSelectedDate";
import { relatoriosApi, exportApi, api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ResumoDiario {
  data: string;
  unidade?: string;
  metodo?: string | null;
  numeroLeitos?: number; // leitos ativos
  numeroLeitosTotal?: number; // total incluindo inativos
  numeroLeitosInativos?: number;
  quantidadeAvaliacoes: number; // novo nome vindo da API
  distribuicao?: Record<string, number>; // alias para quantidadePorClassificacao
  quantidadePorClassificacao?: Record<string, number>;
  ocupacao?: {
    usadaAvaliacoes?: number;
    usadaHistorico?: number;
  };
  taxaOcupacao?: number;
  taxaOcupacaoHistorico?: number;
  colaboradores?: Array<{
    colaboradorId: string;
    nome: string;
    total: number;
    distribuicao?: Record<string, number>;
  }>;
}

interface DiaResumido {
  data: string;
  dataFormatada: string;
  isHoje: boolean;
  quantidadeAvaliacoes: number;
  distribuicao: {
    minimos: number;
    intermediarios: number;
    altaDependencia: number;
    semiIntensivos: number;
    intensivos: number;
  };
  estatisticas: {
    totalLeitos: number;
    leitosOcupados: number;
    leitosVagos: number;
    leitosPendentes: number;
    leitosInativos: number;
    taxaOcupacao: number;
  };
}

interface ResumoMensal {
  unidadeId: string;
  nomeUnidade: string;
  ano: number;
  mes: number;
  dias: DiaResumido[];
}

export default function ListaDias() {
  const navigate = useNavigate();
  const { hospitalId, unidadeId } = useParams();
  const { setSelectedDate } = useSelectedDate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [dias, setDias] = useState<DiaResumido[]>([]);
  const [resumoSelecionado, setResumoSelecionado] =
    useState<ResumoDiario | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtros, setFiltros] = useState({
    unidadeId: unidadeId || "",
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const buscarDados = useCallback(async () => {
    const unidadeParaBuscar = filtros.unidadeId || unidadeId;
    if (!unidadeParaBuscar) {
      toast({
        title: "Atenção",
        description: "Informe o ID da unidade para buscar os dados",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setDias([]); // Limpar dados antigos antes da nova busca

    try {
      const url = `/unidades/${unidadeParaBuscar}/resumo-mensal`;
      const params = {
        ano: filtros.ano,
        mes: filtros.mes,
      };

      const response = await api.get(url, params);

      const resumoMensal: ResumoMensal = (response as ResumoMensal) || {
        unidadeId: unidadeParaBuscar,
        nomeUnidade: "",
        ano: filtros.ano,
        mes: filtros.mes,
        dias: [],
      };

      let diasProcessados = [...resumoMensal.dias];

      // Verificar se hoje está no período e incluí-lo se necessário
      const hoje = new Date();
      const hojeAno = hoje.getFullYear();
      const hojeMes = hoje.getMonth() + 1;
      const hojeStr = `${hojeAno}-${String(hojeMes).padStart(2, "0")}-${String(
        hoje.getDate()
      ).padStart(2, "0")}`;

      if (hojeAno === filtros.ano && hojeMes === filtros.mes) {
        const hojeExiste = diasProcessados.find((d) => d.data === hojeStr);

        if (!hojeExiste) {
          // Criar entrada para hoje com valores zerados
          const diaHoje: DiaResumido = {
            data: hojeStr,
            dataFormatada: formatarData(hojeStr),
            isHoje: true,
            quantidadeAvaliacoes: 0,
            distribuicao: {
              minimos: 0,
              intermediarios: 0,
              altaDependencia: 0,
              semiIntensivos: 0,
              intensivos: 0,
            },
            estatisticas: {
              totalLeitos: 0,
              leitosOcupados: 0,
              leitosVagos: 0,
              leitosPendentes: 0,
              leitosInativos: 0,
              taxaOcupacao: 0,
            },
          };
          diasProcessados.unshift(diaHoje);
        } else {
          // Garantir que hoje está marcado como isHoje e mover para o topo
          hojeExiste.isHoje = true;
          diasProcessados = diasProcessados.filter((d) => d.data !== hojeStr);
          diasProcessados.unshift(hojeExiste);
        }
      }

      // Marcar outros dias como não sendo hoje
      diasProcessados.forEach((dia) => {
        if (dia.data !== hojeStr) {
          dia.isHoje = false;
        }
      });

      setDias(diasProcessados);
      setCurrentPage(1);
    } catch (e) {
      console.error("Erro ao buscar resumo mensal:", e);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do mês",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filtros, unidadeId, toast]);

  // Configurar unidadeId nos filtros quando disponível
  useEffect(() => {
    if (unidadeId && filtros.unidadeId !== unidadeId) {
      setFiltros((prev) => ({ ...prev, unidadeId }));
    }
  }, [unidadeId, filtros.unidadeId]);

  // Buscar dados quando filtros mudarem
  useEffect(() => {
    buscarDados();
  }, [buscarDados]);
  const baixarPDFDia = async (data: string) => {
    const unidadeParaBaixar = filtros.unidadeId || unidadeId;
    if (!unidadeParaBaixar) return;

    try {
      const pdfBuffer = await exportApi.resumoDiarioPdf(
        unidadeParaBaixar,
        data
      );
      const blob = new Blob([pdfBuffer as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_diario_${unidadeParaBaixar}_${data}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: "Download do PDF do dia iniciado",
      });
    } catch (error) {
      console.error("Erro ao baixar PDF do dia:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar PDF do dia",
        variant: "destructive",
      });
    }
  };

  const selecionarDia = (data: string) => {
    setSelectedDate(data);
    // Navegar para os leitos da unidade com a data selecionada
    const unidadeParaNavegar = filtros.unidadeId || unidadeId;
    console.info("ListaDias: navegar para MinhaUnidade", {
      data,
      unidadeId: unidadeParaNavegar,
      from: "ListaDias",
    });
    navigate(`/minha-unidade/${unidadeParaNavegar}`);
  };

  const verResumoDia = async (data: string) => {
    const unidadeParaBuscar = filtros.unidadeId || unidadeId;
    console.log("DATA : ", data);
    console.log("FILTROS : ", filtros);
    if (!unidadeParaBuscar) return;

    setLoadingResumo(true);
    try {
      // Buscar dados detalhados usando o parâmetro incluirDetalhes
      const response = await api.get(
        `/unidades/${unidadeParaBuscar}/resumo-mensal`,
        {
          ano: filtros.ano,
          mes: filtros.mes,
          incluirDetalhes: true,
        }
      );

      const resumoMensal: ResumoMensal = (response as ResumoMensal) || {
        unidadeId: unidadeParaBuscar,
        nomeUnidade: "",
        ano: filtros.ano,
        mes: filtros.mes,
        dias: [],
      };

      // Encontrar o dia específico
      let diaEncontrado = resumoMensal.dias.find((d) => d.data === data);

      // Se não encontrou e é hoje, criar um resumo básico para permitir avaliação
      if (!diaEncontrado) {
        const hoje = new Date();
        const hojeStr = `${hoje.getFullYear()}-${String(
          hoje.getMonth() + 1
        ).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

        if (data === hojeStr) {
          // Buscar informações básicas da unidade E estado real dos leitos
          try {
            const [unidadeInfo, leitosInfo] = await Promise.all([
              api.get(`/unidades/${unidadeParaBuscar}`),
              api.get(`/leitos`, { unidadeId: unidadeParaBuscar }),
            ]);

            const unidadeData = unidadeInfo as { numeroLeitos?: number };
            const leitosData = leitosInfo as Array<{ status?: string }>;

            // Calcular estatísticas reais dos leitos
            const leitosArray = Array.isArray(leitosData) ? leitosData : [];
            const totalLeitos = leitosArray.length;
            const leitosInativos = leitosArray.filter(
              (l) => String(l.status || "").toUpperCase() === "INATIVO"
            ).length;
            const leitosAtivos = totalLeitos - leitosInativos;

            diaEncontrado = {
              data: hojeStr,
              dataFormatada: formatarData(hojeStr),
              isHoje: true,
              quantidadeAvaliacoes: 0,
              distribuicao: {
                minimos: 0,
                intermediarios: 0,
                altaDependencia: 0,
                semiIntensivos: 0,
                intensivos: 0,
              },
              estatisticas: {
                totalLeitos: totalLeitos,
                leitosOcupados: 0,
                leitosVagos: leitosAtivos, // Apenas os ativos podem estar vagos
                leitosPendentes: 0,
                leitosInativos: leitosInativos, // ✅ VALOR REAL!
                taxaOcupacao: 0,
              },
            };
          } catch (e) {
            console.warn("Não foi possível buscar info da unidade:", e);
            // Criar resumo mínimo mesmo sem dados da unidade
            diaEncontrado = {
              data: hojeStr,
              dataFormatada: formatarData(hojeStr),
              isHoje: true,
              quantidadeAvaliacoes: 0,
              distribuicao: {
                minimos: 0,
                intermediarios: 0,
                altaDependencia: 0,
                semiIntensivos: 0,
                intensivos: 0,
              },
              estatisticas: {
                totalLeitos: 0,
                leitosOcupados: 0,
                leitosVagos: 0,
                leitosPendentes: 0,
                leitosInativos: 0,
                taxaOcupacao: 0,
              },
            };
          }
        } else {
          toast({
            title: "Erro",
            description: "Dados do dia não encontrados",
            variant: "destructive",
          });
          return;
        }
      }

      const resumo: ResumoDiario = {
        data: diaEncontrado.data,
        unidade: resumoMensal.nomeUnidade,
        metodo: null,
        numeroLeitos:
          diaEncontrado.estatisticas.totalLeitos -
          diaEncontrado.estatisticas.leitosInativos,
        numeroLeitosTotal: diaEncontrado.estatisticas.totalLeitos,
        numeroLeitosInativos: diaEncontrado.estatisticas.leitosInativos,
        quantidadeAvaliacoes: diaEncontrado.quantidadeAvaliacoes,
        distribuicao: {
          MINIMOS: diaEncontrado.distribuicao.minimos,
          INTERMEDIARIOS: diaEncontrado.distribuicao.intermediarios,
          ALTA_DEPENDENCIA: diaEncontrado.distribuicao.altaDependencia,
          SEMI_INTENSIVOS: diaEncontrado.distribuicao.semiIntensivos,
          INTENSIVOS: diaEncontrado.distribuicao.intensivos,
        },
        quantidadePorClassificacao: {
          MINIMOS: diaEncontrado.distribuicao.minimos,
          INTERMEDIARIOS: diaEncontrado.distribuicao.intermediarios,
          ALTA_DEPENDENCIA: diaEncontrado.distribuicao.altaDependencia,
          SEMI_INTENSIVOS: diaEncontrado.distribuicao.semiIntensivos,
          INTENSIVOS: diaEncontrado.distribuicao.intensivos,
        },
        ocupacao: {
          usadaAvaliacoes: diaEncontrado.estatisticas.leitosOcupados,
          usadaHistorico: diaEncontrado.estatisticas.leitosOcupados,
        },
        taxaOcupacao: diaEncontrado.estatisticas.taxaOcupacao,
        taxaOcupacaoHistorico: diaEncontrado.estatisticas.taxaOcupacao,
        colaboradores: [],
      };
      setResumoSelecionado(resumo);
      setDrawerOpen(true);
    } catch (e) {
      console.error("Erro ao carregar resumo do dia:", e);
      toast({
        title: "Erro",
        description: "Erro ao carregar resumo do dia",
        variant: "destructive",
      });
    } finally {
      setLoadingResumo(false);
    }
  };

  const formatarData = (data: string) => {
    try {
      // Parse seguro de YYYY-MM-DD em horário local (evita voltar um dia)
      const [y, m, d] = data.split("-").map((v) => parseInt(v, 10));
      if (!y || !m || !d) return data;
      const dt = new Date(y, m - 1, d); // local midnight
      return dt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        weekday: "short",
      });
    } catch {
      return data;
    }
  };

  const formatarPercentual = (valor?: number) => {
    if (typeof valor !== "number" || isNaN(valor)) return "—";
    // Se vier como fração (<=1), converter para %
    const base = valor <= 1 ? valor * 100 : valor;
    const decimais = base < 10 ? 1 : 0;
    return `${parseFloat(base.toFixed(decimais))}%`;
  };

  return (
    <DashboardLayout title="Dias Gerados">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Selecionar Período</h1>
            <p className="text-muted-foreground">
              Escolha um dia para visualizar os leitos e avaliações
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(`/unidades/${unidadeId}/leitos`)}
          >
            Voltar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ano">Ano</Label>
                <Select
                  value={filtros.ano.toString()}
                  onValueChange={(value) =>
                    setFiltros((prev) => ({
                      ...prev,
                      ano: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 76 }, (_, i) => {
                      const year = 2025 + i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mes">Mês</Label>
                <Select
                  value={filtros.mes.toString()}
                  onValueChange={(value) =>
                    setFiltros((prev) => ({
                      ...prev,
                      mes: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Janeiro</SelectItem>
                    <SelectItem value="2">Fevereiro</SelectItem>
                    <SelectItem value="3">Março</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Maio</SelectItem>
                    <SelectItem value="6">Junho</SelectItem>
                    <SelectItem value="7">Julho</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={buscarDados}
                  disabled={loading}
                  className="w-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {loading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Dias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dias com Avaliações - {filtros.mes}/{filtros.ano}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Carregando dados...</div>
              </div>
            ) : dias.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Nenhum dia com avaliações encontrado no período
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {(() => {
                  // Cálculos da paginação
                  const totalPages = Math.ceil(dias.length / itemsPerPage);
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const currentDias = dias.slice(startIndex, endIndex);

                  return (
                    <>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Data</th>
                            <th className="text-center p-3 font-medium">
                              Avaliações
                            </th>
                            <th className="text-center p-3 font-medium">
                              Mínimos
                            </th>
                            <th className="text-center p-3 font-medium">
                              Intermediários
                            </th>
                            <th className="text-center p-3 font-medium">
                              Alta Dep.
                            </th>
                            <th className="text-center p-3 font-medium">
                              Semi-int.
                            </th>
                            <th className="text-center p-3 font-medium">
                              Intensivos
                            </th>
                            <th className="text-center p-3 font-medium">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentDias.map((dia, index) => {
                            return (
                              <tr
                                key={dia.data}
                                className={`border-b hover:bg-muted/30 transition-colors ${
                                  dia.isHoje
                                    ? "bg-green-50 border-l-4 border-l-green-500"
                                    : ""
                                }`}
                              >
                                <td className="p-3">
                                  <div
                                    className={`font-medium ${
                                      dia.isHoje ? "text-green-700" : ""
                                    }`}
                                  >
                                    {dia.dataFormatada ||
                                      formatarData(dia.data)}
                                    {dia.isHoje && (
                                      <span className="text-xs text-green-600 ml-2 font-semibold">
                                        (HOJE)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {dia.data}
                                  </div>
                                </td>
                                <td className="text-center p-3">
                                  <Badge
                                    variant={
                                      dia.quantidadeAvaliacoes > 0
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="font-semibold"
                                  >
                                    {dia.quantidadeAvaliacoes}
                                  </Badge>
                                </td>
                                <td className="text-center p-3 text-sm">
                                  {dia.distribuicao.minimos}
                                </td>
                                <td className="text-center p-3 text-sm">
                                  {dia.distribuicao.intermediarios}
                                </td>
                                <td className="text-center p-3 text-sm">
                                  {dia.distribuicao.altaDependencia}
                                </td>
                                <td className="text-center p-3 text-sm">
                                  {dia.distribuicao.semiIntensivos}
                                </td>
                                <td className="text-center p-3 text-sm">
                                  {dia.distribuicao.intensivos}
                                </td>
                                <td className="text-center p-3">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => verResumoDia(dia.data)}
                                      className="h-7 px-2"
                                      disabled={loadingResumo}
                                    >
                                      <BarChart3 className="h-3 w-3 mr-1" />
                                      Resumo
                                    </Button>
                                    {dia.isHoje && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => selecionarDia(dia.data)}
                                        className="h-7 px-2 bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Avaliar
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => baixarPDFDia(dia.data)}
                                      className="h-7 px-2"
                                    >
                                      <FileText className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Paginação */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                          <div className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPages} ({dias.length}{" "}
                            dias no total)
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage((prev) => Math.max(prev - 1, 1))
                              }
                              disabled={currentPage === 1}
                            >
                              Anterior
                            </Button>

                            {/* Números das páginas */}
                            {Array.from(
                              { length: totalPages },
                              (_, i) => i + 1
                            ).map((page) => (
                              <Button
                                key={page}
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="w-8"
                              >
                                {page}
                              </Button>
                            ))}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCurrentPage((prev) =>
                                  Math.min(prev + 1, totalPages)
                                )
                              }
                              disabled={currentPage === totalPages}
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drawer de Resumo do Dia */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resumo —{" "}
                {resumoSelecionado?.data
                  ? formatarData(resumoSelecionado.data)
                  : ""}
              </SheetTitle>
            </SheetHeader>

            {loadingResumo ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Carregando resumo...
                </div>
              </div>
            ) : resumoSelecionado ? (
              <div className="space-y-6 mt-6">
                {/* Cards de Resumo */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-secondary text-black">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {typeof resumoSelecionado.quantidadeAvaliacoes ===
                        "number"
                          ? resumoSelecionado.quantidadeAvaliacoes
                          : "—"}
                      </div>
                      <div className="text-sm opacity-90">
                        Total de Avaliações
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {formatarPercentual(resumoSelecionado.taxaOcupacao)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Taxa de Ocupação
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Distribuição por Classe */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Distribuição por Classe
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      "MINIMOS",
                      "INTERMEDIARIOS",
                      "ALTA_DEPENDENCIA",
                      "SEMI_INTENSIVOS",
                      "INTENSIVOS",
                    ].map((classe) => (
                      <div
                        key={classe}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm font-medium">
                          {classe
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <Badge variant="outline">
                          {typeof resumoSelecionado.distribuicao?.[classe] ===
                          "number"
                            ? resumoSelecionado.distribuicao?.[classe]
                            : 0}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Indicadores adicionais */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Indicadores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Leitos Ocupados</span>
                      <Badge variant="secondary">
                        {typeof resumoSelecionado.ocupacao?.usadaAvaliacoes ===
                        "number"
                          ? resumoSelecionado.ocupacao?.usadaAvaliacoes
                          : "—"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Leitos Ativos</span>
                      <Badge variant="secondary">
                        {typeof resumoSelecionado.numeroLeitos === "number"
                          ? resumoSelecionado.numeroLeitos
                          : "—"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Leitos Inativos</span>
                      <Badge variant="secondary">
                        {typeof resumoSelecionado.numeroLeitosInativos ===
                        "number"
                          ? resumoSelecionado.numeroLeitosInativos
                          : 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Leitos Totais</span>
                      <Badge variant="secondary">
                        {resumoSelecionado.numeroLeitosTotal ??
                          (typeof resumoSelecionado.numeroLeitos === "number" ||
                          typeof resumoSelecionado.numeroLeitosInativos ===
                            "number"
                            ? (resumoSelecionado.numeroLeitos || 0) +
                              (resumoSelecionado.numeroLeitosInativos || 0)
                            : undefined) ??
                          "—"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Leitos Avaliados</span>
                      <Badge variant="secondary">
                        {typeof resumoSelecionado.quantidadeAvaliacoes ===
                          "number" &&
                        (typeof resumoSelecionado.numeroLeitos === "number" ||
                          typeof resumoSelecionado.numeroLeitosTotal ===
                            "number")
                          ? `${resumoSelecionado.quantidadeAvaliacoes} / ${
                              resumoSelecionado.numeroLeitos ??
                              resumoSelecionado.numeroLeitosTotal
                            }`
                          : "—"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Ações do Drawer */}
                <div className="space-y-2">
                  <Button
                    onClick={() =>
                      resumoSelecionado.data &&
                      baixarPDFDia(resumoSelecionado.data)
                    }
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF do Dia
                  </Button>
                </div>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
