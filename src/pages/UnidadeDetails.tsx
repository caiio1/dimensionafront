/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bed,
  Search,
  MapPin,
  Activity,
  User,
  Calendar,
  Download,
  Eye,
  Filter,
  FileText,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge, BadgeProps } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSelectedDate } from "@/hooks/useSelectedDate";
import {
  unidadesApi,
  leitosApi,
  avaliacoesSessaoApi, // novo para ocupação baseada em sessões ativas
  exportApi,
  parametrosApi,
} from "@/lib/api";
import { unwrapData, normalizeList } from "@/lib/apiUtils";
import getLeitoBadge from "@/lib/leitoBadge";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InternacaoDetailsModal } from "@/components/InternacaoDetailsModal";

interface Unidade {
  id: string;
  nome: string;
  numeroLeitos: number;
  hospitalId?: string;
  scpMetodoKey: string;
  hospital?: { id?: string; nome?: string };
  horas_extra_reais?: string | null;
  horas_extra_projetadas?: string | null;
  cargos_unidade?: CargoUnidade[];
}
interface Parametros {
  nome_enfermeiro?: string;
  numero_coren?: string;
  aplicarIST?: boolean;
  ist?: number;
  diasSemana?: number;
}
interface CargoUnidade {
  id?: string;
  cargoId: string;
  cargo?: {
    id: string;
    nome: string;
    salario?: string;
    carga_horaria?: string;
    adicionais_tributos?: string;
  };
  quantidade_funcionarios: number;
}

interface Leito {
  id: string;
  numero: string;
  unidadeId: string;
  ocupado?: boolean;
  status?: string;
  justificativa?: string;
  created_at: string;
  internacao?: {
    id: string;
    paciente: {
      id: string;
      nome: string;
      cpf: string;
    };
    dataEntrada: string;
  };
}

interface Paciente {
  id: string;
  nome: string;
}

interface Internacao {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  leitoId: string;
  leitoNome: string;
  unidadeId: string;
  dataEntrada: string;
  status: string;
  paciente: Paciente;
  leito: {
    id: string;
    numero: string;
  };
  leitoCompleto?: Leito; // adicionar o leito completo
}

// Interfaces para Dias Gerados
interface ResumoDiario {
  data: string;
  unidade?: string;
  metodo?: string | null;
  numeroLeitos?: number;
  numeroLeitosTotal?: number;
  numeroLeitosInativos?: number;
  quantidadeAvaliacoes: number;
  distribuicao?: Record<string, number>;
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

export default function UnidadeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [leitos, setLeitos] = useState<Leito[]>([]);
  const [loading, setLoading] = useState(true);
  const [internacaoDetailsOpen, setInternacaoDetailsOpen] = useState(false);
  const [selectedInternacao, setSelectedInternacao] =
    useState<Internacao | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("leitos");

