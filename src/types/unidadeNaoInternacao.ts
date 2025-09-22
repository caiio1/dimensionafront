export type TipoResposta =
  | "texto"
  | "numero"
  | "sim_nao"
  | "escala_1_5"
  | "escala_1_10";

export interface PerguntaFormulario {
  pergunta: string;
  tipoResposta: TipoResposta;
}

export interface FormularioColeta {
  id: string;
  nome: string;
  descricao: string;
  perguntas: PerguntaFormulario[];
  criadoEm: string;
  atualizadoEm?: string;
  ativo: boolean;
}

export type TipoUnidadeNaoInternacao =
  | "CENTRO_CIRURGICO"
  | "AMBULATORIO"
  | "SADT"
  | "URGENCIA_EMERGENCIA"
  | "CME"
  | "HEMODIALISE";

export type TipoSitioFuncional =
  | "SALA_CIRURGICA"
  | "CONSULTORIO"
  | "EQUIPAMENTO"
  | "BOX_ATENDIMENTO"
  | "ESTACAO_TRABALHO";

export type StatusSitioFuncional = "DISPONIVEL" | "EM_USO" | "INATIVO";

export interface SitioFuncional {
  numero: string;
  nome: string;
  tipo: TipoSitioFuncional;
  descricao?: string;
  especificacoes?: {
    capacidade?: number;
    equipamentos?: string[];
    especialidade?: string;
    restricoes?: string[];
    observacoes?: string;
  };
  tempo_padrao_procedimento: number; // em minutos
}

export interface CargoUnidade {
  cargoId: string;
  quantidade_funcionarios: number;
}

export interface CreateUnidadeNaoInternacao {
  hospitalId: string;
  nome: string;
  tipo: TipoUnidadeNaoInternacao;
  descricao?: string;
  horario_inicio: string; // "07:00"
  horario_fim: string; // "19:00"
  dias_funcionamento: string[]; // ["seg", "ter", "qua", "qui", "sex"]
  capacidade_diaria: number;
  tempo_medio_procedimento: number; // em horas
  horas_extra_reais?: string;
  horas_extra_projetadas?: string;
  sitios_funcionais: SitioFuncional[];
  cargos_unidade: CargoUnidade[];
}

export interface PosicaoResponse {
  id: string;
  numero: string;
  nome?: string;
  status: StatusSitioFuncional;
  justificativa?: string; // Obrigatório quando status é INATIVO
  tempoOcupacao?: number; // em horas
  created_at: string;
  updated_at: string;
}

export interface SitioFuncionalResponse {
  id: string;
  numero: string;
  nome: string;
  tipo: TipoSitioFuncional;
  status: StatusSitioFuncional;
  descricao: string;
  cargos?: CargoSitioResponse[];
}

export interface CargoSitioResponse {
  id: string;
  // The backend may return different shapes: cargoId, cargoUnidadeId and nested cargo/cargoUnidade objects.
  cargoId?: string; // id of the cargo itself (legacy)
  cargoUnidadeId?: string; // id of the cargoUnidade record
  quantidade_funcionarios: number;
  sitioId?: string;
  // When returned with more context, backend includes the cargo details nested under `cargo` or `cargoUnidade`
  cargo?: {
    id?: string;
    nome?: string;
    salario?: string | number;
    adicionais_tributos?: string | number;
    carga_horaria?: string | number;
  };
  cargoUnidade?: {
    id?: string;
    quantidade_funcionarios?: number;
    cargo?: {
      id?: string;
      nome?: string;
    };
  };
  created_at?: string;
  updated_at?: string;
}

export interface CargoUnidadeResponse {
  id: string;
  cargoId: string;
  quantidade_funcionarios: number;
  cargo?: {
    id: string;
    nome: string;
  };
}

export interface UnidadeNaoInternacaoResponse {
  id: string;
  nome: string;
  tipo: TipoUnidadeNaoInternacao;
  descricao: string;
  horas_extra_reais?: string | null;
  horas_extra_projetadas?: string | null;
  horario_inicio: string;
  horario_fim: string;
  dias_funcionamento: string[];
  capacidade_diaria: number;
  tempo_medio_procedimento: number;
  hospital: {
    id: string;
    nome: string;
  };
  sitiosFuncionais: SitioFuncionalResponse[];
  cargosUnidade: CargoUnidadeResponse[];
  formulariosColeta?: FormularioColeta[]; // ✅ ADICIONADO
  created_at: string;
  updated_at: string;
}

export const TIPOS_UNIDADE_CONFIG = {
  CENTRO_CIRURGICO: {
    label: "Centro Cirúrgico",
    icon: "🏥",
    color: "blue",
    sitioTipo: "SALA_CIRURGICA" as TipoSitioFuncional,
    sitioLabel: "Sala Cirúrgica",
  },
  AMBULATORIO: {
    label: "Ambulatório",
    icon: "🩺",
    color: "green",
    sitioTipo: "CONSULTORIO" as TipoSitioFuncional,
    sitioLabel: "Consultório",
  },
  SADT: {
    label: "SADT/Diagnóstico",
    icon: "🔬",
    color: "purple",
    sitioTipo: "EQUIPAMENTO" as TipoSitioFuncional,
    sitioLabel: "Equipamento",
  },
  URGENCIA_EMERGENCIA: {
    label: "Urgência/Emergência",
    icon: "🚑",
    color: "red",
    sitioTipo: "BOX_ATENDIMENTO" as TipoSitioFuncional,
    sitioLabel: "Box de Atendimento",
  },
  CME: {
    label: "CME",
    icon: "🧽",
    color: "orange",
    sitioTipo: "ESTACAO_TRABALHO" as TipoSitioFuncional,
    sitioLabel: "Estação de Trabalho",
  },
  HEMODIALISE: {
    label: "Hemodiálise",
    icon: "💉",
    color: "teal",
    sitioTipo: "ESTACAO_TRABALHO" as TipoSitioFuncional,
    sitioLabel: "Estação de Hemodiálise",
  },
};

export const STATUS_SITIO_CONFIG = {
  DISPONIVEL: {
    color: "bg-green-100 text-green-800",
    icon: "✅",
    label: "Disponível",
  },
  EM_USO: {
    color: "bg-blue-100 text-blue-800",
    icon: "🔵",
    label: "Em Uso",
  },
  INATIVO: {
    color: "bg-gray-100 text-gray-800",
    icon: "⭕",
    label: "Inativo",
  },
};

export const DIAS_SEMANA = [
  { value: "seg", label: "Segunda" },
  { value: "ter", label: "Terça" },
  { value: "qua", label: "Quarta" },
  { value: "qui", label: "Quinta" },
  { value: "sex", label: "Sexta" },
  { value: "sab", label: "Sábado" },
  { value: "dom", label: "Domingo" },
];
