/* eslint-disable @typescript-eslint/no-explicit-any */
// Use Vite environment variable if provided, fallback to localhost for dev
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000";
/* export const API_BASE_URL = "http://localhost:3110";*/
/**export const API_BASE_URL = "https://dimensiona.genustecnologia.com.br/api"; */

interface ApiResponse<T = any> {
  data?: T;
  mensagem?: string;
  erro?: string;
}

class ApiClient {
  private baseURL: string;
  private serverOffsetMs = 0; // diferença entre horário do servidor e do cliente
  private inMemoryToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): HeadersInit {
    // Prefer in-memory token (set from React auth hook) to avoid reading storage on every request
    const token = this.inMemoryToken ?? localStorage.getItem("auth.token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // Limpa token mas não força redirect imediato; deixa fluxo de UI decidir
      localStorage.removeItem("auth.token");
      throw new Error("Não autorizado");
    }

    // Ajuste de offset de relógio (se header Date presente)
    const dateHeader = response.headers.get("date");
    if (dateHeader) {
      const serverTime = new Date(dateHeader).getTime();
      if (!isNaN(serverTime)) {
        this.serverOffsetMs = serverTime - Date.now();
      }
    }

    // capturar header Date para ajuste de relógio
    const serverDateHeader = response.headers.get("date");
    if (serverDateHeader) {
      const serverNow = new Date(serverDateHeader).getTime();
      const clientNow = Date.now();
      if (!isNaN(serverNow)) {
        this.serverOffsetMs = serverNow - clientNow;
      }
    }

    const contentType = response.headers.get("content-type");

    // Handle binary responses (XLSX, PDF)
    if (
      contentType &&
      (contentType.includes("application/vnd.openxmlformats") ||
        contentType.includes("application/pdf"))
    ) {
      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "download";

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true } as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Log completo para depuração
      console.error("API ERROR RESPONSE:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
      });
      throw new Error(data.mensagem || data.message || "Erro na requisição");
    }

    return data;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getAuthHeaders();
    const body = data ? JSON.stringify(data) : undefined;

    console.log("=== HTTP POST REQUEST ===");
    console.log("URL:", url);
    console.log("Headers:", headers);
    console.log("Body:", body);
    console.log("Body size:", body?.length || 0, "bytes");
    console.log("Timestamp:", new Date().toISOString());

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });

      console.log("=== HTTP POST RESPONSE ===");
      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));
      console.log("OK:", response.ok);
      console.log("Timestamp:", new Date().toISOString());

      const result = await this.handleResponse<T>(response);
      console.log("=== PARSED RESPONSE ===");
      console.log("Result:", result);
      return result;
    } catch (error) {
      console.log("=== HTTP POST ERROR ===");
      console.error("Fetch error:", error);
      console.log("Timestamp:", new Date().toISOString());
      throw error;
    }
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }
  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  getServerNow(): number {
    return Date.now() + this.serverOffsetMs;
  }

  // allow external code (hooks) to set the auth token in-memory
  setToken(token: string | null) {
    this.inMemoryToken = token;
    if (token) localStorage.setItem("auth.token", token);
    else localStorage.removeItem("auth.token");
  }
}

export const api = new ApiClient(API_BASE_URL);

// prefer calling api.setToken(token) from hooks to set token in-memory and in localStorage

// Auth API
// Auth API - novo backend: rota única POST /login
export const authApi = {
  // unified login: accepts { email, senha } and returns token + user info
  login: (email: string, senha: string) =>
    api.post<{
      token: string;
      nome: string;
      id: string; // opcional, backend pode incluir id
      hospital?: { id: string; nome: string } | null;
      cargo?: string | null;
      role: "ADMIN" | "COLAB" | "OTHER";
      mustChangePassword?: boolean;
      mensagem?: string;
    }>("/login", { email, senha }),

  // backward-compatible alias (accepts email or cpf but forwards to /login)
  colaboradorLogin: (emailOrCpf: string, senha: string) =>
    api.post("/login", { email: emailOrCpf, senha }),
};