  // Estados para histórico mensal
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [historicoMensal, setHistoricoMensal] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Estados para Dias Gerados
  const [dias, setDias] = useState<DiaResumido[]>([]);
  const [resumoSelecionado, setResumoSelecionado] =
    useState<ResumoDiario | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtros, setFiltros] = useState({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [loadingDias, setLoadingDias] = useState(false);

  const { setSelectedDate } = useSelectedDate();
  const { toast } = useToast();

  // Estados para dimensionamento
  const [dimensionamento, setDimensionamento] = useState({
    // Dados do enfermeiro responsável
    nomeEnfermeiro: "",
    numeroCoren: "",

    // Dados da equipe de enfermagem
    enfermeiro: { cargoHorario: 36, percentualEquipe: 0.33 },
    tecnicoEnfermagem: { cargoHorario: 36, percentualEquipe: 0.67 },

    // Índice de Segurança Técnica (15% por padrão)
    indiceTecnico: 15,

    // Idade da equipe / restrições
    idadeEquipeRestricoes: "nao",

    // Pacientes por tipo de cuidado - quantidades (inputs amarelos)
    pcm: 0, // Paciente de cuidado mínimo
    pci: 0, // Paciente de cuidado intermediário
    pcad: 0, // Paciente de cuidado alta dependência
    pcsi: 0, // Paciente de cuidado semi-intensivo
    pcit: 0, // Paciente de cuidado intensivo

    // Horas por paciente (constantes - campos brancos)
    horasPorPaciente: {
      pcm: 4,
      pci: 6,
      pcad: 10,
      pcsi: 10,
      pcit: 18,
    },

    // Constante de marinho (Coeficiente de Segurança)
    constanteMarinho: {
      enfermeiro: 0,
      tecnicoEnfermagem: 0,
    },

    diasSemana: 7,

    // Quantidade de leitos e taxa de ocupação
    quantidadeLeitos: 0,
    taxaOcupacao: 0,
  });

  // Estado para loading do salvamento
  const [salvandoDimensionamento, setSalvandoDimensionamento] = useState(false);

  // Estado para controlar se o dimensionamento foi calculado
  const [dimensionamentoCalculado, setDimensionamentoCalculado] =
    useState(false);
  const [dimensionamentoId, setDimensionamentoId] = useState<string | null>(
    null
  );
  // Parâmetros persistidos (nome, numero_coren, aplicarIST, ist, diasSemana)
  const [parametros, setParametros] = useState<Parametros | null>(null);
  const [resultadosCalculados, setResultadosCalculados] = useState({
    the: 0,
    qp: 0,
    qpReal: 0,
    qpTeorico: 0,
    constanteMarinho: 0,
    qpEnfermeiro: 0,
    qpTecnico: 0,
    percentualEnfermeiro: 33,
    percentualTecnico: 67,
  });

  // Estado para quantidades editáveis de cargos não-SCP
  const [quantidadesEditaveis, setQuantidadesEditaveis] = useState<
    Record<string, number>
  >({});

  // Função para verificar se um cargo é calculado pelo SCP
  const isCargSCP = (nomeCargo: string) => {
    const nome = nomeCargo.toLowerCase();
    return nome.includes("enfermeiro") || nome.includes("técnico");
  };

  // Função para atualizar quantidade editável de cargo não-SCP
  const atualizarQuantidadeEditavel = (
    cargoId: string,
    novaQuantidade: number
  ) => {
    setQuantidadesEditaveis((prev) => ({
      ...prev,
      [cargoId]: Math.max(0, novaQuantidade), // Garantir que não seja negativo
    }));
  };

  // Função para validar se todos os campos obrigatórios estão preenchidos
  const validarCamposObrigatorios = () => {
    const {
      nomeEnfermeiro,
      numeroCoren,
      enfermeiro,
      tecnicoEnfermagem,
      indiceTecnico,
      idadeEquipeRestricoes,
      quantidadeLeitos,
      taxaOcupacao,
      pcm,
      pci,
      pcad,
      pcsi,
      pcit,
      diasSemana,
    } = dimensionamento;

    // Verificar se todos os campos numéricos são maiores que 0 ou se pelo menos um tipo de paciente foi preenchido
    const temPacientes = pcm > 0 || pci > 0 || pcad > 0 || pcsi > 0 || pcit > 0;

    // Pequeno epsilon para aceitar taxas de ocupação expressas como decimais muito pequenas
    // Accept explicit 0 (0%) coming from backend as valid for now
    const EPS = 1e-3; // 0.1%
    const taxaOcupacaoValida =
      typeof taxaOcupacao === "number" && !isNaN(taxaOcupacao)
        ? taxaOcupacao === 0 || taxaOcupacao > 0 || taxaOcupacao >= EPS
        : false;

    // Debug: imprimir estado que controla a validação — remova em produção
    console.log("debug: validarCamposObrigatorios", {
      nomeEnfermeiro: nomeEnfermeiro?.trim(),
      numeroCoren: numeroCoren?.trim(),
      enfermeiroCargoHorario: enfermeiro?.cargoHorario,
      tecnicoCargoHorario: tecnicoEnfermagem?.cargoHorario,
      indiceTecnico,
      idadeEquipeRestricoes,
      quantidadeLeitos,
      taxaOcupacao,
      taxaOcupacaoValida,
      diasSemana,
      temPacientes,
    });

    // Porcentuais agora são calculados automaticamente, não precisam de validação manual

    return (
      nomeEnfermeiro.trim() !== "" &&
      numeroCoren.trim() !== "" &&
      enfermeiro.cargoHorario > 0 &&
      tecnicoEnfermagem.cargoHorario > 0 &&
      indiceTecnico > 0 &&
      idadeEquipeRestricoes !== "" &&
      quantidadeLeitos > 0 &&
      taxaOcupacaoValida &&
      diasSemana > 0 &&
      temPacientes
    );
  };

  // Funções de ajuste de percentuais removidas - agora são calculadas automaticamente
  // Funções de ajuste de percentuais removidas - agora são calculadas automaticamente

  // Calcular valores derivados do dimensionamento e salvar
  const calcularDimensionamento = async () => {
    // Validar campos obrigatórios
    if (!validarCamposObrigatorios()) {
      toast({
        title: "Campos Obrigatórios",
        description:
          "Preencha todos os campos obrigatórios: nome do enfermeiro, número do COREN, cargo horário, índice técnico, quantidade de leitos, taxa de ocupação, dias da semana, pelo menos um tipo de paciente e a pergunta sobre idade da equipe. As porcentagens da equipe são calculadas automaticamente.",
        variant: "destructive",
      });
      return;
    }

    const {
      pcm,
      pci,
      pcad,
      pcsi,
      pcit,
      horasPorPaciente,
      indiceTecnico,
      diasSemana,
      quantidadeLeitos,
      idadeEquipeRestricoes,
    } = dimensionamento;

    // Calcular THE (Total de Horas de Enfermagem) - SOMA das horas por paciente
    const the =
      pcm * horasPorPaciente.pcm +
      pci * horasPorPaciente.pci +
      pcad * horasPorPaciente.pcad +
      pcsi * horasPorPaciente.pcsi +
      pcit * horasPorPaciente.pcit;

    // Calcular Constante de Marinho (CSM) baseado no Excel
    // Fórmula: SE(idadeEquipeRestricoes="nao"; "NÃO"; (quantidadeLeitos*0.8)/(quantidadeLeitos*(1+indiceTecnico/100))/(quantidadeLeitos*0.1+indiceTecnico/100))
    let constanteMarinhoCalculada = 0;
    if (idadeEquipeRestricoes === "nao") {
      // Se não há restrições, a constante é 0 (como "NÃO" no Excel)
      constanteMarinhoCalculada = 0;
    } else {
      // Fórmula complexa do Excel adaptada
      const numerador = quantidadeLeitos * 0.8;
      const denominador1 = quantidadeLeitos * (1 + indiceTecnico / 100);
      const denominador2 = quantidadeLeitos * 0.1 + indiceTecnico / 100;
      constanteMarinhoCalculada = numerador / denominador1 / denominador2;
    }

    // FÓRMULA CORRETA DO EXCEL PARA CÁLCULO DE PORCENTAGENS
    // Baseado na planilha:
    // D24 → PCM → Pacientes de Cuidado Mínimo
    // D25 → PCI → Pacientes de Cuidado Intermediário
    // D26 → PADC → Pacientes de Alta Dependência Clínica
    // D27 → PCSI → Pacientes de Cuidado Semi-Intensivo
    // D28 → PCIt → Pacientes de Cuidado Intensivo

    function calcularPercentualEnfermeiros(
      pcm: number,
      pci: number,
      padc: number,
      pcsi: number,
      pcit: number
    ): number {
      const somaMinInter = pcm + pci; // SOMA($D$24:$D$25)

      // Regra 1 → Maioria de pacientes de cuidado mínimo + intermediário (33%)
      if (
        somaMinInter >= padc &&
        somaMinInter >= pcsi &&
        somaMinInter >= pcit
      ) {
        return 0.33;
      }

      // Regra 2 → Maioria de pacientes de alta dependência clínica (37%)
      if (padc > somaMinInter && padc >= pcsi && padc >= pcit) {
        return 0.37;
      }

      // Regra 3 → Maioria de pacientes de cuidado semi-intensivo (42%)
      if (pcsi > somaMinInter && pcsi > padc && pcsi >= pcit) {
        return 0.42;
      }

      // Regra 4 → Maioria de pacientes de cuidado intensivo (52%)
      return 0.52;
    }

    // Aplicar a fórmula com as variáveis corretas
    const percentualEnfermeiroCalculado = calcularPercentualEnfermeiros(
      pcm,
      pci,
      pcad,
      pcsi,
      pcit
    );

    // DEBUG: Mostrar cálculo no console (pode ser removido em produção)
    console.log(`Cálculo de Porcentagens:
      PCM (Mínimo): ${pcm}h
      PCI (Intermediário): ${pci}h  
      PADC (Alta Dependência): ${pcad}h
      PCSI (Semi-Intensivo): ${pcsi}h
      PCIT (Intensivo): ${pcit}h
      
      Soma Min+Inter: ${pcm + pci}h
      Resultado: ${Math.round(
        percentualEnfermeiroCalculado * 100
      )}% enfermeiros / ${Math.round(
      (1 - percentualEnfermeiroCalculado) * 100
    )}% técnicos`);

    // Fórmula do técnico: =1-D9 (onde D9 é a porcentagem do enfermeiro)
    const percentualTecnicoCalculado = 1 - percentualEnfermeiroCalculado;

    // Fórmula QP baseada no Excel: THE * DS * (1 + IST/100) / CHS
    // Onde DS = dias da semana, IST = índice técnico, CHS = carga horária semanal (36h)
    const ds = diasSemana;
    const ist = indiceTecnico; // Usar diretamente o valor percentual
    const chs = 36;

    // QP Real (conforme Excel): THE * DS * (1 + IST/100) / CHS
    const qpReal = (the * ds * (1 + ist / 100)) / chs;

    // QP Teórico (se houver constante de Marinho)
    let qpTeorico = qpReal;
    if (constanteMarinhoCalculada > 0) {
      qpTeorico = qpReal * (1 + constanteMarinhoCalculada);
    }

    // Usar QP Teórico como padrão (ou Real se não houver constante)
    const qp = qpTeorico;

    // QP por categoria usando porcentagens calculadas automaticamente pela fórmula do Excel
    const qpEnfermeiro = qp * percentualEnfermeiroCalculado;
    const qpTecnico = qp * percentualTecnicoCalculado;

    const resultados = {
      the: Math.round(the * 100) / 100,
      qp: Math.round(qp * 100) / 100,
      qpReal: Math.round(qpReal * 100) / 100,
      qpTeorico: Math.round(qpTeorico * 100) / 100,
      constanteMarinho: Math.round(constanteMarinhoCalculada * 10000) / 10000, // 4 casas decimais
      qpEnfermeiro: Math.round(qpEnfermeiro * 100) / 100,
      qpTecnico: Math.round(qpTecnico * 100) / 100,
      percentualEnfermeiro: Math.round(percentualEnfermeiroCalculado * 100),
      percentualTecnico: Math.round(percentualTecnicoCalculado * 100),
    };

    setResultadosCalculados(resultados);
    setDimensionamentoCalculado(true);

    // Atualizar o estado do dimensionamento com os percentuais calculados
    setDimensionamento((prev) => ({
      ...prev,
      enfermeiro: {
        ...prev.enfermeiro,
        percentualEquipe: percentualEnfermeiroCalculado,
      },
      tecnicoEnfermagem: {
        ...prev.tecnicoEnfermagem,
        percentualEquipe: percentualTecnicoCalculado,
      },
    }));

    // Salvar automaticamente após calcular
    await salvarDimensionamento(resultados);

    return resultados;
  };

  // Função para calcular dados da tabela de análise financeira
  const calcularAnaliseFinanceira = () => {
    if (!dimensionamentoCalculado || !unidade.cargos_unidade) return [];

    // Mapear cargos da unidade com cálculos
    return unidade.cargos_unidade.map((cargoUnidade, index) => {
      const cargo = cargoUnidade.cargo;
      const salario = parseFloat(cargo?.salario?.replace(",", ".") || "0");
      const adicionais = parseFloat(
        cargo?.adicionais_tributos?.replace(",", ".") || "0"
      );
      const custoTotalPorFuncionario = salario + adicionais;

      // Quantidade atual de funcionários
      const quantidadeAtual = cargoUnidade.quantidade_funcionarios;

      // Verificar se é cargo SCP ou não
      const isScpCargo = isCargSCP(cargo?.nome || "");

      // Quantidade calculada pelo SCP (baseado no tipo de cargo)
      let quantidadeCalculada = 0;
      if (isScpCargo) {
        // Para cargos SCP, usar os resultados calculados automaticamente
        if (cargo?.nome?.toLowerCase().includes("enfermeiro")) {
          quantidadeCalculada = Math.ceil(resultadosCalculados.qpEnfermeiro);
        } else if (cargo?.nome?.toLowerCase().includes("técnico")) {
          quantidadeCalculada = Math.ceil(resultadosCalculados.qpTecnico);
        }
      } else {
        // Para cargos não-SCP, usar quantidade editável ou manter a quantidade atual como padrão
        const cargoId = cargo?.id || cargoUnidade.id || `cargo-${index}`;
        quantidadeCalculada = quantidadesEditaveis[cargoId] ?? quantidadeAtual;
      }

      // Cálculos de custos
      const custoTotalAtual = quantidadeAtual * custoTotalPorFuncionario;
      const custoTotalCalculado =
        quantidadeCalculada * custoTotalPorFuncionario;

      // Variações
      const variacaoQuantidade = quantidadeCalculada - quantidadeAtual;
      const variacaoPercentual =
        quantidadeAtual > 0
          ? Math.round(
              ((quantidadeCalculada - quantidadeAtual) / quantidadeAtual) * 100
            )
          : 0;
      const variacaoCusto = custoTotalCalculado - custoTotalAtual;

      // Cálculo de horas (baseado na carga horária)
      const cargaHoraria = parseFloat(
        cargo?.carga_horaria?.replace("h", "") || "40"
      );
      const horasExtrasProjetadas = parseFloat(
        unidade.horas_extra_projetadas?.replace("h", "") || "0"
      );

      // Horas reais (quantidade atual × carga horária)
      const horasReais = quantidadeAtual * cargaHoraria;

      // Horas calculadas (quantidade calculada × carga horária)
      const horasCalculadas = quantidadeCalculada * cargaHoraria;

      // Variação de horas (calculadas - reais)
      const variacaoHoras = horasCalculadas - horasReais;

      return {
        cargo: cargo?.nome || "N/A",
        cargoId: cargo?.id || cargoUnidade.id || `cargo-${index}`,
        isScpCargo,
        salario,
        adicionais,
        custoTotalPorFuncionario,
        quantidadeAtual,
        custoTotalAtual,
        quantidadeCalculada,
        custoTotalCalculado,
        variacaoQuantidade,
        variacaoPercentual,
        variacaoCusto,
        horasExtrasProjetadas,
        horasReais,
        horasCalculadas,
        variacaoHoras,
      };
    });
  };

  // Função para calcular totais da tabela de análise financeira
  const calcularTotaisAnaliseFinanceira = () => {
    const dados = calcularAnaliseFinanceira();
    if (dados.length === 0) return null;
    // Somar a maior parte dos totais por linha, mas usar o valor de horas extras projetadas da própria unidade
    const subtotal = dados.reduce(
      (total, linha) => ({
        quantidadeAtual: total.quantidadeAtual + linha.quantidadeAtual,
        custoTotalAtual: total.custoTotalAtual + linha.custoTotalAtual,
        quantidadeCalculada:
          total.quantidadeCalculada + linha.quantidadeCalculada,
        custoTotalCalculado:
          total.custoTotalCalculado + linha.custoTotalCalculado,
        variacaoQuantidade: total.variacaoQuantidade + linha.variacaoQuantidade,
        variacaoCusto: total.variacaoCusto + linha.variacaoCusto,
        horasReais: total.horasReais + linha.horasReais,
        horasCalculadas: total.horasCalculadas + linha.horasCalculadas,
        variacaoHoras: total.variacaoHoras + linha.variacaoHoras,
        somaVariacaoPercentual:
          (total.somaVariacaoPercentual || 0) + (linha.variacaoPercentual || 0),
      }),
      {
        quantidadeAtual: 0,
        custoTotalAtual: 0,
        quantidadeCalculada: 0,
        custoTotalCalculado: 0,
        variacaoQuantidade: 0,
        variacaoCusto: 0,
        horasReais: 0,
        horasCalculadas: 0,
        variacaoHoras: 0,
        somaVariacaoPercentual: 0,
      }
    );

    // Helpers para parsing robusto de números no formato pt-BR e com sufixos
    const parseBrazilianNumber = (s?: string | null) => {
      if (s === undefined || s === null) return 0;
      const raw = String(s).trim();
      if (raw === "") return 0;
      // remover símbolos e espaços
      const cleaned = raw.replace(/[^0-9.,-]/g, "");
      // se contém vírgula e ponto, assumimos que ponto é milhares e vírgula é decimal
      if (cleaned.indexOf(",") !== -1 && cleaned.indexOf(".") !== -1) {
        return parseFloat(cleaned.replace(/\./g, "").replace(/,/g, ".")) || 0;
      }
      // se contém apenas vírgula, trocar por ponto
      if (cleaned.indexOf(",") !== -1) {
        return parseFloat(cleaned.replace(/,/g, ".")) || 0;
      }
      // caso contrário, parse normal
      return parseFloat(cleaned) || 0;
    };

    const horasExtrasProjetadasUnit = parseBrazilianNumber(
      unidade?.horas_extra_projetadas?.toString()?.replace(/h/gi, "") ?? "0"
    );

    const valorHorasExtrasReaisUnit = parseBrazilianNumber(
      unidade?.horas_extra_reais?.toString() ?? "0"
    );

    return {
      ...subtotal,
      horasExtrasProjetadas: horasExtrasProjetadasUnit,
      valorHorasExtrasReais: valorHorasExtrasReaisUnit,
    } as any;
  };

  // Funções para Dias Gerados
  const buscarDados = useCallback(async () => {
    if (!id) {
      toast({
        title: "Atenção",
        description: "Informe o ID da unidade para buscar os dados",
        variant: "destructive",
      });
      return;
    }

    setLoadingDias(true);
    setDias([]);

    try {
      const response = await unidadesApi.resumoMensal(id, {
        ano: filtros.ano,
        mes: filtros.mes,
      });

      const resumoMensal: ResumoMensal = (response as ResumoMensal) || {
        unidadeId: id,
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
          hojeExiste.isHoje = true;
          diasProcessados = diasProcessados.filter((d) => d.data !== hojeStr);
          diasProcessados.unshift(hojeExiste);
        }
      }

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
      setLoadingDias(false);
    }
  }, [filtros, id, toast]);

  const baixarPDFDia = async (data: string) => {
    if (!id) return;

    try {
      const pdfBuffer = await exportApi.resumoDiarioPdf(id, data);
      const blob = new Blob([pdfBuffer as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_diario_${id}_${data}.pdf`;
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
    // Manter na mesma página mas mudar para aba de leitos
    setActiveTab("leitos");
  };

  const verResumoDia = async (data: string) => {
    if (!id) return;

    setLoadingResumo(true);
    try {
      const response = await unidadesApi.resumoMensal(id, {
        ano: filtros.ano,
        mes: filtros.mes,
        incluirDetalhes: true,
      });

      const resumoMensal: ResumoMensal = (response as ResumoMensal) || {
        unidadeId: id,
        nomeUnidade: "",
        ano: filtros.ano,
        mes: filtros.mes,
        dias: [],
      };

      let diaEncontrado = resumoMensal.dias.find((d) => d.data === data);

      if (!diaEncontrado) {
        const hoje = new Date();
        const hojeStr = `${hoje.getFullYear()}-${String(
          hoje.getMonth() + 1
        ).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

        if (data === hojeStr) {
          try {
            const unidadeInfo = await unidadesApi.obter(id);
            const unidadeData = unidadeInfo as { numeroLeitos?: number };
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
                totalLeitos: unidadeData?.numeroLeitos || 0,
                leitosOcupados: 0,
                leitosVagos: unidadeData?.numeroLeitos || 0,
                leitosPendentes: 0,
                leitosInativos: 0,
                taxaOcupacao: 0,
              },
            };
          } catch (e) {
            console.warn("Não foi possível buscar info da unidade:", e);
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
      const [y, m, d] = data.split("-").map((v) => parseInt(v, 10));
      if (!y || !m || !d) return data;
      const dt = new Date(y, m - 1, d);
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
    const base = valor <= 1 ? valor * 100 : valor;
    const decimais = base < 10 ? 1 : 0;
    return `${parseFloat(base.toFixed(decimais))}%`;
  };

  // Buscar dados quando filtros mudarem na aba dias-gerados
  useEffect(() => {
    if (activeTab === "dias-gerados") {
      buscarDados();
    }
  }, [activeTab, buscarDados]);

  // Não navegar mais automaticamente para dias gerados - agora é uma aba local
  // useEffect(() => {
  //   if (activeTab === "dias-gerados") {
  //     const hospitalId = unidade?.hospitalId || unidade?.hospital?.id;
  //     if (hospitalId) {
  //       navigate(`/lista-dias/${hospitalId}/${id}`);
  //     }
  //   }
  // }, [activeTab, unidade, id, navigate]);

  // Mapa de status por leito (não mais por internação)
  const [avaliacaoStatusMap, setAvaliacaoStatusMap] = useState<
    Record<string, "nao_realizada" | "em_andamento" | "concluida">
  >({});
  // Sessões ativas (ocupação real dos leitos agora é derivada daqui)
  const [sessoesAtivas, setSessoesAtivas] = useState<any[]>([]);
  // prazo de validade da avaliação (em horas
  // Funções de carregamento com useCallback para estabilidade das dependências
  const carregarUnidade = useCallback(async (): Promise<Unidade | null> => {
    try {
      const response = await unidadesApi.obter(id!);
      const unidadeEncontrada =
        unwrapData<Unidade>(response) || (response as Unidade);

      if (unidadeEncontrada) {
        setUnidade(unidadeEncontrada);
        return unidadeEncontrada;
      } else {
        toast({
          title: "Erro",
          description: "Unidade não encontrada",
          variant: "destructive",
        });
        navigate("/unidades");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar unidade",
        variant: "destructive",
      });
    }
    return null;
  }, [id, navigate, toast]);

  const carregarParametros = useCallback(async () => {
    if (!id) return;
    try {
      const response = await parametrosApi.listarPorUnidade(id);
      // O endpoint pode retornar { data: {...} } ou um array [] quando não há parâmetros
      const unwrapped = unwrapData<any>(response);
      let parametrosData: Parametros | null = null;

      if (!unwrapped) {
        // resposta vazia
        parametrosData = null;
      } else if (Array.isArray(unwrapped)) {
        // backend pode retornar lista — pega o primeiro ou null
        parametrosData =
          unwrapped.length > 0 ? (unwrapped[0] as Parametros) : null;
      } else if (typeof unwrapped === "object") {
        parametrosData = unwrapped as Parametros;
      }

      console.log("Parâmetros carregados (processados):", parametrosData);
      if (parametrosData) {
        setParametros(parametrosData);

        // Atualizar apenas os campos que queremos persistir
        setDimensionamento((prev) => ({
          ...prev,
          nomeEnfermeiro:
            parametrosData?.nome_enfermeiro ?? prev.nomeEnfermeiro,
          numeroCoren: parametrosData?.numero_coren ?? prev.numeroCoren,
          indiceTecnico: parametrosData?.ist ?? prev.indiceTecnico,
          diasSemana: parametrosData?.diasSemana ?? prev.diasSemana,
          idadeEquipeRestricoes:
            parametrosData.aplicarIST === true
              ? "sim"
              : parametrosData.aplicarIST === false
              ? "nao"
              : prev.idadeEquipeRestricoes,
        }));
        // Após aplicar os parâmetros, se os campos obrigatórios existirem,
        // dispara o cálculo automaticamente para exibir os resultados.
        setTimeout(() => {
          if (validarCamposObrigatorios()) {
            calcularDimensionamento();
          }
        }, 10);
      } else {
        // sem parâmetros para esta unidade
        setParametros(null);
      }
    } catch (error) {
      console.log("Parâmetros não encontrados - será necessário criar", error);
      setParametros(null);
    }
  }, [id]);

  const carregarLeitos = useCallback(async () => {
    try {
      const response = await leitosApi.listar(id);
      const list = normalizeList<Leito>(response);
      setLeitos(
        list.map((l) => {
          const rl = l as Leito & Record<string, unknown>;
          const status = String(rl["status"] || "");
          return {
            id: rl.id,
            numero: rl.numero,
            unidadeId: rl.unidadeId,
            created_at: rl.created_at,
            internacao: rl.internacao,
            justificativa: rl.justificativa,
            status: rl.status,
            ocupado: ["ATIVO", "PENDENTE"].includes(status.toUpperCase()),
          } as Leito;
        })
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
  }, [id, toast]);

  const carregarSessoesAtivas = useCallback(async () => {
    if (!id) return;
    try {
      const response = await avaliacoesSessaoApi.listarAtivas(id);
      const list = Array.isArray(response)
        ? response
        : (response as any)?.data || [];
      // Evita flicker: só atualiza estado se houver mudança relevante
      setSessoesAtivas((prev) => {
        if (prev.length !== list.length) return list;
        const changed = prev.some((p: any) => {
          const novo = list.find((n: any) => n.id === p.id);
          if (!novo) return true;
          return (
            (p.expiresAt || "") !== (novo.expiresAt || "") ||
            (p.statusSessao || "") !== (novo.statusSessao || "") ||
            (p?.leito?.id || p.leitoId) !== (novo?.leito?.id || novo.leitoId)
          );
        });
        return changed ? list : prev; // mantém referência se nada mudou
      });
    } catch (error) {
      console.error("Erro ao carregar sessões ativas", error);
    }
  }, [id]);

  // Função para carregar estatísticas consolidadas
  const carregarEstatisticasConsolidadas = useCallback(async () => {
    if (!id) return;

    try {
      const response = await unidadesApi.estatisticasConsolidadas(id);
      const dados = unwrapData(response) || (response as any)?.data;
      setEstatisticasConsolidadas(dados);
      // Debug: mostrar valores de ocupação recebidos do backend
      console.log("debug: estatisticasConsolidadas recebidas", {
        taxaOcupacaoMedia: dados?.ocupacao?.taxaOcupacaoMedia,
        taxaOcupacaoMaxima: dados?.ocupacao?.taxaOcupacaoMaxima,
        totalLeitosMes: dados?.ocupacao?.totalLeitosMes,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas consolidadas:", error);
      // Silencioso para não sobrecarregar o usuário se o endpoint não estiver implementado
    }
  }, [id]);

  // Função para buscar histórico mensal
  const buscarHistoricoMensal = async () => {
    if (!dataInicial || !dataFinal) {
      toast({
        title: "Erro",
        description: "Informe as datas inicial e final",
        variant: "destructive",
      });
      return;
    }

    setLoadingHistorico(true);
    try {
      const response = await unidadesApi.historicoMensal(
        id!,
        dataInicial,
        dataFinal
      );
      const dados = unwrapData(response) || (response as any)?.data || [];
      setHistoricoMensal(dados);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico mensal",
        variant: "destructive",
      });
    } finally {
      setLoadingHistorico(false);
    }
  };

  // Função para baixar relatório consolidado mensal em PDF
  const baixarRelatorioConsolidado = async () => {
    if (!dataInicial || !dataFinal) {
      toast({
        title: "Erro",
        description: "Informe as datas inicial e final",
        variant: "destructive",
      });
      return;
    }

    if (!id) {
      toast({
        title: "Erro",
        description: "ID da unidade não encontrado",
        variant: "destructive",
      });
      return;
    }

    setLoadingHistorico(true);
    try {
      await unidadesApi.relatorioConsolidadoMensal(id, dataInicial, dataFinal);

      toast({
        title: "Sucesso",
        description: "Download do relatório consolidado iniciado",
      });
    } catch (error) {
      console.error("Erro ao baixar relatório consolidado:", error);
      toast({
        title: "Erro",
        description:
          "Erro ao baixar relatório consolidado. Verifique se o backend implementou a rota '/unidades/{id}/relatorio-consolidado-mensal'",
        variant: "destructive",
      });
    } finally {
      setLoadingHistorico(false);
    }
  };

  // Função para salvar dimensionamento
  const salvarDimensionamento = async (resultadosParaSalvar = null) => {
    if (!id) {
      toast({
        title: "Erro",
        description: "ID da unidade não encontrado",
        variant: "destructive",
      });
      return;
    }

    const resultados = resultadosParaSalvar || resultadosCalculados;

    setSalvandoDimensionamento(true);
    try {
      const payload = {
        nomeEnfermeiro: dimensionamento.nomeEnfermeiro,
        numeroCoren: dimensionamento.numeroCoren,
        enfermeiroCargoHorario: dimensionamento.enfermeiro.cargoHorario,
        enfermeiroPercentualEquipe: dimensionamento.enfermeiro.percentualEquipe,
        tecnicoEnfermagemCargoHorario:
          dimensionamento.tecnicoEnfermagem.cargoHorario,
        tecnicoEnfermagemPercentualEquipe:
          dimensionamento.tecnicoEnfermagem.percentualEquipe,
        indiceTecnico: dimensionamento.indiceTecnico,
        idadeEquipeRestricoes: dimensionamento.idadeEquipeRestricoes,
        quantidadeLeitos: dimensionamento.quantidadeLeitos,
        taxaOcupacao: dimensionamento.taxaOcupacao,
        pcm: dimensionamento.pcm,
        pci: dimensionamento.pci,
        pcad: dimensionamento.pcad,
        pcsi: dimensionamento.pcsi,
        pcit: dimensionamento.pcit,
        constanteMarinhoEnfermeiro: dimensionamento.constanteMarinho.enfermeiro,
        constanteMarinhoTecnico:
          dimensionamento.constanteMarinho.tecnicoEnfermagem,
        diasSemana: dimensionamento.diasSemana,
        // Resultados calculados
        totalHorasEnfermagem: resultados.the,
        quadroPessoalTotal: resultados.qp,
        quadroPessoalEnfermeiro: resultados.qpEnfermeiro,
        quadroPessoalTecnico: resultados.qpTecnico,
      };

      const response = await unidadesApi.salvarDimensionamento(id, payload);

      // Capturar o ID do dimensionamento salvo
      if (response && (response as any).id) {
        setDimensionamentoId((response as any).id);
      }

      toast({
        title: "Sucesso",
        description: "Dimensionamento salvo com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar dimensionamento",
        variant: "destructive",
      });
    } finally {
      setSalvandoDimensionamento(false);
    }
  };

  // Salva apenas os parâmetros pequenos desejados e dispara o cálculo
  const salvarParametros = async () => {
    if (!id) {
      toast({
        title: "Erro",
        description: "ID da unidade não encontrado",
        variant: "destructive",
      });
      return;
    }

    // aplicarIST is stored in the form as idadeEquipeRestricoes ('sim'|'nao')
    const aplicarISTBoolean =
      dimensionamento.idadeEquipeRestricoes === "sim"
        ? true
        : dimensionamento.idadeEquipeRestricoes === "nao"
        ? false
        : undefined;

    const payload = {
      nome_enfermeiro: dimensionamento.nomeEnfermeiro,
      numero_coren: dimensionamento.numeroCoren,
      aplicarIST: aplicarISTBoolean,
      // IST is represented in the UI as indiceTecnico (%)
      ist:
        typeof dimensionamento.indiceTecnico === "number"
          ? dimensionamento.indiceTecnico
          : undefined,
      diasSemana: dimensionamento.diasSemana,
    };

    try {
      setSalvandoDimensionamento(true);
      const res = await parametrosApi.criar(id, payload as any);
      const saved = unwrapData(res) || (res as any);
      setParametros(saved as Parametros);
      toast({ title: "Sucesso", description: "Parâmetros salvos" });
      // Atualiza o estado do formulário com os valores salvos
      setDimensionamento((prev) => ({
        ...prev,
        nomeEnfermeiro: (saved as any)?.nome_enfermeiro ?? prev.nomeEnfermeiro,
        numeroCoren: (saved as any)?.numero_coren ?? prev.numeroCoren,
        diasSemana: (saved as any)?.diasSemana ?? prev.diasSemana,
        indiceTecnico: (saved as any).ist ?? prev.indiceTecnico,
        idadeEquipeRestricoes:
          (saved as any).aplicarIST === true
            ? "sim"
            : (saved as any).aplicarIST === false
            ? "nao"
            : prev.idadeEquipeRestricoes,
      }));

      // anteriormente disparávamos o cálculo automaticamente aqui;
      // agora teremos um botão separado para 'Calcular Dimensionamento'
      // que fica habilitado somente quando parâmetros existem.
    } catch (err) {
      console.error("Erro ao salvar parâmetros:", err);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os parâmetros",
        variant: "destructive",
      });
    } finally {
      setSalvandoDimensionamento(false);
    }
  };

  // Função para baixar PDF do dimensionamento
  const baixarDimensionamentoPdf = async () => {
    if (!id) {
      toast({
        title: "Erro",
        description: "ID da unidade não encontrado",
        variant: "destructive",
      });
      return;
    }

    if (!dimensionamentoCalculado || !dimensionamentoId) {
      toast({
        title: "Atenção",
        description: "Calcule e salve o dimensionamento antes de baixar o PDF",
        variant: "destructive",
      });
      return;
    }

    try {
      await unidadesApi.baixarDimensionamentoPdf(id, dimensionamentoId);

      toast({
        title: "Sucesso",
        description: "Download do PDF do dimensionamento iniciado",
      });
    } catch (error) {
      console.error("Erro ao baixar PDF do dimensionamento:", error);
      toast({
        title: "Erro",
        description:
          "Erro ao baixar PDF do dimensionamento. Verifique se o dimensionamento foi salvo corretamente.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      await carregarUnidade();
      await carregarParametros();
      await carregarLeitos();
      await carregarSessoesAtivas();
      await carregarEstatisticasConsolidadas();
    })();
  }, [
    id,
    carregarUnidade,
    carregarParametros,
    carregarLeitos,
    carregarSessoesAtivas,
    carregarEstatisticasConsolidadas,
  ]);

  // Polling leve para manter ocupação/sessões atualizadas (a cada 30s)
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      carregarSessoesAtivas();
    }, 30000);
    return () => clearInterval(interval);
  }, [id, carregarSessoesAtivas]);

  // NOTE: countdowns removed — server handles session expiry and provides statusSessao.

  const handleDelete = async (leitoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este leito?")) return;

    try {
      await leitosApi.excluir(leitoId);
      toast({
        title: "Sucesso",
        description: "Leito excluído com sucesso",
      });
      await carregarLeitos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir leito",
        variant: "destructive",
      });
    }
  };

  // Atualiza status das internações (preserva "em_andamento")
  // Atualização periódica futura: se houver endpoint histórico por leito
  useEffect(() => {
    // placeholder para futuras atualizações automáticas
  }, []);

  const handleOpenInternacaoDetails = (leito: any) => {
    // armazenamos somente contexto mínimo necessário para o modal
    const simulatedInternacao = {
      id: `leito-${leito.id}`,
      leitoId: leito.id,
      leitoNome: leito.numero,
      unidadeId: leito.unidadeId || id,
      leitoCompleto: leito, // passar o objeto leito completo
    } as Internacao;
    setSelectedInternacao(simulatedInternacao);
    setInternacaoDetailsOpen(true);
  };

  // Marcar "em_andamento" ao iniciar o questionário
  const handleNovaAvaliacao = (leitoId: string) => {
    setAvaliacaoStatusMap((prev) => ({
      ...prev,
      [leitoId]: "em_andamento",
    }));
  };

  // Marcar "concluida" após salvar (chamado pelo modal)
  const handleAvaliacaoConcluida = (leitoId: string) => {
    setAvaliacaoStatusMap((prev) => ({
      ...prev,
      [leitoId]: "concluida",
    }));
  };

  // Sessão criada recém (retorno imediato do modal) -> inserir/atualizar lista para refletir countdown sem esperar polling
  const handleSessaoCriada = (sessao: any) => {
    if (!sessao) return;
    setSessoesAtivas((prev) => {
      const existsIndex = prev.findIndex(
        (s: any) =>
          (s?.leito?.id || s.leitoId) === (sessao?.leito?.id || sessao.leitoId)
      );
      if (existsIndex === -1) return [...prev, sessao];
      const cloned = [...prev];
      cloned[existsIndex] = { ...prev[existsIndex], ...sessao };
      return cloned;
    });
  };

  const filteredLeitos = leitos.filter((leito) =>
    leito.numero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Conjunto de leitoIds ocupados por sessão ativa
  const leitoIdsOcupadosPorSessao = new Set(
    sessoesAtivas
      .map((s: any) => s?.leito?.id || s?.leitoId)
      .filter((v: any) => typeof v === "string" && v.length > 0)
  );

  // Estatísticas detalhadas por status
  const leitosAtivos = leitos.filter(
    (l) => String(l.status || "").toUpperCase() === "ATIVO"
  );
  const leitosVagos = leitos.filter(
    (l) => String(l.status || "").toUpperCase() === "VAGO"
  );
  const leitosPendentes = leitos.filter(
    (l) => String(l.status || "").toUpperCase() === "PENDENTE"
  );
  const leitosInativos = leitos.filter(
    (l) => String(l.status || "").toUpperCase() === "INATIVO"
  );

  // Distribuição por classe/status
  const distribuicaoPorClasse = {
    ativo: leitosAtivos.length,
    vago: leitosVagos.length,
    pendente: leitosPendentes.length,
    inativo: leitosInativos.length,
  };

  // Distribuição por classificação de avaliação
  const avaliacoesConcluidas = Object.values(avaliacaoStatusMap).filter(
    (s) => s === "concluida"
  ).length;
  const avaliacoesEmAndamento = Object.values(avaliacaoStatusMap).filter(
    (s) => s === "em_andamento"
  ).length;
  const avaliacoesNaoRealizadas = Object.values(avaliacaoStatusMap).filter(
    (s) => s === "nao_realizada"
  ).length;

  // Leitos com sessões ativas (independente do status de avaliação)
  const leitosComSessaoAtiva = sessoesAtivas.length;

  // Leitos sem avaliação recente (não estão no mapa de status nem têm sessão ativa)
  const leitosSemAvaliacaoRecente = leitos.filter(
    (l) =>
      !avaliacaoStatusMap[l.id] &&
      !sessoesAtivas.some((s) => (s?.leito?.id || s?.leitoId) === l.id)
  ).length;

  const distribuicaoAvaliacoes = {
    concluidas: avaliacoesConcluidas,
    emAndamento: avaliacoesEmAndamento,
    naoRealizadas: avaliacoesNaoRealizadas,
    comSessaoAtiva: leitosComSessaoAtiva,
    semAvaliacaoRecente: leitosSemAvaliacaoRecente,
  };

  // Estado para estatísticas consolidadas do backend
  const [estatisticasConsolidadas, setEstatisticasConsolidadas] = useState<{
    leitosStatus: {
      total: number;
      ativo: number;
      vago: number;
      pendente: number;
      inativo: number;
    };
    ocupacao: {
      leitosOperacionaisMes: string;
      totalLeitosMes: string;
      leitosOcupadosMes: string;
      ocupados: number;
      taxaOcupacao: number;
      taxaOcupacaoMedia?: number;
      taxaOcupacaoMaxima?: number;
    };
    distribuicaoSCP: {
      MINIMOS: number;
      INTERMEDIARIOS: number;
      ALTA_DEPENDENCIA: number;
      SEMI_INTENSIVOS: number;
      INTENSIVOS: number;
    };
  } | null>(null);

  const leitosOcupadosCount = leitoIdsOcupadosPorSessao.size;

  // Cobertura: leitos com sessão ativa (ou avaliação em andamento) considerados válidos (<24h)
  const coberturaLeitosCount = new Set([
    ...Array.from(leitoIdsOcupadosPorSessao),
    ...Object.entries(avaliacaoStatusMap)
      .filter(([_, status]) => status === "em_andamento")
      .map(([leitoId]) => leitoId),
  ]).size;
  const coberturaPercent = leitos.length
    ? Math.round((coberturaLeitosCount / leitos.length) * 100)
    : 0;

  // Ensure dimensionamento fields update when unidade, leitos or consolidated stats change
  useEffect(() => {
    if (!unidade) return;

    // Helper to parse carga_horaria like "36" or "36h" or "36.0"
    const parseCarga = (v: any) => {
      if (!v) return 36;
      const s = String(v);
      const m = s.match(/\d+/);
      return m ? Number(m[0]) : 36;
    };

    const enferCargo = unidade.cargos_unidade?.find((c) =>
      String(c?.cargo?.nome || "")
        .toLowerCase()
        .includes("enfermeiro")
    );
    const tecnicoCargo = unidade.cargos_unidade?.find(
      (c) =>
        String(c?.cargo?.nome || "")
          .toLowerCase()
          .includes("técnico") ||
        String(c?.cargo?.nome || "")
          .toLowerCase()
          .includes("tecnico")
    );

    const enferCarga = parseCarga(enferCargo?.cargo?.carga_horaria);
    const tecnicoCarga = parseCarga(tecnicoCargo?.cargo?.carga_horaria);

    const totalLeitosFromStats = Number(
      estatisticasConsolidadas?.ocupacao?.totalLeitosMes ?? NaN
    );

    setDimensionamento((prev) => ({
      ...prev,
      // prefer consolidated totalLeitos, fallback to unidade.numeroLeitos or leitos.length
      quantidadeLeitos:
        !Number.isNaN(totalLeitosFromStats) && totalLeitosFromStats > 0
          ? totalLeitosFromStats
          : unidade.numeroLeitos || leitos.length || prev.quantidadeLeitos,
      // prefer monthly average occupancy (taxaOcupacaoMedia)
      taxaOcupacao:
        estatisticasConsolidadas?.ocupacao?.taxaOcupacaoMedia ??
        prev.taxaOcupacao,
      enfermeiro: {
        ...prev.enfermeiro,
        cargoHorario: enferCarga,
      },
      tecnicoEnfermagem: {
        ...prev.tecnicoEnfermagem,
        cargoHorario: tecnicoCarga,
      },
      // Reuse monthly distribution for patient types if available
      pcm: estatisticasConsolidadas?.distribuicaoSCP?.MINIMOS ?? prev.pcm,
      pci:
        estatisticasConsolidadas?.distribuicaoSCP?.INTERMEDIARIOS ?? prev.pci,
      pcad:
        estatisticasConsolidadas?.distribuicaoSCP?.ALTA_DEPENDENCIA ??
        prev.pcad,
      pcsi:
        estatisticasConsolidadas?.distribuicaoSCP?.SEMI_INTENSIVOS ?? prev.pcsi,
      pcit: estatisticasConsolidadas?.distribuicaoSCP?.INTENSIVOS ?? prev.pcit,
    }));
  }, [unidade, estatisticasConsolidadas, leitos]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!unidade) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Unidade não encontrada</p>
        </div>
      </DashboardLayout>
    );
  }

  const goBack = () => {
    const hospitalId = unidade?.hospitalId || unidade?.hospital?.id;
    if (hospitalId) {
      navigate(`/hospitais/${hospitalId}`);
    } else {
      // fallback to hospitals list when we don't have a valid hospital id
      navigate(`/hospitais`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{unidade.nome}</h1>
              <p className="text-muted-foreground">
                Gestão completa da unidade
              </p>
            </div>
          </div>

          <div className="flex space-x-2"></div>
        </div>

        {/* Informações da Unidade */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Nome</Label>
                <p className="text-sm text-muted-foreground">{unidade.nome}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Número de Leitos</Label>
                <p className="text-sm text-muted-foreground">{leitos.length}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Método SCP</Label>
                <p className="text-sm text-muted-foreground">
                  {unidade.scpMetodoKey}
                </p>
              </div>

              {unidade.hospital && (
                <div>
                  <Label className="text-sm font-medium">Hospital</Label>
                  <p className="text-sm text-muted-foreground">
                    {unidade.hospital.nome}
                  </p>
                </div>
              )}
              {unidade.cargos_unidade && unidade.cargos_unidade.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">
                    Total de Funcionários
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {unidade.cargos_unidade.reduce(
                      (sum, c) => sum + (c.quantidade_funcionarios || 0),
                      0
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Seção de Horas Extras e Cargos */}
            {(unidade.horas_extra_reais ||
              unidade.horas_extra_projetadas ||
              (unidade.cargos_unidade &&
                unidade.cargos_unidade.length > 0)) && (
              <div className="mt-6 border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Horas Extras */}
                  {(unidade.horas_extra_reais ||
                    unidade.horas_extra_projetadas) && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Horas Extras
                      </Label>
                      <div className="space-y-2">
                        {unidade.horas_extra_reais && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Valor (R$):
                            </span>
                            <span className="font-medium">
                              R$ {unidade.horas_extra_reais}
                            </span>
                          </div>
                        )}
                        {unidade.horas_extra_projetadas && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Projetadas:
                            </span>
                            <span className="font-medium">
                              {unidade.horas_extra_projetadas}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Funcionários por Cargo */}
                  {unidade.cargos_unidade &&
                    unidade.cargos_unidade.length > 0 && (
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium mb-2 block">
                          Funcionários por Cargo
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {unidade.cargos_unidade.map((cargoUnidade, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {cargoUnidade.cargo?.nome ||
                                    "Cargo não encontrado"}
                                </p>
                                {cargoUnidade.cargo?.salario && (
                                  <p className="text-xs text-muted-foreground">
                                    Salário: R$ {cargoUnidade.cargo.salario}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">
                                  {cargoUnidade.quantidade_funcionarios}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  funcionários
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs para navegação */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leitos">
              <Bed className="h-4 w-4 mr-2" />
              Leitos
            </TabsTrigger>
            <TabsTrigger value="estatisticas">
              <MapPin className="h-4 w-4 mr-2" />
              Dados Mensais
            </TabsTrigger>
            <TabsTrigger value="dimensionamento">
              <User className="h-4 w-4 mr-2" />
              Dimensionamento
            </TabsTrigger>
            <TabsTrigger value="dias-gerados">
              <Activity className="h-4 w-4 mr-2" />
              Dias Gerados
            </TabsTrigger>
          </TabsList>

          {/* Tab Leitos */}
          <TabsContent value="leitos" className="space-y-4">
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
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredLeitos
                .slice()
                .sort((a, b) =>
                  a.numero.localeCompare(b.numero, undefined, { numeric: true })
                )
                .map((leito) => {
                  const sessaoAtiva = sessoesAtivas.find(
                    (s: any) => (s?.leito?.id || s?.leitoId) === leito.id
                  );
                  const avaliacaoStatusMapValue = avaliacaoStatusMap[leito.id];

                  const {
                    badgeVariant,
                    badgeLabel,
                    badgeIcon,
                    badgeClassName,
                  } = getLeitoBadge(leito);

                  return (
                    <Card
                      key={leito.id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
                      onClick={() => handleOpenInternacaoDetails(leito)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            <span>Leito {leito.numero}</span>
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
                            {/* countdowns removed; server controls expiry */}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Bed className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">
                            Leito {leito.numero}
                          </span>
                        </div>

                        {/* Mostrar nome do colaborador quando avaliado */}
                        {sessaoAtiva && sessaoAtiva.autor && (
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>Avaliado por: {sessaoAtiva.autor.nome}</span>
                          </div>
                        )}

                        <div className="py-4 text-center">
                          <span className="text-muted-foreground text-xs">
                            {avaliacaoStatusMapValue === "em_andamento"
                              ? "Avaliação em andamento"
                              : sessaoAtiva
                              ? (sessaoAtiva.statusSessao || "") === "EXPIRADA"
                                ? "Sessão expirada"
                                : "Sessão ativa"
                              : "Clique para iniciar avaliação"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
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
                    Comece criando o primeiro leito desta unidade
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Estatísticas */}
          <TabsContent value="estatisticas" className="space-y-4">
            {/* Distribuição por Classificação SCP */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Distribuição por Classificação SCP Mensal{" "}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribuição das avaliações por classificação do método SCP
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold">
                      {estatisticasConsolidadas?.distribuicaoSCP?.MINIMOS || 0}
                    </div>
                    <p className="text-sm font-medium">Mínimos</p>
                    <p className="text-xs text-muted-foreground">
                      Cuidados básicos
                    </p>
                  </div>

                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold">
                      {estatisticasConsolidadas?.distribuicaoSCP
                        ?.INTERMEDIARIOS || 0}
                    </div>
                    <p className="text-sm font-medium">Intermediários</p>
                    <p className="text-xs text-muted-foreground">
                      Cuidados moderados
                    </p>
                  </div>

                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold">
                      {estatisticasConsolidadas?.distribuicaoSCP
                        ?.ALTA_DEPENDENCIA || 0}
                    </div>
                    <p className="text-sm font-medium">Alta Dependência</p>
                    <p className="text-xs text-muted-foreground">
                      Cuidados complexos
                    </p>
                  </div>

                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold">
                      {estatisticasConsolidadas?.distribuicaoSCP
                        ?.SEMI_INTENSIVOS || 0}
                    </div>
                    <p className="text-sm font-medium">Semi-Intensivos</p>
                    <p className="text-xs text-muted-foreground">
                      Monitoramento contínuo
                    </p>
                  </div>

                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold">
                      {estatisticasConsolidadas?.distribuicaoSCP?.INTENSIVOS ||
                        0}
                    </div>
                    <p className="text-sm font-medium">Intensivos</p>
                    <p className="text-xs text-muted-foreground">
                      Cuidados intensivos
                    </p>
                  </div>
                </div>

                {/* Resumo total */}
                <div className="mt-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Total de Avaliações :
                    </span>
                    <span className="text-lg font-bold">
                      {estatisticasConsolidadas?.distribuicaoSCP
                        ? Object.values(
                            estatisticasConsolidadas.distribuicaoSCP
                          ).reduce((a, b) => a + (Number(b) || 0), 0)
                        : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Taxa de Ocupação Mensal */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Ocupação Mensal</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Evolução da ocupação dos leitos ao longo do mês
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="text-center p-4 rounded-lg border">
                    <div className="text-2xl font-bold">
                      {estatisticasConsolidadas?.ocupacao?.taxaOcupacaoMedia ||
                        "0"}
                      %
                    </div>
                    <p className="text-sm font-medium">Taxa Média Mensal</p>
                    <p className="text-xs text-muted-foreground">
                      Média de ocupação do mês atual
                    </p>
                  </div>
                </div>

                {/* Resumo de leitos */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Total de Leitos:
                      </span>
                      <span className="text-lg font-bold">
                        {estatisticasConsolidadas?.ocupacao?.totalLeitosMes ??
                          "-"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Leitos Ocupados:
                      </span>
                      <span className="text-lg font-bold">
                        {estatisticasConsolidadas?.ocupacao
                          ?.leitosOcupadosMes ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Histórico Mensal */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico Mensal de Ocupação</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Consulte dados históricos de ocupação e classificação SCP por
                  período
                </p>
              </CardHeader>
              <CardContent>
                {/* Filtros de Data */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div>
                    <Label htmlFor="dataInicial">Data Inicial</Label>
                    <Input
                      id="dataInicial"
                      type="month"
                      value={dataInicial}
                      onChange={(e) => setDataInicial(e.target.value)}
                      placeholder="Selecione o mês inicial"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataFinal">Data Final</Label>
                    <Input
                      id="dataFinal"
                      type="month"
                      value={dataFinal}
                      onChange={(e) => setDataFinal(e.target.value)}
                      placeholder="Selecione o mês final"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={buscarHistoricoMensal}
                      disabled={loadingHistorico}
                      className="w-full"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {loadingHistorico ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={baixarRelatorioConsolidado}
                      disabled={!dataInicial || !dataFinal || loadingHistorico}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  </div>
                  <div className="flex items-end">
                    {historicoMensal.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {historicoMensal.length} meses encontrados
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabela de Histórico */}
                {historicoMensal.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">
                            Mês/Ano
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Cuidados Mínimos
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Cuidados Intermediários
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Cuidados Alta Dependência
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Cuidados Semi-Intensivos
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Cuidados Intensivos
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Soma dos Leitos
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Nº de Leitos Operacionais
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Percentual de Ocupação
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoMensal.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">
                              {item.mesAno || `${item.mes}/${item.ano}`}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {item.cuidadosMinimos || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {item.cuidadosIntermediarios || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {item.cuidadosAltaDependencia || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {item.cuidadosSemiIntensivos || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {item.cuidadosIntensivos || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {item.somaLeitos || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {item.leitosOperacionais || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {item.percentualOcupacao || 0}%
                            </td>
                          </tr>
                        ))}

                        {/* Linha de Média */}
                        <tr className="bg-gray-50 font-bold">
                          <td className="border border-gray-300 px-4 py-2 font-bold">
                            Média nº leitos
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {historicoMensal.length > 0
                              ? Math.round(
                                  historicoMensal.reduce(
                                    (sum, item) =>
                                      sum + (item.cuidadosMinimos || 0),
                                    0
                                  ) / historicoMensal.length
                                )
                              : 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {historicoMensal.length > 0
                              ? Math.round(
                                  historicoMensal.reduce(
                                    (sum, item) =>
                                      sum + (item.cuidadosIntermediarios || 0),
                                    0
                                  ) / historicoMensal.length
                                )
                              : 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {historicoMensal.length > 0
                              ? Math.round(
                                  historicoMensal.reduce(
                                    (sum, item) =>
                                      sum + (item.cuidadosAltaDependencia || 0),
                                    0
                                  ) / historicoMensal.length
                                )
                              : 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {historicoMensal.length > 0
                              ? Math.round(
                                  historicoMensal.reduce(
                                    (sum, item) =>
                                      sum + (item.cuidadosSemiIntensivos || 0),
                                    0
                                  ) / historicoMensal.length
                                )
                              : 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {historicoMensal.length > 0
                              ? Math.round(
                                  historicoMensal.reduce(
                                    (sum, item) =>
                                      sum + (item.cuidadosIntensivos || 0),
                                    0
                                  ) / historicoMensal.length
                                )
                              : 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {historicoMensal.length > 0
                              ? Math.round(
                                  historicoMensal.reduce(
                                    (sum, item) => sum + (item.somaLeitos || 0),
                                    0
                                  ) / historicoMensal.length
                                )
                              : 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {historicoMensal.length > 0
                              ? Math.round(
                                  historicoMensal.reduce(
                                    (sum, item) =>
                                      sum + (item.leitosOperacionais || 0),
                                    0
                                  ) / historicoMensal.length
                                )
                              : 0}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {historicoMensal.length > 0
                              ? Math.round(
                                  historicoMensal.reduce(
                                    (sum, item) =>
                                      sum + (item.percentualOcupacao || 0),
                                    0
                                  ) / historicoMensal.length
                                )
                              : 0}
                            %
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Mensagem quando não há dados */}
                {historicoMensal.length === 0 &&
                  dataInicial &&
                  dataFinal &&
                  !loadingHistorico && (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Nenhum dado encontrado
                      </h3>
                      <p className="text-muted-foreground">
                        Não foram encontrados dados para o período selecionado
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Dimensionamento */}
          <TabsContent value="dimensionamento" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dimensionamento de Enfermagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(() => {
                  return (
                    <>
                      {/* Informações do Enfermeiro Responsável */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label className="text-sm font-medium text-gray-700">
                            Enfermeiro(a) Responsável: *
                          </Label>
                          <Input
                            value={dimensionamento.nomeEnfermeiro}
                            onChange={(e) =>
                              setDimensionamento((prev) => ({
                                ...prev,
                                nomeEnfermeiro: e.target.value,
                              }))
                            }
                            placeholder="Nome do enfermeiro"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">
                            Nº Coren: *
                          </Label>
                          <Input
                            value={dimensionamento.numeroCoren}
                            onChange={(e) =>
                              setDimensionamento((prev) => ({
                                ...prev,
                                numeroCoren: e.target.value,
                              }))
                            }
                            placeholder="Número do COREN"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700">
                            Unidade/Setor:
                          </Label>
                          <Input
                            value={unidade?.nome || ""}
                            className="mt-1"
                            readOnly
                          />
                        </div>
                      </div>

                      {/* Dados da Equipe de Enfermagem */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Dados da Equipe de Enfermagem
                        </h3>

                        {/* Índice de Segurança Técnica */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              Índice de Segurança Técnica *
                            </Label>
                            <div className="mt-1 relative">
                              <Input
                                type="text"
                                value={dimensionamento.indiceTecnico}
                                onChange={(e) =>
                                  setDimensionamento((prev) => ({
                                    ...prev,
                                    indiceTecnico: Number(e.target.value) || 0,
                                  }))
                                }
                                className="text-center pr-6"
                                placeholder="15"
                              />
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500">
                                %
                              </span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              Equipe de enfermagem é composta em sua maioria de
                              pessoas com idade superior a 50 anos, ou 20% da
                              equipe com restrições? *
                            </Label>
                            <div className="mt-1">
                              <Select
                                value={dimensionamento.idadeEquipeRestricoes}
                                onValueChange={(value) =>
                                  setDimensionamento((prev) => ({
                                    ...prev,
                                    idadeEquipeRestricoes: value,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sim">SIM</SelectItem>
                                  <SelectItem value="nao">NÃO</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Constantes do Sistema */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-800">
                            Constantes do Sistema
                          </h3>

                          {/* Dias da Semana */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700">
                                Dias da Semana (DS) *
                              </Label>
                              <div className="mt-1">
                                <Input
                                  type="text"
                                  value={dimensionamento.diasSemana}
                                  onChange={(e) =>
                                    setDimensionamento((prev) => ({
                                      ...prev,
                                      diasSemana: Number(e.target.value) || 7,
                                    }))
                                  }
                                  className="text-center"
                                  placeholder="7"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botão de Calcular e Salvar */}
                      <div className="mt-6 flex justify-end gap-3">
                        <Button
                          onClick={salvarParametros}
                          disabled={
                            salvandoDimensionamento ||
                            !validarCamposObrigatorios()
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {salvandoDimensionamento
                            ? "Salvando..."
                            : "Salvar Parâmetros"}
                        </Button>

                        <Button
                          onClick={calcularDimensionamento}
                          disabled={!parametros || salvandoDimensionamento}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Calcular Dimensionamento
                        </Button>

                        {/* Botão de Download PDF */}
                        {dimensionamentoCalculado && dimensionamentoId && (
                          <Button
                            onClick={baixarDimensionamentoPdf}
                            variant="outline"
                            className="px-6 py-2"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar PDF
                          </Button>
                        )}
                      </div>

                      {/* Tabela de Análise Financeira e de Pessoal */}
                      {dimensionamentoCalculado &&
                        unidade.cargos_unidade &&
                        unidade.cargos_unidade.length > 0 && (
                          <div className="mt-8">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                              Análise Financeira e de Pessoal
                            </h3>

                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Salário Médio (R$)</TableHead>
                                    <TableHead>
                                      Adicionais/Tributos (R$)
                                    </TableHead>
                                    <TableHead>
                                      Custo Total por Funcionário (R$)
                                    </TableHead>
                                    <TableHead>
                                      Atual (Nº de Profissionais)
                                    </TableHead>
                                    <TableHead>
                                      Custo Total Atual (R$)
                                    </TableHead>
                                    <TableHead>
                                      Calculado SCP (Qtd. Profissionais)
                                    </TableHead>
                                    <TableHead>
                                      Custo Total Calculado (R$)
                                    </TableHead>
                                    <TableHead>
                                      Variação (Real - Calculado SCP)
                                    </TableHead>
                                    <TableHead>Variação (%)</TableHead>
                                    <TableHead>
                                      Variação de Profissionais
                                    </TableHead>
                                    <TableHead>Horas Reais (Atual)</TableHead>
                                    <TableHead>Horas Calculadas SCP</TableHead>
                                    <TableHead>
                                      Variação Horas (Calc. - Real)
                                    </TableHead>
                                    <TableHead>
                                      Horas Extras Projetadas
                                    </TableHead>
                                    <TableHead>
                                      Valor Horas Extras (R$)
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {calcularAnaliseFinanceira().map(
                                    (linha, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{linha.cargo}</TableCell>
                                        <TableCell>
                                          R${" "}
                                          {linha.salario.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          R${" "}
                                          {linha.adicionais.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          R${" "}
                                          {linha.custoTotalPorFuncionario.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {linha.quantidadeAtual}
                                        </TableCell>
                                        <TableCell>
                                          R${" "}
                                          {linha.custoTotalAtual.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {linha.isScpCargo ? (
                                            // Para cargos SCP, mostrar valor calculado automaticamente
                                            <span>
                                              {linha.quantidadeCalculada}
                                            </span>
                                          ) : (
                                            // Para cargos não-SCP, mostrar input editável
                                            <Input
                                              type="number"
                                              min="0"
                                              value={linha.quantidadeCalculada}
                                              onChange={(e) => {
                                                const novaQuantidade =
                                                  parseInt(e.target.value) || 0;
                                                atualizarQuantidadeEditavel(
                                                  linha.cargoId,
                                                  novaQuantidade
                                                );
                                              }}
                                              className="w-20 mx-auto text-center text-sm"
                                              placeholder="0"
                                            />
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          R${" "}
                                          {linha.custoTotalCalculado.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          R${" "}
                                          {linha.variacaoCusto.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                              signDisplay: "always",
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {linha.variacaoPercentual > 0
                                            ? "+"
                                            : ""}
                                          {linha.variacaoPercentual}%
                                        </TableCell>
                                        <TableCell>
                                          {linha.variacaoQuantidade > 0
                                            ? "+"
                                            : ""}
                                          {linha.variacaoQuantidade}
                                        </TableCell>
                                        <TableCell>
                                          {linha.horasReais}h
                                        </TableCell>
                                        <TableCell>
                                          {linha.horasCalculadas}h
                                        </TableCell>
                                        <TableCell>
                                          {linha.variacaoHoras > 0 ? "+" : ""}
                                          {linha.variacaoHoras.toFixed(1)}h
                                        </TableCell>
                                        <TableCell>
                                          {/* Horas extras projetadas são para a unidade inteira; mostradas apenas na linha TOTAL */}
                                          {"-"}
                                        </TableCell>
                                        <TableCell>
                                          {/* Valor em reais das horas extras (exibido apenas na linha TOTAL) */}
                                          {"-"}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  )}

                                  {/* Linha de Totais */}
                                  {(() => {
                                    const totais =
                                      calcularTotaisAnaliseFinanceira();
                                    if (!totais) return null;

                                    return (
                                      <TableRow>
                                        <TableCell>TOTAL GERAL</TableCell>
                                        <TableCell>—</TableCell>
                                        <TableCell>
                                          {/* Salário Médio (TOTAL não aplicável) */}
                                          —
                                        </TableCell>
                                        <TableCell>—</TableCell>
                                        <TableCell>
                                          {totais.quantidadeAtual}
                                        </TableCell>
                                        <TableCell>
                                          R${" "}
                                          {totais.custoTotalAtual.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {totais.quantidadeCalculada}
                                        </TableCell>
                                        <TableCell>
                                          R${" "}
                                          {totais.custoTotalCalculado.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          R${" "}
                                          {totais.variacaoCusto.toLocaleString(
                                            "pt-BR",
                                            {
                                              minimumFractionDigits: 2,
                                              signDisplay: "always",
                                            }
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {/* Soma das variações percentuais por linha */}
                                          {totais.somaVariacaoPercentual > 0
                                            ? "+"
                                            : ""}
                                          {Number(
                                            totais.somaVariacaoPercentual || 0
                                          )}
                                          %
                                        </TableCell>
                                        <TableCell>
                                          {totais.variacaoQuantidade > 0
                                            ? "+"
                                            : ""}
                                          {totais.variacaoQuantidade}
                                        </TableCell>
                                        <TableCell>
                                          {totais.horasReais.toFixed(1)} h
                                        </TableCell>
                                        <TableCell>
                                          {totais.horasCalculadas.toFixed(1)} h
                                        </TableCell>
                                        <TableCell>
                                          {totais.variacaoHoras > 0 ? "+" : ""}
                                          {totais.variacaoHoras.toFixed(1)} h
                                        </TableCell>
                                        <TableCell>
                                          {/* Horas extras projetadas da unidade (valor unitário, não por cargo) */}
                                          {typeof totais.horasExtrasProjetadas ===
                                            "number" &&
                                          totais.horasExtrasProjetadas > 0
                                            ? `${totais.horasExtrasProjetadas.toFixed(
                                                1
                                              )}h`
                                            : "—"}
                                        </TableCell>
                                        <TableCell>
                                          {/* Valor em reais das horas extras cadastradas na unidade */}
                                          {typeof totais.valorHorasExtrasReais ===
                                            "number" &&
                                          totais.valorHorasExtrasReais > 0
                                            ? `R$ ${totais.valorHorasExtrasReais.toLocaleString(
                                                "pt-BR",
                                                { minimumFractionDigits: 2 }
                                              )}`
                                            : "—"}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })()}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Dias Gerados */}
          <TabsContent value="dias-gerados" className="space-y-4">
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
                      disabled={loadingDias}
                      className="w-full"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {loadingDias ? "Buscando..." : "Buscar"}
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
                {loadingDias ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">
                      Carregando dados...
                    </div>
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
                      const totalPages = Math.ceil(dias.length / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const currentDias = dias.slice(startIndex, endIndex);

                      return (
                        <>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="text-left p-3 font-medium">
                                  Data
                                </th>
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
                                            onClick={() =>
                                              selecionarDia(dia.data)
                                            }
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
                                Página {currentPage} de {totalPages} (
                                {dias.length} dias no total)
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setCurrentPage((prev) =>
                                      Math.max(prev - 1, 1)
                                    )
                                  }
                                  disabled={currentPage === 1}
                                >
                                  Anterior
                                </Button>

                                {Array.from(
                                  { length: totalPages },
                                  (_, i) => i + 1
                                ).map((page) => (
                                  <Button
                                    key={page}
                                    variant={
                                      currentPage === page
                                        ? "default"
                                        : "outline"
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
          </TabsContent>
        </Tabs>

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

        {/* Modal de Detalhes do Leito */}
        <InternacaoDetailsModal
          leito={
            selectedInternacao
              ? {
                  leitoId: selectedInternacao.leitoId,
                  numero: selectedInternacao.leitoNome,
                  unidadeId: selectedInternacao.unidadeId,
                  unidadeNome: unidade?.nome,
                  prontuario: undefined, // ajustar se houver prontuário
                  // passar todas as informações do leito se disponível
                  ...(selectedInternacao.leitoCompleto && {
                    status: selectedInternacao.leitoCompleto.status,
                    justificativa:
                      selectedInternacao.leitoCompleto.justificativa,
                    ocupado: selectedInternacao.leitoCompleto.ocupado,
                    created_at: selectedInternacao.leitoCompleto.created_at,
                    internacao: selectedInternacao.leitoCompleto.internacao,
                  }),
                }
              : null
          }
          open={internacaoDetailsOpen}
          onOpenChange={setInternacaoDetailsOpen}
          onNovaAvaliacao={() =>
            handleNovaAvaliacao(selectedInternacao?.leitoId || "")
          }
          onAvaliacaoConcluida={() =>
            handleAvaliacaoConcluida(selectedInternacao?.leitoId || "")
          }
          onSessaoCriada={handleSessaoCriada}
          onLeitoAtualizado={carregarLeitos}
        />
      </div>
    </DashboardLayout>
  );
}