// Internações API
export const internacoesApi = {
  ativas: (params?: { unidadeId?: string; page?: number; limit?: number }) =>
    api.get("/internacoes/ativas", params),
  admitir: (data: {
    pacienteId: string;
    unidadeId: string;
    leitoId: string;
    dataEntrada?: string;
  }) => api.post("/internacoes/admitir", data),
  alta: (id: string, data: { dataSaida?: string; motivo?: string }) =>
    api.patch(`/internacoes/${id}/alta`, data),
  transferir: (
    id: string,
    data: { novoLeitoId: string; dataTransferencia?: string }
  ) => api.patch(`/internacoes/${id}/transferir`, data),
  leitosDisponiveis: (unidadeId: string) =>
    api.get("/internacoes/leitos-disponiveis", { unidadeId }),
};

// Avaliações API
export const avaliacoesApi = {
  criar: (data: {
    dataAplicacao: string; // yyyy-mm-dd
    internacaoId: string;
    scp: string;
    itens: Record<string, number>;
    totalPontos: number;
    classificacao: string;
    unidadeId?: string;
    colaboradorId?: string;
  }) => api.post("/avaliacoes", data),
  // novas listagens
  listarTodas: () => api.get("/avaliacoes/todas"),
  listarPorPaciente: (pacienteId: string) =>
    api.get(`/avaliacoes/paciente/${encodeURIComponent(pacienteId)}`),
  // NOVO: listar avaliações por internação
  listarPorInternacao: (internacaoId: string) =>
    api.get(`/avaliacoes/internacao/${encodeURIComponent(internacaoId)}`),
};

// Avaliações - Sessões (ocupação de leito)
export const avaliacoesSessaoApi = {
  criar: (data: {
    leitoId: string;
    unidadeId: string;
    scp: string;
    itens?: Record<string, number>; // pode iniciar vazio
    colaboradorId?: string;
    prontuario?: string;
  }) => api.post("/avaliacoes/sessao", data),
  listarAtivas: (unidadeId?: string) =>
    api.get("/avaliacoes/sessoes-ativas", unidadeId ? { unidadeId } : {}),
  liberar: (id: string) => api.post(`/avaliacoes/sessao/${id}/liberar`, {}),
  atualizar: (id: string, data: any) =>
    api.put(`/avaliacoes/sessao/${id}`, data),
};

// Relatórios API
export const relatoriosApi = {
  resumoDiario: (data: string, unidadeId: string) =>
    api.get("/relatorios/resumo-diario", { data, unidadeId }),
  mensal: (unidadeId: string, ano: number, mes: number) =>
    api.get("/relatorios/mensal", { unidadeId, ano, mes }),
};

// Export API
export const exportApi = {
  resumoDiarioXlsx: (unidadeId: string, data: string) =>
    api.get("/export/relatorios/resumo-diario.xlsx", { unidadeId, data }),
  resumoDiarioPdf: (unidadeId: string, data: string) =>
    api.get(`/estatisticas/unidade/${unidadeId}/pdf`, { data }),
  mensalXlsx: (unidadeId: string, ano: number, mes: number) =>
    api.get("/export/relatorios/mensal.xlsx", { unidadeId, ano, mes }),
  mensalPdf: (unidadeId: string, ano: number, mes: number) =>
    api.get("/export/relatorios/mensal.pdf", { unidadeId, ano, mes }),
  gradeXlsx: (unidadeId: string, ano: number, mes: number) =>
    api.get("/export/escala/grade.xlsx", { unidadeId, ano, mes }),
  gradePdf: (unidadeId: string, ano: number, mes: number) =>
    api.get("/export/escala/grade.pdf", { unidadeId, ano, mes }),
};

// Hospitais API
export const hospitaisApi = {
  listar: () => api.get("/hospitais"),
  criar: (data: {
    nome: string;
    endereco?: string;
    telefone?: string;
    cnpj?: string;
  }) => api.post("/hospitais", data),
  atualizar: (id: string, data: any) => api.put(`/hospitais/${id}`, data),
  obter: (id: string) => api.get(`/hospitais/${id}`),
  excluir: (id: string) => api.delete(`/hospitais/${id}`),
};

// Redes / Grupos / Regiões - new backend entities
export const redesApi = {
  listar: () => api.get("/redes"),
  criar: (data: { nome: string; descricao?: string }) =>
    api.post("/redes", data),
  obter: (id: string) => api.get(`/redes/${id}`),
  atualizar: (id: string, data: any) => api.put(`/redes/${id}`, data),
  excluir: (id: string) => api.delete(`/redes/${id}`),
};

export const gruposApi = {
  listar: () => api.get("/grupos"),
  criar: (data: { nome: string; redeId?: string; descricao?: string }) =>
    api.post("/grupos", data),
  obter: (id: string) => api.get(`/grupos/${id}`),
  atualizar: (id: string, data: any) => api.put(`/grupos/${id}`, data),
  excluir: (id: string) => api.delete(`/grupos/${id}`),
};

export const regioesApi = {
  listar: () => api.get("/regioes"),
  criar: (data: { nome: string; grupoId?: string; descricao?: string }) =>
    api.post("/regioes", data),
  obter: (id: string) => api.get(`/regioes/${id}`),
  atualizar: (id: string, data: any) => api.put(`/regioes/${id}`, data),
  excluir: (id: string) => api.delete(`/regioes/${id}`),
};

// Unidades API
export const unidadesApi = {
  listar: (hospitalId?: string) =>
    api.get("/unidades", hospitalId ? { hospitalId } : {}),
  obter: (id: string) => api.get(`/unidades/${id}`),
  criar: (data: {
    nome: string;
    hospitalId?: string; // backend exige obrigatório
    numeroLeitos?: number;
    scp?: string; // fallback enum
    scpMetodoId?: string; // preferido
    scpMetodoKey?: string; // alternativa
  }) => {
    if (!data?.hospitalId) {
      throw new Error("Selecione um hospital");
    }

    if (!data?.numeroLeitos) {
      throw new Error("Informe o número de leitos");
    }

    // backend requires scpMetodoId when creating unit; if key provided, send scpMetodoKey
    const payload: any = {
      hospitalId: data.hospitalId,
      nome: data.nome,
      numeroLeitos: data.numeroLeitos,
    };

    if (data.scpMetodoId) payload.scpMetodoId = data.scpMetodoId;
    else if (data.scpMetodoKey) payload.scpMetodoKey = data.scpMetodoKey;
    else if (data.scp) payload.scp = data.scp;

    return api.post("/unidades", payload);
  },
  atualizar: (id: string, data: any) => api.put(`/unidades/${id}`, data),
  excluir: (id: string) => api.delete(`/unidades/${id}`),
  // retorna estatísticas e avaliações da unidade em formato JSON
  unidadeJson: (id: string, dataIni?: string, dataFim?: string) =>
    api.get(`/unidade/${encodeURIComponent(id)}/json`, {
      dataIni,
      dataFim,
    }),

  // Novos métodos para UnidadeDetails
  resumoMensal: (
    id: string,
    params: { ano: number; mes: number; incluirDetalhes?: boolean }
  ) => api.get(`/unidades/${id}/resumo-mensal`, params),

  estatisticasConsolidadas: (id: string) =>
    api.get(`/unidades/${id}/estatisticas-consolidadas`),

  historicoMensal: (id: string, dataInicial: string, dataFinal: string) =>
    api.get(`/unidades/${id}/historico-mensal`, { dataInicial, dataFinal }),

  // Download de relatório consolidado mensal em PDF
  relatorioConsolidadoMensal: async (
    id: string,
    dataInicial: string,
    dataFinal: string
  ) => {
    // Usar o método get da API que já lida com autenticação e downloads
    try {
      const response = await api.get(
        `/unidades/${id}/relatorio-consolidado-mensal`,
        { unidadeId: id, dataInicial, dataFinal }
      );

      // Se chegou até aqui, o download foi processado automaticamente pelo handleResponse
      return { success: true };
    } catch (error) {
      // Se o handleResponse automático não funcionou, fazer download manual
      const token = localStorage.getItem("auth.token");
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const downloadUrl = `${API_BASE_URL}/unidades/${id}/relatorio-consolidado-mensal?dataInicial=${dataInicial}&dataFinal=${dataFinal}`;
      const resp = await fetch(downloadUrl, {
        method: "GET",
        headers,
      });

      if (!resp.ok) {
        throw new Error(
          `Erro ao baixar relatório: ${resp.status} ${resp.statusText}`
        );
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_consolidado_mensal_${id}_${dataInicial}_${dataFinal}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    }
  },

  // Salvar dimensionamento
  salvarDimensionamento: (id: string, payload: any) =>
    api.post(`/unidades/${id}/dimensionamento`, payload),

  // Download PDF do dimensionamento
  baixarDimensionamentoPdf: async (
    unidadeId: string,
    dimensionamentoId: string
  ) => {
    try {
      const response = await api.get(
        `/unidades/${unidadeId}/dimensionamento/${dimensionamentoId}/pdf`
      );
      // Se chegou até aqui, o download foi processado automaticamente pelo handleResponse
      return { success: true };
    } catch (error) {
      // Se o handleResponse automático não funcionou, fazer download manual
      const token = localStorage.getItem("auth.token");
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const downloadUrl = `${API_BASE_URL}/unidades/${unidadeId}/dimensionamento/${dimensionamentoId}/pdf`;
      const resp = await fetch(downloadUrl, {
        method: "GET",
        headers,
      });

      if (!resp.ok) {
        throw new Error(
          `Erro ao baixar dimensionamento PDF: ${resp.status} ${resp.statusText}`
        );
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);

      // Tentar obter o nome do arquivo do header ou usar nome padrão
      const contentDisposition = resp.headers.get("content-disposition");
      let filename = `dimensionamento_unidade_${unidadeId}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    }
  },
};

// Leitos API
export const leitosApi = {
  listar: (unidadeId?: string) =>
    api.get("/leitos", unidadeId ? { unidadeId } : {}),
  obter: (id: string) => api.get(`/leitos/${id}`),
  criar: (data: { numero: string; unidadeId: string }) =>
    api.post("/leitos", data),
  atualizar: (id: string, data: any) => api.patch(`/leitos/${id}`, data),
  excluir: (id: string) => api.delete(`/leitos/${id}`),
  alterarStatus: (id: string, status: string, justificativa?: string) =>
    api.patch(`/leitos/${id}/status`, { status, justificativa }),
};

// Colaboradores API
export const colaboradoresApi = {
  listar: (params?: { hospitalId?: string; page?: number; limit?: number }) =>
    api.get("/colaboradores", params),
  criar: (data: {
    nome: string;
    email?: string;
    cpf?: string;
    senha?: string; // opcional - se omitida backend usa CPF
    cargo: string; // agora cargo é entidade (id)
    unidadeId?: string;
    hospitalId?: string;
    ativo?: boolean;
  }) => api.post("/colaboradores", data),
  obter: (id: string) => api.get(`/colaboradores/${id}`),
  atualizar: (id: string, data: any) => api.patch(`/colaboradores/${id}`, data),
  excluir: (id: string) => api.delete(`/colaboradores/${id}`),
  alterarSenha: (id: string | null | undefined, senha: string) =>
    // If id is not provided, call the authenticated user's password endpoint
    id
      ? api.patch(`/colaboradores/${id}/senha`, { senha })
      : api.patch(`/colaboradores/senha`, { senha }),
};

// Métodos SCP API
export const metodosScpApi = {
  // Tipagens básicas para o método SCP
  // (somente locais do front para ajudar no preenchimento)
  _types: {} as {
    ScpOption: { label: string; value: number };
    ScpQuestion: {
      key: string;
      text: string;
      options: { label: string; value: number }[];
    };
    ScpFaixa: {
      min: number;
      max: number;
      classe:
        | "MINIMOS"
        | "INTERMEDIARIOS"
        | "ALTA_DEPENDENCIA"
        | "SEMI_INTENSIVOS"
        | "INTENSIVOS";
    };
    ScpMetodoPayload: {
      key: string;
      title: string;
      description?: string;
      questions: {
        key: string;
        text: string;
        options: { label: string; value: number }[];
      }[];
      faixas: {
        min: number;
        max: number;
        classe:
          | "MINIMOS"
          | "INTERMEDIARIOS"
          | "ALTA_DEPENDENCIA"
          | "SEMI_INTENSIVOS"
          | "INTENSIVOS";
      }[];
    };
  },

  listar: () => api.get("/scp-metodos"),
  obter: (id: string) => api.get(`/scp-metodos/${id}`),
  obterPorKey: (key: string) =>
    api.get(`/scp-metodos/key/${encodeURIComponent(key)}`),

  // Mantém compatibilidade com o formulário atual:
  // aceita data no formato { nome, tipo, itens, descricao?, faixas? }
  // e converte para o payload esperado pelo backend.
  criar: (data: any) => {
    const nome: string = data?.nome || data?.title || "METODO";
    const key = (data?.key || nome)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .toUpperCase()
      .replace(/^_+|_+$/g, "");

    const questions = Array.isArray(data?.itens)
      ? data.itens
      : Array.isArray(data?.questions)
      ? data.questions
      : [];

    const buildDefaultFaixas = (
      qs: any[]
    ): { min: number; max: number; classe: string }[] => {
      // calcula menor e maior pontuação possíveis
      const mins = qs.map(
        (q) =>
          Math.min(
            ...(q?.options || []).map((o: any) => Number(o?.value) || 0)
          ) || 0
      );
      const maxs = qs.map(
        (q) =>
          Math.max(
            ...(q?.options || []).map((o: any) => Number(o?.value) || 0)
          ) || 0
      );
      const minTotal = mins.reduce((a, b) => a + b, 0);
      const maxTotal = maxs.reduce((a, b) => a + b, 0);
      if (maxTotal <= minTotal) {
        // fallback simples
        return [
          { min: minTotal, max: minTotal, classe: "MINIMOS" },
          { min: minTotal + 1, max: minTotal + 1, classe: "INTERMEDIARIOS" },
          { min: minTotal + 2, max: minTotal + 2, classe: "ALTA_DEPENDENCIA" },
          { min: minTotal + 3, max: minTotal + 3, classe: "SEMI_INTENSIVOS" },
          { min: minTotal + 4, max: 9999, classe: "INTENSIVOS" },
        ];
      }
      const span = maxTotal - minTotal;
      const step = Math.max(1, Math.floor(span / 5));
      const f1Max = minTotal + step;
      const f2Max = f1Max + step;
      const f3Max = f2Max + step;
      const f4Max = f3Max + step;
      return [
        { min: minTotal, max: f1Max, classe: "MINIMOS" },
        { min: f1Max + 1, max: f2Max, classe: "INTERMEDIARIOS" },
        { min: f2Max + 1, max: f3Max, classe: "ALTA_DEPENDENCIA" },
        { min: f3Max + 1, max: f4Max, classe: "SEMI_INTENSIVOS" },
        { min: f4Max + 1, max: 9999, classe: "INTENSIVOS" },
      ];
    };

    const payload = {
      key,
      title: nome,
      description: data?.descricao || data?.description || undefined,
      questions,
      faixas:
        Array.isArray(data?.faixas) && data.faixas.length > 0
          ? data.faixas
          : buildDefaultFaixas(questions),
    };

    return api.post("/scp-metodos", payload);
  },

  atualizar: (id: string, data: any) => {
    // Permite atualizar parcialmente; back espera PUT, enviaremos os campos presentes
    return api.put(`/scp-metodos/${id}`, data);
  },

  excluir: (id: string) => api.delete(`/scp-metodos/${id}`),

  seedBuiltin: () => api.post("/scp-metodos/seed/builtin"),
};
interface CreateParametrosDTO {
  nome: string;
  numero_coren: string;
  aplicarIST?: boolean;
  ist?: number;
  diasSemana?: number;
}
export const parametrosApi = {
  listarPorUnidade: (unidadeId: string) =>
    api.get(`/parametros/unidade/${unidadeId}`),

  criar: (unidadeId: string, data: CreateParametrosDTO) =>
    api.post(`/parametros/unidade/${unidadeId}`, data),
};

// API methods for Unidades de Não-Internação
export const unidadesNaoInternacao = {
  // Listar todas as unidades de não-internação
  listar: () => api.get("/unidades-nao-internacao"),

  // Listar unidades por hospital
  listarPorHospital: (hospitalId: string) => {
    console.log("Chamando API para hospital:", hospitalId);
    // Defensive: some backends may still reference `posicoes` and return 500.
    // Try the optimized endpoint first, but if it fails, fallback to listing all unidades and filter client-side.
    return (async () => {
      try {
        return await api.get(`/unidades-nao-internacao/hospital/${hospitalId}`);
      } catch (err) {
        console.warn(
          "listarPorHospital: endpoint específico falhou, fazendo fallback para listar() - erro:",
          err
        );
        // Fallback: obter todas as unidades e filtrar pelo hospitalId
        try {
          const all = await api.get(`/unidades-nao-internacao`);
          if (Array.isArray(all)) {
            return (all as any[]).filter((u) => u.hospital?.id === hospitalId);
          }
          if (
            all &&
            typeof all === "object" &&
            Array.isArray((all as any).data)
          ) {
            return (all as any).data.filter(
              (u: any) => u.hospital?.id === hospitalId
            );
          }
          return [];
        } catch (fallbackErr) {
          console.error(
            "listarPorHospital: fallback também falhou. Retornando lista vazia. Erro:",
            fallbackErr
          );
          return [];
        }
      }
    })();
  },

  // Obter unidade específica
  obter: (id: string) => api.get(`/unidades-nao-internacao/${id}`),

  // Criar nova unidade
  criar: (dados: any) => {
    console.log("=== API: CRIANDO UNIDADE DE NÃO-INTERNAÇÃO ===");
    console.log("Dados recebidos na API:", dados);
    console.log("URL completa:", `${API_BASE_URL}/unidades-nao-internacao`);
    console.log("Método: POST");

    const result = api.post("/unidades-nao-internacao", dados);
    console.log("Requisição enviada, aguardando resposta...");
    return result;
  },

  // Atualizar unidade
  atualizar: (id: string, dados: any) =>
    api.put(`/unidades-nao-internacao/${id}`, dados),

  // Deletar unidade
  deletar: (id: string) => api.delete(`/unidades-nao-internacao/${id}`),

  // Atualizar status de sítio funcional
  atualizarStatusSitio: (unidadeId: string, sitioId: string, status: string) =>
    api.put(`/unidades-nao-internacao/${unidadeId}/sitios/${sitioId}/status`, {
      status,
    }),

  // Obter todas as posições de um sítio funcional
  // (REMOVIDO) Obter posições de sítio — agora usamos cargos atribuídos a sítio
  // Para listar cargos atribuídos a um sítio, use obterCargosSitio

  // Obter estatísticas da unidade
  estatisticas: (id: string, params?: { data?: string }) =>
    api.get(`/unidades-nao-internacao/${id}/estatisticas`, params),

  // ========== ENDPOINTS PARA SÍTIOS FUNCIONAIS ==========

  // Obter sítio funcional específico
  obterSitio: (sitioId: string) =>
    api.get(`/sitios/sitios-funcionais/${sitioId}`),

  obterSitioPorIdUnidade: (unidadeId: string) => {
    return api.get(`/sitios/unidades-nao-internacao/${unidadeId}/sitios`);
  },

  // Criar sítio funcional (aceita cargos no body)
  criarSitio: (dados: any) => {
    try {
      console.log("=== API DEBUG: criarSitio ===");
      console.log("URL:", `${API_BASE_URL}/sitios/sitios-funcionais`);
      console.log("Payload:", dados);
    } catch (e) {
      /* ignore logging errors */
    }
    // Try canonical endpoint first, fallback to unidade-specific path if it fails
    return (async () => {
      try {
        return await api.post(`/sitios/sitios-funcionais`, dados);
      } catch (err) {
        console.warn(
          "criarSitio: canonical endpoint failed, attempting compatibility fallback",
          err
        );
        const unidadeId = (dados &&
          (dados.unidadeId ||
            (dados.unidade && (dados.unidade.id || dados.unidadeId)))) as
          | string
          | undefined;
        if (unidadeId) {
          try {
            console.log(
              `criarSitio: trying fallback POST /unidades-nao-internacao/${unidadeId}/sitios`
            );
            return await api.post(
              `/unidades-nao-internacao/${unidadeId}/sitios`,
              dados
            );
          } catch (err2) {
            console.warn("criarSitio: fallback also failed", err2);
            throw err2;
          }
        }
        throw err;
      }
    })();
  },

  // Atualizar sítio funcional (canônico)
  atualizarSitio: (_unidadeId: string, sitioId: string, dados: any) => {
    try {
      console.log("=== API DEBUG: atualizarSitio ===");
      console.log(
        "URL:",
        `${API_BASE_URL}/sitios/sitios-funcionais/${sitioId}`
      );
      console.log("Payload:", dados);
    } catch (e) {
      /* ignore logging errors */
    }
    // Try canonical endpoint first, then fallback to unidad-specific path
    return (async () => {
      try {
        return await api.put(`/sitios/sitios-funcionais/${sitioId}`, dados);
      } catch (err) {
        console.warn(
          "atualizarSitio: canonical endpoint failed, attempting compatibility fallback",
          err
        );
        const unidadeId = _unidadeId;
        if (unidadeId) {
          try {
            console.log(
              `atualizarSitio: trying fallback PUT /unidades-nao-internacao/${unidadeId}/sitios/${sitioId}`
            );
            return await api.put(
              `/unidades-nao-internacao/${unidadeId}/sitios/${sitioId}`,
              dados
            );
          } catch (err2) {
            console.warn("atualizarSitio: fallback also failed", err2);
            throw err2;
          }
        }
        throw err;
      }
    })();
  },

  // Deletar sítio funcional (canônico)
  deletarSitio: (_unidadeId: string, sitioId: string) =>
    api.delete(`/sitios/sitios-funcionais/${sitioId}`),

  // ========== ENDPOINTS PARA CARGOS ATRIBUÍDOS A SÍTIO ==========

  // Listar cargos atribuídos a um sítio
  obterCargosSitio: (sitioId: string) =>
    api.get(`/sitios/sitios-funcionais/${sitioId}/cargos`),

  // Criar associação cargo -> sitio (compatível com criação em massa)
  criarCargoSitio: (sitioId: string, dados: any) =>
    api.post(`/sitios/sitios-funcionais/${sitioId}/cargos`, dados),

  // Obter cargo atribuído por id
  obterCargoPorIdSitio: (id: string) =>
    api.get(`/sitios/sitios-funcionais/cargos/${id}`),

  // Atualizar associação
  atualizarCargoSitio: (id: string, dados: any) =>
    api.patch(`/sitios/sitios-funcionais/cargos/${id}`, dados),

  // Deletar associação
  deletarCargoSitio: (id: string) =>
    api.delete(`/sitios/sitios-funcionais/cargos/${id}`),

  // ========== ENDPOINTS PARA RELATÓRIOS E ESTATÍSTICAS ==========

  // Ocupações por dia
  ocupacoesPorDia: (date: string) =>
    api.post(`/ocupacoes-posicoes/por-dia`, { date }),

  // Ocupações por mês
  ocupacoesPorMes: (ano: number, mes: number) =>
    api.post(`/ocupacoes-posicoes/por-mes`, { ano, mes }),
};
