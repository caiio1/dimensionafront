/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Building,
  Bed,
  Edit,
  Trash2,
  Users,
  UserPlus,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function ParetoChart({ data, total }: { data: any[]; total: number }) {
  // data: [{ nome, custo, acumulado, acumuladoPercent }]
  const rightMax = 100;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 40, left: 0, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
        <YAxis
          yAxisId="left"
          orientation="left"
          tickFormatter={(v) => `${Number(v).toLocaleString()}`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, rightMax]}
          tickFormatter={(v) => `${Math.round(Number(v))}%`}
        />
        <Tooltip formatter={(value: any, name: any) => [value, name]} />
        <Bar yAxisId="left" dataKey="custo" fill="#c53030" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="acumuladoPercent"
          stroke="#2b6cb0"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  hospitaisApi,
  unidadesApi,
  metodosScpApi,
  colaboradoresApi,
  api,
  unidadesNaoInternacao as unidadesNaoInternacaoApi,
} from "@/lib/api";
import { unwrapData, normalizeList } from "@/lib/apiUtils";
import { DashboardLayout } from "@/components/DashboardLayout";
import CurrencyInput from "@/components/CurrencyInput";
import { Leito } from "./Leitos";
import {
  UnidadeNaoInternacaoResponse,
  TipoUnidadeNaoInternacao,
} from "@/types/unidadeNaoInternacao";

interface Hospital {
  id: string;
  nome: string;
  cnpj: string;
  baseline: any;
  endereco?: string;
  telefone?: string;
  created_at: string;
}

interface Unidade {
  id: string;
  nome: string;
  hospital?: Hospital;
  leitos?: Leito[];
  scpMetodo?: MetodoScp;

  horas_extra_reais?: string | null;
  horas_extra_projetadas?: string | null;
  cargos_unidade?: CargoUnidade[];
}

interface CargoUnidade {
  id?: string;
  cargoId: string;
  cargo?: Cargo;
  quantidade_funcionarios: number;
}

interface Colaborador {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  cargo: string;
  hospitalId: string;
  ativo: boolean;
  hospital?: Hospital;
  created_at: string;
}

interface MetodoScp {
  id: string;
  key: string;
  title: string;
  description?: string;
}

interface Cargo {
  id: string;
  nome: string;
  salario?: string | null;
  carga_horaria?: string | null;
  descricao?: string | null;
  adicionais_tributos?: string | null;
  hospitalId?: string;
}

export default function HospitalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Defensive redirect: if route param is the string 'undefined' or missing, go back to hospitals list
  useEffect(() => {
    if (!id || id === "undefined") {
      navigate("/hospitais");
    }
  }, [id]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadesNaoInternacao, setUnidadesNaoInternacao] = useState<
    UnidadeNaoInternacaoResponse[]
  >([]);
  const [metodos, setMetodos] = useState<MetodoScp[]>([]);

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [cargosList, setCargosList] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [collaboratorDialogOpen, setCollaboratorDialogOpen] = useState(false);
  const [cargoDialogOpen, setCargoDialogOpen] = useState(false);
  const [unidadeNaoInternacaoDialogOpen, setUnidadeNaoInternacaoDialogOpen] =
    useState(false);
  const [expandedNaoInternacao, setExpandedNaoInternacao] = useState<
    Record<string, boolean>
  >({});
  const [editingColaborador, setEditingColaborador] =
    useState<Colaborador | null>(null);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [editingUnidadeNaoInternacao, setEditingUnidadeNaoInternacao] =
    useState<UnidadeNaoInternacaoResponse | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    quantidadeLeitos: 0,
    scpMetodoId: "",
    horas_extra_reais: "",
    horas_extra_projetadas: "",
    cargos_unidade: [] as CargoUnidade[],
  });

  const [collaboratorFormData, setCollaboratorFormData] = useState({
    nome: "",
    cpf: "",
    email: "",
    cargo: "",
    ativo: true,
  });

  const [cargoFormData, setCargoFormData] = useState({
    nome: "",
    salario: "",
    carga_horaria: "",
    descricao: "",
    adicionais_tributos: "",
  });

  const [unidadeNaoInternacaoFormData, setUnidadeNaoInternacaoFormData] =
    useState({
      nome: "",
      descricao: "",
      horas_extra_reais: "",
      horas_extra_projetadas: "",
      cargos_unidade: [] as CargoUnidade[],
    });

  const { toast } = useToast();

  useEffect(() => {
    // Proteção: às vezes o param pode vir como a string 'undefined'
    const validId = id && id !== "undefined";
    if (validId) {
      Promise.all([
        carregarHospital(),
        carregarUnidades(),
        carregarUnidadesNaoInternacao(),
        carregarMetodos(),
        carregarColaboradores(),
        carregarCargos(),
      ]);
    }
  }, [id]);

  const carregarCargos = async () => {
    try {
      // Carregar cargos específicos do hospital
      const resp = await api.get(`/hospitais/${id}/cargos`);
      setCargosList(normalizeList<Cargo>(resp));
    } catch (error) {
      console.error("Erro ao carregar cargos:", error);
      // Fallback para todos os cargos se o endpoint específico não existir ainda
      try {
        const resp = await api.get("/cargos");
        setCargosList(normalizeList<Cargo>(resp));
      } catch (fallbackError) {
        console.error("Erro ao carregar cargos (fallback):", fallbackError);
      }
    }
  };

  const carregarHospital = async () => {
    setLoading(true);
    try {
      const response = await hospitaisApi.listar();
      const hospitais = normalizeList(response) as Hospital[];
      const hospitalEncontrado = hospitais.find((h: Hospital) => h.id === id);
      console.log("Hospital encontrado:", hospitalEncontrado);
      if (hospitalEncontrado) {
        setHospital(hospitalEncontrado);
      } else {
        toast({
          title: "Erro",
          description: "Hospital não encontrado",
          variant: "destructive",
        });
        navigate("/hospitais");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar hospital",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarUnidades = async () => {
    try {
      const response = await unidadesApi.listar(id);
      console.log("Response das unidades:", response);
      const unidadesNormalizadas = normalizeList<Unidade>(response);
      console.log("Unidades normalizadas:", unidadesNormalizadas);
      setUnidades(unidadesNormalizadas);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar unidades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarUnidadesNaoInternacao = async () => {
    try {
      if (!id || id === "undefined") {
        console.log("ID do hospital não válido:", id);
        return;
      }

      console.log("Carregando unidades de não-internação para hospital:", id);

      // Primeiro tenta o endpoint específico do hospital
      const response = await unidadesNaoInternacaoApi.listarPorHospital(id);
      console.log("Response das unidades não-internação:", response);

      const unidadesNormalizadas =
        normalizeList<UnidadeNaoInternacaoResponse>(response);
      console.log(
        "Unidades não-internação normalizadas:",
        unidadesNormalizadas
      );
      setUnidadesNaoInternacao(unidadesNormalizadas);
    } catch (error: any) {
      console.error("Erro ao carregar unidades de não-internação:", error);

      // Lista de códigos e mensagens que indicam que o endpoint não existe
      const endpointNotFoundIndicators = [
        "404",
        "Not Found",
        "Cannot GET",
        "ECONNREFUSED",
        "Network Error",
        "Erro na requisição", // Mensagem genérica da API quando retorna 404
      ];

      const isEndpointNotFound =
        endpointNotFoundIndicators.some(
          (indicator) =>
            error?.message?.includes(indicator) ||
            error?.status === 404 ||
            String(error).includes(indicator)
        ) || error?.message === "Erro na requisição"; // Verifica especificamente esta mensagem

      if (isEndpointNotFound) {
        console.log(
          "Endpoint de unidades de não-internação não disponível (404). Definindo lista vazia."
        );
        setUnidadesNaoInternacao([]);
      } else {
        // Outros erros (problemas de autenticação, servidor interno, etc.)
        console.error("Erro real ao carregar unidades:", error);
        toast({
          title: "Erro",
          description: `Erro ao carregar unidades de não-internação: ${
            error?.message || "Erro desconhecido"
          }`,
          variant: "destructive",
        });
        setUnidadesNaoInternacao([]);
      }
    }
  };

  const carregarMetodos = async () => {
    try {
      const response = await metodosScpApi.listar();
      setMetodos(normalizeList<MetodoScp>(response));
    } catch (error) {
      console.error("Erro ao carregar métodos:", error);
    }
  };

  const carregarColaboradores = async () => {
    try {
      if (!id || id === "undefined") return;
      // Busca usuários apenas deste hospital
      const response = await colaboradoresApi.listar({ hospitalId: id });
      setColaboradores(normalizeList<Colaborador>(response));
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUnidade(null);
    setFormData({
      nome: "",
      quantidadeLeitos: 0,
      scpMetodoId: "",
      horas_extra_reais: "",
      horas_extra_projetadas: "",
      cargos_unidade: [],
    });
    setDialogOpen(true);
  };

  const handleCloseModal = () => {
    setDialogOpen(false);
    setEditingUnidade(null);
    setFormData({
      nome: "",
      quantidadeLeitos: 0,
      scpMetodoId: "",
      horas_extra_reais: "",
      horas_extra_projetadas: "",
      cargos_unidade: [],
    });
  };

  const adicionarCargoUnidade = () => {
    setFormData({
      ...formData,
      cargos_unidade: [
        ...formData.cargos_unidade,
        { cargoId: "", quantidade_funcionarios: 0 },
      ],
    });
  };

  const removerCargoUnidade = (index: number) => {
    setFormData({
      ...formData,
      cargos_unidade: formData.cargos_unidade.filter((_, i) => i !== index),
    });
  };

  const atualizarCargoUnidade = (
    index: number,
    field: keyof CargoUnidade,
    value: any
  ) => {
    const novosCargos = [...formData.cargos_unidade];
    novosCargos[index] = { ...novosCargos[index], [field]: value };
    setFormData({
      ...formData,
      cargos_unidade: novosCargos,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    try {
      if (editingUnidade) {
        const dataEdicao = {
          nome: formData.nome,
          horas_extra_reais: formData.horas_extra_reais || null,
          horas_extra_projetadas: formData.horas_extra_projetadas || null,
          cargos_unidade: formData.cargos_unidade,
        };
        await unidadesApi.atualizar(editingUnidade.id, dataEdicao);
        toast({
          title: "Sucesso",
          description: "Unidade atualizada com sucesso",
        });
      } else {
        if (!formData.nome) {
          toast({
            title: "Adicione um nome",
            description: "É necessário adicionar um nome para a unidade",
            variant: "destructive",
          });
          return;
        }

        const dataCriacao: any = {
          nome: formData.nome,
          hospitalId: id,
          numeroLeitos: formData.quantidadeLeitos,
        };

        if (formData.scpMetodoId)
          dataCriacao.scpMetodoId = formData.scpMetodoId;

        console.log("Dados enviados para criação:", dataCriacao);

        const unidadeCriada = await unidadesApi.criar(dataCriacao);

        console.log("Unidade criada retornada:", unidadeCriada);

        // Se há dados extras (horas extras ou cargos), fazer uma atualização separada
        if (
          formData.horas_extra_reais ||
          formData.horas_extra_projetadas ||
          formData.cargos_unidade.length > 0
        ) {
          const dadosExtras = {
            nome: formData.nome, // sempre incluir nome na atualização
            horas_extra_reais: formData.horas_extra_reais || null,
            horas_extra_projetadas: formData.horas_extra_projetadas || null,
            cargos_unidade: formData.cargos_unidade,
          };

          console.log("Atualizando com dados extras:", dadosExtras);

          // Pegar o ID da unidade criada
          const unidadeId =
            (unidadeCriada as any)?.id || (unidadeCriada as any)?.data?.id;
          if (unidadeId) {
            await unidadesApi.atualizar(unidadeId, dadosExtras);
            console.log("Dados extras salvos com sucesso");
          }
        }

        toast({
          title: "Sucesso",
          description: "Unidade criada com sucesso",
        });
      }

      handleCloseModal();
      await carregarUnidades();
      await carregarColaboradores();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Erro ao salvar unidade";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const handleEdit = (unidade: Unidade) => {
    setEditingUnidade(unidade);
    setFormData({
      nome: unidade.nome,
      quantidadeLeitos: 0, // Não editamos quantidade ao editar
      scpMetodoId: unidade.scpMetodo?.id ?? "",
      horas_extra_reais: unidade.horas_extra_reais || "",
      horas_extra_projetadas: unidade.horas_extra_projetadas || "",
      cargos_unidade: unidade.cargos_unidade || [],
    });

    setDialogOpen(true);
  };

  const handleDelete = async (unidadeId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta unidade?")) return;

    try {
      await unidadesApi.excluir(unidadeId);
      toast({
        title: "Sucesso",
        description: "Unidade excluída com sucesso",
      });
      await carregarUnidades();
      await carregarColaboradores();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Erro ao excluir unidade";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const handleViewUnidade = (unidadeId: string) => {
    navigate(`/unidades/${unidadeId}/leitos`);
  };

  // Validação e formatação de CPF (sem dígito verificador, seguindo o padrão visual)
  const validarCPF = (cpf: string) => {
    const regexCPF = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
    return regexCPF.test(cpf);
  };

  const formatarCPF = (valor: string) => {
    const digits = valor.replace(/\D/g, "").slice(0, 11); // limita primeiro
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleCollaboratorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collaboratorFormData.nome.trim() || !collaboratorFormData.cargo) {
      toast({
        title: "Erro",
        description: "Nome e cargo são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Require at least CPF or email
    const hasCpf = !!collaboratorFormData.cpf.trim();
    const hasEmail = !!collaboratorFormData.email.trim();
    if (!hasCpf && !hasEmail) {
      toast({
        title: "Erro",
        description: "Informe CPF ou E-mail",
        variant: "destructive",
      });
      return;
    }

    if (hasCpf && !validarCPF(collaboratorFormData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Digite um CPF válido. Ex: 000.000.000-00",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingColaborador) {
        const dataUpdate = {
          nome: collaboratorFormData.nome.trim(),
          cpf: collaboratorFormData.cpf.trim(),
          email: collaboratorFormData.email.trim(),
          cargo: collaboratorFormData.cargo,
          ativo: collaboratorFormData.ativo,
        };
        await colaboradoresApi.atualizar(editingColaborador.id, dataUpdate);
        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso",
        });
      } else {
        const dataCreate = {
          nome: collaboratorFormData.nome.trim(),
          cpf: collaboratorFormData.cpf.trim(),
          email: collaboratorFormData.email.trim(),
          cargo: collaboratorFormData.cargo,
          hospitalId: id,
          ativo: collaboratorFormData.ativo,
        };
        if (hasCpf) dataCreate.cpf = collaboratorFormData.cpf.trim();
        if (hasEmail) dataCreate.email = collaboratorFormData.email.trim();

        await colaboradoresApi.criar(dataCreate);
        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso",
        });
      }

      setCollaboratorDialogOpen(false);
      setCollaboratorFormData({
        nome: "",
        cpf: "",
        email: "",
        cargo: "",
        ativo: true,
      });
      setEditingColaborador(null);
      await carregarColaboradores();
    } catch (error: any) {
      toast({
        title: "CPF inválido",
        description: "Erro ao criar usuário",
        variant: "destructive",
      });
    }
  };

  const handleEditColaborador = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setCollaboratorFormData({
      nome: colaborador.nome,
      cpf: formatarCPF(colaborador.cpf),
      email: colaborador.email,
      cargo: colaborador.cargo,
      ativo: colaborador.ativo,
    });
    setCollaboratorDialogOpen(true);
  };

  const handleDeleteColaborador = async (colaborador: Colaborador) => {
    if (!confirm(`Excluir usuário ${colaborador.nome}?`)) return;
    try {
      await colaboradoresApi.excluir(colaborador.id);
      toast({
        title: "Sucesso",
        description: "Usuário excluído",
      });
      await carregarColaboradores();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir usuário",
        variant: "destructive",
      });
    }
  };

  const handleCargoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cargoFormData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do cargo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCargo) {
        // Editar cargo existente
        const payload = {
          nome: cargoFormData.nome.trim(),
          salario: cargoFormData.salario || null,
          carga_horaria: cargoFormData.carga_horaria || null,
          descricao: cargoFormData.descricao || null,
          adicionais_tributos: cargoFormData.adicionais_tributos || null,
        };

        await api.patch(`/hospitais/${id}/cargos/${editingCargo.id}`, payload);
        toast({
          title: "Sucesso",
          description: "Cargo atualizado com sucesso",
        });
      } else {
        // Criar novo cargo
        const payload = {
          nome: cargoFormData.nome.trim(),
          salario: cargoFormData.salario || null,
          carga_horaria: cargoFormData.carga_horaria || null,
          descricao: cargoFormData.descricao || null,
          adicionais_tributos: cargoFormData.adicionais_tributos || null,
          hospitalId: id,
        };

        await api.post(`/hospitais/${id}/cargos`, payload);
        toast({
          title: "Sucesso",
          description: "Cargo criado com sucesso",
        });
      }

      setCargoDialogOpen(false);
      setCargoFormData({
        nome: "",
        salario: "",
        carga_horaria: "",
        descricao: "",
        adicionais_tributos: "",
      });
      setEditingCargo(null);
      await carregarCargos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar cargo",
        variant: "destructive",
      });
    }
  };

  // Helper to render cargo label: cargo can be a string (id or name) or an object { id, nome }
  const getCargoLabel = (cargo: any) => {
    if (!cargo) return "—";
    if (typeof cargo === "string") {
      // try to resolve id -> name from cargosList
      const found = cargosList.find((c) => c.id === cargo);
      return found ? found.nome : cargo;
    }
    // assume object
    return cargo.nome ?? "—";
  };

  const handleOpenUnidadeNaoInternacaoModal = () => {
    setEditingUnidadeNaoInternacao(null);
    setUnidadeNaoInternacaoFormData({
      nome: "",
      descricao: "",
      horas_extra_reais: "",
      horas_extra_projetadas: "",
      cargos_unidade: [],
    });
    setUnidadeNaoInternacaoDialogOpen(true);
  };

  const handleEditUnidadeNaoInternacao = (
    unidade: UnidadeNaoInternacaoResponse
  ) => {
    console.log("=== ABRINDO MODAL DE EDIÇÃO ===");
    console.log("Unidade para editar:", unidade);

    setEditingUnidadeNaoInternacao(unidade);
    // Defensive mapping: backend may use different property names / casing
    const horasReais =
      (unidade as any).horas_extra_reais ||
      (unidade as any).horasExtraReais ||
      "";
    const horasProj =
      (unidade as any).horas_extra_projetadas ||
      (unidade as any).horasExtraProjetadas ||
      "";
    const cargos =
      (unidade as any).cargos_unidade || (unidade as any).cargosUnidade || [];

    setUnidadeNaoInternacaoFormData({
      nome: unidade.nome,
      descricao: unidade.descricao || "",
      horas_extra_reais: horasReais,
      horas_extra_projetadas: horasProj,
      cargos_unidade: cargos,
    });
    setUnidadeNaoInternacaoDialogOpen(true);
  };

  const adicionarCargoUnidadeNaoInternacao = () => {
    setUnidadeNaoInternacaoFormData({
      ...unidadeNaoInternacaoFormData,
      cargos_unidade: [
        ...unidadeNaoInternacaoFormData.cargos_unidade,
        { cargoId: "", quantidade_funcionarios: 0 },
      ],
    });
  };

  const removerCargoUnidadeNaoInternacao = (index: number) => {
    setUnidadeNaoInternacaoFormData({
      ...unidadeNaoInternacaoFormData,
      cargos_unidade: unidadeNaoInternacaoFormData.cargos_unidade.filter(
        (_, i) => i !== index
      ),
    });
  };

  const atualizarCargoUnidadeNaoInternacao = (
    index: number,
    field: keyof CargoUnidade,
    value: any
  ) => {
    const novos = [...unidadeNaoInternacaoFormData.cargos_unidade];
    novos[index] = { ...novos[index], [field]: value };
    setUnidadeNaoInternacaoFormData({
      ...unidadeNaoInternacaoFormData,
      cargos_unidade: novos,
    });
  };

  const handleCloseUnidadeNaoInternacaoModal = (isOpen: boolean) => {
    setUnidadeNaoInternacaoDialogOpen(isOpen);

    if (!isOpen) {
      // Limpar os estados quando fechar o modal
      setEditingUnidadeNaoInternacao(null);
      setUnidadeNaoInternacaoFormData({
        nome: "",
        descricao: "",
        horas_extra_reais: "",
        horas_extra_projetadas: "",
        cargos_unidade: [],
      });
      console.log("=== ESTADOS LIMPOS AO FECHAR MODAL ===");
    }
  };

  const handleUnidadeNaoInternacaoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unidadeNaoInternacaoFormData.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const isEditing = !!editingUnidadeNaoInternacao;
      console.log(
        `=== INICIANDO ${
          isEditing ? "EDIÇÃO" : "CRIAÇÃO"
        } DE UNIDADE DE NÃO-INTERNAÇÃO ===`
      );
      console.log("Hospital ID:", id);
      console.log("Dados do formulário:", unidadeNaoInternacaoFormData);
      if (isEditing) {
        console.log("Unidade sendo editada:", editingUnidadeNaoInternacao);
      }

      const payload = {
        hospitalId: hospital.id,
        nome: unidadeNaoInternacaoFormData.nome.trim(),
        descricao: unidadeNaoInternacaoFormData.descricao || "",

        // Include extra fields from the form state so the API receives them
        horas_extra_reais:
          unidadeNaoInternacaoFormData.horas_extra_reais || null,
        horas_extra_projetadas:
          unidadeNaoInternacaoFormData.horas_extra_projetadas || null,
        sitios_funcionais:
          (unidadeNaoInternacaoFormData as any).sitios_funcionais || [],
        cargos_unidade: unidadeNaoInternacaoFormData.cargos_unidade || [],
      };

      console.log("=== PAYLOAD CONSTRUÍDO ===");
      console.log("Payload completo:", JSON.stringify(payload, null, 2));
      console.log(
        "Tamanho do payload:",
        JSON.stringify(payload).length,
        "bytes"
      );

      console.log("=== ENVIANDO REQUISIÇÃO ===");
      console.log(
        "Endpoint:",
        isEditing
          ? `/unidades-nao-internacao/${editingUnidadeNaoInternacao.id}`
          : "/unidades-nao-internacao"
      );
      console.log("Método:", isEditing ? "PUT" : "POST");
      console.log("Timestamp:", new Date().toISOString());

      let response;
      if (isEditing) {
        response = await unidadesNaoInternacaoApi.atualizar(
          editingUnidadeNaoInternacao.id,
          payload
        );
      } else {
        response = await unidadesNaoInternacaoApi.criar(payload);
      }

      console.log("=== RESPOSTA RECEBIDA ===");
      console.log("Resposta da API:", response);
      console.log("Tipo da resposta:", typeof response);
      console.log("Timestamp resposta:", new Date().toISOString());

      toast({
        title: "Sucesso",
        description: `Unidade de não-internação ${
          isEditing ? "atualizada" : "criada"
        } com sucesso`,
      });

      console.log("=== FINALIZANDO COM SUCESSO ===");
      setUnidadeNaoInternacaoDialogOpen(false);
      setEditingUnidadeNaoInternacao(null);
      setUnidadeNaoInternacaoFormData({
        nome: "",
        descricao: "",
        horas_extra_reais: "",
        horas_extra_projetadas: "",
        cargos_unidade: [],
      });

      console.log("=== RECARREGANDO LISTA ===");
      await carregarUnidadesNaoInternacao();
      console.log("=== PROCESSO COMPLETO ===");
    } catch (error: any) {
      console.log("=== ERRO NA CRIAÇÃO ===");
      console.error("Erro completo:", error);
      console.error("Tipo do erro:", typeof error);
      console.error("Mensagem do erro:", error?.message);
      console.error("Status do erro:", error?.status);
      console.error("Stack do erro:", error?.stack);
      console.log("Timestamp do erro:", new Date().toISOString());

      toast({
        title: "Erro",
        description: error.message || "Erro ao criar unidade de não-internação",
        variant: "destructive",
      });
    }
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
        <div className="flex items-center justify-center h-64">
          <p>Hospital não encontrado</p>
        </div>
      </DashboardLayout>
    );
  }

  // Aggregated stats for display in the hospital card
  const totalUnidades =
    (unidades?.length || 0) + (unidadesNaoInternacao?.length || 0);
  const totalLeitos = unidades.reduce(
    (sum, u) => sum + (u.leitos?.length || 0),
    0
  );

  const parseCurrencyToNumber = (v: any) => {
    if (v === undefined || v === null) return 0;
    const s = String(v);
    // remove currency symbols and spaces, convert comma to dot
    const cleaned = s.replace(/[^0-9,.-]/g, "").replace(/,/g, ".");
    return Number(cleaned) || 0;
  };

  const parseHoursToNumber = (v: any) => {
    if (v === undefined || v === null) return 0;
    const s = String(v);
    const cleaned = s.replace(/[^0-9,.-]/g, "").replace(/,/g, ".");
    return Number(cleaned) || 0;
  };

  const totalHorasExtraReais =
    unidades.reduce(
      (s, u) =>
        s +
        parseCurrencyToNumber(
          (u as any).horas_extra_reais || (u as any).horasExtraReais
        ),
      0
    ) +
    unidadesNaoInternacao.reduce(
      (s, un) =>
        s +
        parseCurrencyToNumber(
          (un as any).horas_extra_reais || (un as any).horasExtraReais
        ),
      0
    );

  const totalHorasExtraProjetadas =
    unidades.reduce(
      (s, u) =>
        s +
        parseHoursToNumber(
          (u as any).horas_extra_projetadas || (u as any).horasExtraProjetadas
        ),
      0
    ) +
    unidadesNaoInternacao.reduce(
      (s, un) =>
        s +
        parseHoursToNumber(
          (un as any).horas_extra_projetadas || (un as any).horasExtraProjetadas
        ),
      0
    );

  // Aggregate cargos across unidades and unidadesNaoInternacao
  const cargoMap: Record<string, number> = {};
  const collectCargos = (list: any[]) => {
    list.forEach((item) => {
      const cargos =
        (item as any).cargos_unidade || (item as any).cargosUnidade || [];
      cargos.forEach((c: any) => {
        const id = c.cargoId || c.cargoId;
        const qty = Number(c.quantidade_funcionarios) || 0;
        if (!id) return;
        cargoMap[id] = (cargoMap[id] || 0) + qty;
      });
    });
  };

  collectCargos(unidades as any[]);
  collectCargos(unidadesNaoInternacao as any[]);

  const aggregatedCargos = Object.keys(cargoMap).map((cargoId) => {
    const found = cargosList.find((c) => c.id === cargoId);
    return {
      cargoId,
      nome: found ? found.nome : cargoId,
      quantidade: cargoMap[cargoId],
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/hospitais")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{hospital.nome}</h1>
              <p className="text-muted-foreground">
                Gerencie as unidades deste hospital
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Dialog
              open={collaboratorDialogOpen}
              onOpenChange={setCollaboratorDialogOpen}
            >
              {/* Guarded open: if there are no cargos yet, prevent opening and redirect to cargos page */}
              <div>
                <Button
                  onClick={() => {
                    if (!cargosList || cargosList.length === 0) {
                      toast({
                        title: "Nenhum cargo definido",
                        description:
                          "Cadastre cargos antes de adicionar usuários.",
                        variant: "destructive",
                      });
                      navigate("/cargos");
                      return;
                    }
                    setCollaboratorDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />

                  {editingColaborador ? "Editar Usuário" : "Novo Usuário"}
                </Button>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingColaborador ? "Editar Usuário" : "Novo Usuário"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCollaboratorSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="collaborator-nome">Nome Completo *</Label>
                    <Input
                      id="collaborator-nome"
                      value={collaboratorFormData.nome}
                      onChange={(e) =>
                        setCollaboratorFormData({
                          ...collaboratorFormData,
                          nome: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="collaborator-cpf">
                      CPF (ou preencha E-mail)
                    </Label>
                    <Input
                      id="collaborator-cpf"
                      value={collaboratorFormData.cpf}
                      onChange={(e) =>
                        setCollaboratorFormData({
                          ...collaboratorFormData,
                          cpf: formatarCPF(e.target.value),
                        })
                      }
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  <div>
                    <Label htmlFor="collaborator-email">
                      E-mail (ou preencha CPF)
                    </Label>
                    <Input
                      id="collaborator-email"
                      type="email"
                      value={collaboratorFormData.email}
                      onChange={(e) =>
                        setCollaboratorFormData({
                          ...collaboratorFormData,
                          email: e.target.value,
                        })
                      }
                      placeholder="fulano@example.com"
                    />
                  </div>

                  <div>
                    <Label>Cargo *</Label>
                    <Select
                      value={collaboratorFormData.cargo}
                      onValueChange={(value) =>
                        setCollaboratorFormData({
                          ...collaboratorFormData,
                          cargo: value === "__none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {cargosList.length > 0 ? (
                          cargosList.map((cargo) => (
                            <SelectItem key={cargo.id} value={cargo.id}>
                              {cargo.nome}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none">
                            Nenhum cargo definido
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="collaborator-ativo"
                      checked={collaboratorFormData.ativo}
                      onCheckedChange={(checked) =>
                        setCollaboratorFormData({
                          ...collaboratorFormData,
                          ativo: checked,
                        })
                      }
                    />
                    <Label htmlFor="collaborator-ativo">Ativo</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCollaboratorDialogOpen(false);
                        setEditingColaborador(null);
                        setCollaboratorFormData({
                          nome: "",
                          cpf: "",
                          email: "",
                          cargo: "",
                          ativo: true,
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingColaborador
                        ? "Salvar Alterações"
                        : "Criar Usuário"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Unidade de Internação
                </Button>
              </DialogTrigger>
            </Dialog>

            <Button onClick={handleOpenUnidadeNaoInternacaoModal}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Unidade de Não-Internação
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUnidade ? "Editar Unidade" : "Nova Unidade"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUnidade
                      ? "Atualize os dados básicos da unidade. Método SCP é fixo."
                      : "Preencha os dados para criar uma nova unidade. O número de leitos será calculado automaticamente com base nos leitos cadastrados."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome da Unidade *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      placeholder="Ex: UTI Adulto, Clínica Médica"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="scpMetodoId">Método SCP</Label>
                    <Select
                      value={formData.scpMetodoId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, scpMetodoId: value })
                      }
                    >
                      <SelectTrigger id="scpMetodoId">
                        <SelectValue placeholder="Selecione um método" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodos.map((metodo) => (
                          <SelectItem key={metodo.id} value={metodo.id}>
                            {metodo.key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!editingUnidade && (
                    <div>
                      <Label htmlFor="quantidadeLeitos">
                        Quantidade de Leitos
                      </Label>
                      <Input
                        id="quantidadeLeitos"
                        type="number"
                        min="0"
                        max="999"
                        value={formData.quantidadeLeitos}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantidadeLeitos: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="Ex: 20"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Os leitos serão criados automaticamente numerados de 001
                        até o número especificado
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="horas-extra-reais">
                        Horas Extra (R$)
                      </Label>
                      <CurrencyInput
                        value={formData.horas_extra_reais}
                        onChange={(value) =>
                          setFormData({ ...formData, horas_extra_reais: value })
                        }
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="horas-extra-projetadas">
                        Horas Extra Projetadas (horas)
                      </Label>
                      <Input
                        id="horas-extra-projetadas"
                        value={formData.horas_extra_projetadas}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            horas_extra_projetadas: e.target.value,
                          })
                        }
                        placeholder="Ex: 40h"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Cargos na Unidade</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={adicionarCargoUnidade}
                        disabled={cargosList.length === 0}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar Cargo
                      </Button>
                    </div>

                    {formData.cargos_unidade.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                        Nenhum cargo adicionado. Clique em "Adicionar Cargo"
                        para começar.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {formData.cargos_unidade.map((cargoUnidade, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 p-2 border rounded"
                          >
                            <div className="flex-1">
                              <Select
                                value={cargoUnidade.cargoId}
                                onValueChange={(value) =>
                                  atualizarCargoUnidade(index, "cargoId", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um cargo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cargosList.map((cargo) => (
                                    <SelectItem key={cargo.id} value={cargo.id}>
                                      {cargo.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                min="0"
                                value={cargoUnidade.quantidade_funcionarios}
                                onChange={(e) =>
                                  atualizarCargoUnidade(
                                    index,
                                    "quantidade_funcionarios",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                placeholder="Qtd"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removerCargoUnidade(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingUnidade ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={cargoDialogOpen} onOpenChange={setCargoDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cargo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCargo ? "Editar Cargo" : "Novo Cargo"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCargo
                      ? "Atualize as informações do cargo."
                      : "Preencha os dados para criar um novo cargo no hospital."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCargoSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="cargo-nome">Nome do Cargo *</Label>
                    <Input
                      id="cargo-nome"
                      value={cargoFormData.nome}
                      onChange={(e) =>
                        setCargoFormData({
                          ...cargoFormData,
                          nome: e.target.value,
                        })
                      }
                      placeholder="Ex: Enfermeiro, Médico, Técnico"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cargo-salario">Salário</Label>
                      <CurrencyInput
                        value={cargoFormData.salario}
                        onChange={(value) =>
                          setCargoFormData({ ...cargoFormData, salario: value })
                        }
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cargo-adicionais">
                        Adicionais/Tributos
                      </Label>
                      <CurrencyInput
                        value={cargoFormData.adicionais_tributos}
                        onChange={(value) =>
                          setCargoFormData({
                            ...cargoFormData,
                            adicionais_tributos: value,
                          })
                        }
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cargo-carga">Carga Horária</Label>
                    <Input
                      id="cargo-carga"
                      value={cargoFormData.carga_horaria}
                      onChange={(e) =>
                        setCargoFormData({
                          ...cargoFormData,
                          carga_horaria: e.target.value,
                        })
                      }
                      placeholder="Ex: 40h, 36h, 24h"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cargo-descricao">Descrição</Label>
                    <Input
                      id="cargo-descricao"
                      value={cargoFormData.descricao}
                      onChange={(e) =>
                        setCargoFormData({
                          ...cargoFormData,
                          descricao: e.target.value,
                        })
                      }
                      placeholder="Descrição do cargo (opcional)"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCargoDialogOpen(false);
                        setEditingCargo(null);
                        setCargoFormData({
                          nome: "",
                          salario: "",
                          carga_horaria: "",
                          descricao: "",
                          adicionais_tributos: "",
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingCargo ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Modal para Unidade de Não-Internação */}
            <Dialog
              open={unidadeNaoInternacaoDialogOpen}
              onOpenChange={handleCloseUnidadeNaoInternacaoModal}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingUnidadeNaoInternacao
                      ? "Editar Unidade de Não-Internação"
                      : "Nova Unidade de Não-Internação"}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados básicos para criar uma nova unidade de
                    não-internação. Você poderá adicionar sítios funcionais e
                    funcionários depois.
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={handleUnidadeNaoInternacaoSubmit}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="unidade-nome">Nome da Unidade *</Label>
                      <Input
                        id="unidade-nome"
                        value={unidadeNaoInternacaoFormData.nome}
                        onChange={(e) =>
                          setUnidadeNaoInternacaoFormData({
                            ...unidadeNaoInternacaoFormData,
                            nome: e.target.value,
                          })
                        }
                        placeholder="Ex: Centro Cirúrgico A, Ambulatório de Cardiologia"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="unidade-descricao">Descrição</Label>
                      <Input
                        id="unidade-descricao"
                        value={unidadeNaoInternacaoFormData.descricao}
                        onChange={(e) =>
                          setUnidadeNaoInternacaoFormData({
                            ...unidadeNaoInternacaoFormData,
                            descricao: e.target.value,
                          })
                        }
                        placeholder="Descrição da unidade"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Horas extra (R$)</Label>
                      <CurrencyInput
                        value={unidadeNaoInternacaoFormData.horas_extra_reais}
                        onChange={(value) =>
                          setUnidadeNaoInternacaoFormData({
                            ...unidadeNaoInternacaoFormData,
                            horas_extra_reais: value,
                          })
                        }
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div>
                      <Label>Horas extra projetadas</Label>
                      <Input
                        value={
                          unidadeNaoInternacaoFormData.horas_extra_projetadas
                        }
                        onChange={(e) =>
                          setUnidadeNaoInternacaoFormData({
                            ...unidadeNaoInternacaoFormData,
                            horas_extra_projetadas: e.target.value,
                          })
                        }
                        placeholder="Ex: 40h"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Cargos na Unidade</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={adicionarCargoUnidadeNaoInternacao}
                        disabled={cargosList.length === 0}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar Cargo
                      </Button>
                    </div>

                    {unidadeNaoInternacaoFormData.cargos_unidade.length ===
                    0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                        Nenhum cargo adicionado. Clique em "Adicionar Cargo"
                        para começar.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {unidadeNaoInternacaoFormData.cargos_unidade.map(
                          (cargoUnidade, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 p-2 border rounded"
                            >
                              <div className="flex-1">
                                <Select
                                  value={cargoUnidade.cargoId}
                                  onValueChange={(value) =>
                                    atualizarCargoUnidadeNaoInternacao(
                                      index,
                                      "cargoId",
                                      value
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um cargo" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {cargosList.map((cargo) => (
                                      <SelectItem
                                        key={cargo.id}
                                        value={cargo.id}
                                      >
                                        {cargo.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-24">
                                <Input
                                  type="number"
                                  min="0"
                                  value={cargoUnidade.quantidade_funcionarios}
                                  onChange={(e) =>
                                    atualizarCargoUnidadeNaoInternacao(
                                      index,
                                      "quantidade_funcionarios",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  placeholder="Qtd"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removerCargoUnidadeNaoInternacao(index)
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setUnidadeNaoInternacaoDialogOpen(false);
                        setUnidadeNaoInternacaoFormData({
                          nome: "",
                          descricao: "",
                          horas_extra_reais: "",
                          horas_extra_projetadas: "",
                          cargos_unidade: [],
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingUnidadeNaoInternacao
                        ? "Editar Unidade"
                        : "Criar Unidade"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Informações do Hospital */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Hospital</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Nome</Label>
                <p className="text-sm text-muted-foreground">{hospital.nome}</p>
              </div>
              {/* Aggregated stats similar to unit cards */}
              <div>
                <Label className="text-sm font-medium">Resumo</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Unidades</span>
                    <span className="font-medium">{totalUnidades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leitos (total)</span>
                    <span className="font-medium">{totalLeitos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas extra (R$)</span>
                    <span className="font-medium">
                      R${" "}
                      {totalHorasExtraReais.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas projetadas</span>
                    <span className="font-medium">
                      {totalHorasExtraProjetadas}
                    </span>
                  </div>
                </div>
              </div>
              {/* Funcionários por Cargo and details */}
              <div>
                <Label className="text-sm font-medium">
                  Funcionários por Cargo
                </Label>
                <div className="text-sm text-muted-foreground mt-2">
                  {aggregatedCargos.length === 0 ? (
                    <p className="text-xs">Nenhum cargo alocado</p>
                  ) : (
                    <ul className="space-y-1">
                      {aggregatedCargos.slice(0, 5).map((c) => (
                        <li key={c.cargoId} className="flex justify-between">
                          <span>{c.nome}</span>
                          <span className="font-medium">{c.quantidade}</span>
                        </li>
                      ))}
                      {aggregatedCargos.length > 5 && (
                        <li className="text-xs text-muted-foreground">
                          + {aggregatedCargos.length - 5} outros cargos
                        </li>
                      )}
                    </ul>
                  )}

                  <div className="mt-3 border-t pt-2">
                    <div className="flex justify-between text-xs">
                      <span>Horas extras (R$)</span>
                      <span className="font-medium">
                        R${" "}
                        {totalHorasExtraReais.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Projetadas (horas)</span>
                      <span className="font-medium">
                        {totalHorasExtraProjetadas}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {hospital.cnpj && (
                <div>
                  <Label className="text-sm font-medium">CNPJ</Label>
                  <p className="text-sm text-muted-foreground">
                    {hospital.cnpj}
                  </p>
                </div>
              )}
              {hospital.endereco && (
                <div>
                  <Label className="text-sm font-medium">Endereço</Label>
                  <p className="text-sm text-muted-foreground">
                    {hospital.endereco}
                  </p>
                </div>
              )}
              {hospital.telefone && (
                <div>
                  <Label className="text-sm font-medium">Telefone</Label>
                  <p className="text-sm text-muted-foreground">
                    {hospital.telefone}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pareto - Baseline do Hospital */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Pareto - Baseline</CardTitle>
          </CardHeader>
          <CardContent>
            {hospital?.baseline ? (
              (() => {
                const baseline: any = hospital.baseline;
                // try common names for sectors and costs
                const sectores =
                  baseline.setores ||
                  baseline.sectores ||
                  baseline.sitios ||
                  [];
                const custos =
                  baseline.custo_sitios ||
                  baseline.custo ||
                  baseline.custos ||
                  baseline.custo_setores ||
                  [];

                // Build entries pairing name and numeric cost
                const entries = (Array.isArray(sectores) ? sectores : []).map(
                  (nome: any, i: number) => {
                    const raw =
                      custos?.[i] ??
                      custos?.[i]?.toString?.() ??
                      custos?.[i] ??
                      "0";
                    const n =
                      Number(
                        String(raw)
                          .replace(/[^0-9.,-]/g, "")
                          .replace(",", ".")
                      ) || 0;
                    return { nome: String(nome || "-"), custo: n };
                  }
                );

                // sort desc by cost
                entries.sort((a, b) => b.custo - a.custo);

                const total =
                  entries.reduce((s, e) => s + e.custo, 0) ||
                  Number(baseline.custo_total) ||
                  0;

                // prepare data with cumulative percent
                let acc = 0;
                const chartData = entries.map((e) => {
                  acc += e.custo;
                  return {
                    nome: e.nome,
                    custo: e.custo,
                    acumulado: acc,
                    acumuladoPercent: total ? (acc / total) * 100 : 0,
                  };
                });

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th>Setor</th>
                            <th className="text-right">Custo</th>
                            <th className="text-right">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((d, idx) => (
                            <tr key={idx}>
                              <td className="py-1">{d.nome}</td>
                              <td className="py-1 text-right">
                                {d.custo.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="py-1 text-right">
                                {total
                                  ? ((d.custo / total) * 100).toFixed(1) + "%"
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                          <tr className="font-semibold">
                            <td className="py-1">TOTAL</td>
                            <td className="py-1 text-right">
                              {total.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-1 text-right">
                              {total ? "100%" : "-"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      {/* Recharts Pareto: bar for cost, line for cumulative % */}
                      <div style={{ width: "100%", height: 320 }}>
                        {/* lazy-load recharts components */}
                        <ParetoChart data={chartData} total={total} />
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum baseline disponível para este hospital.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lista de Unidades */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Unidades</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unidades.map((unidade) => (
              <Card
                key={unidade.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewUnidade(unidade.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">
                    <Building className="h-5 w-5 inline mr-2" />
                    {unidade.nome}
                  </CardTitle>
                  <div
                    className="flex space-x-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(unidade)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(unidade.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Leitos:
                      </span>
                      <div className="flex items-center">
                        <Bed className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          {unidade.leitos?.length || 0}
                        </span>
                      </div>
                    </div>

                    {(unidade.horas_extra_reais ||
                      unidade.horas_extra_projetadas) && (
                      <div className="border-t pt-2 mt-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Horas Extras:
                        </span>
                        {unidade.horas_extra_reais && (
                          <div className="flex justify-between text-xs">
                            <span>Valor (R$):</span>
                            <span>R$ {unidade.horas_extra_reais}</span>
                          </div>
                        )}
                        {unidade.horas_extra_projetadas && (
                          <div className="flex justify-between text-xs">
                            <span>Projetadas:</span>
                            <span>{unidade.horas_extra_projetadas}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {unidade.cargos_unidade &&
                      unidade.cargos_unidade.length > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Funcionários por Cargo:
                          </span>
                          <div className="space-y-1">
                            {unidade.cargos_unidade.map(
                              (cargoUnidade, index) => {
                                const cargo = cargosList.find(
                                  (c) => c.id === cargoUnidade.cargoId
                                );
                                return (
                                  <div
                                    key={index}
                                    className="flex justify-between text-xs"
                                  >
                                    <span>
                                      {cargo?.nome || "Cargo não encontrado"}:
                                    </span>
                                    <span>
                                      {cargoUnidade.quantidade_funcionarios}
                                    </span>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {unidades.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhuma unidade cadastrada
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comece criando a primeira unidade deste hospital
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lista de Unidades de Não-Internação */}
        <div>
          <h2 className="text-2xl font-bold mb-4">
            Unidades de Não-Internação
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unidadesNaoInternacao.map((unidade) => (
              <Card
                key={unidade.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  navigate(
                    `/hospitais/${id}/unidades-nao-internacao/${unidade.id}`
                  )
                }
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">
                    <Activity className="h-5 w-5 inline mr-2" />
                    {unidade.nome}
                  </CardTitle>
                  <div
                    className="flex space-x-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUnidadeNaoInternacao(unidade)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Sítios Funcionais:
                      </span>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          {unidade.sitiosFuncionais?.length || 0}
                        </span>
                      </div>
                    </div>

                    {/* Status dos Sítios removed per request; keep count shown above */}

                    {/* Horas extras (valor e projetadas) */}
                    {(() => {
                      const horasReais =
                        (unidade as any).horas_extra_reais ||
                        (unidade as any).horasExtraReais ||
                        "";
                      const horasProj =
                        (unidade as any).horas_extra_projetadas ||
                        (unidade as any).horasExtraProjetadas ||
                        "";

                      if (!horasReais && !horasProj) return null;

                      const formatCurrency = (v: any) => {
                        if (!v && v !== 0) return "";
                        const n = parseCurrencyToNumber(v);
                        return n.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                      };

                      return (
                        <div className="border-t pt-2 mt-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Horas Extras:
                          </span>
                          {horasReais && (
                            <div className="flex justify-between text-xs">
                              <span>Valor (R$):</span>
                              <span>R$ {formatCurrency(horasReais)}</span>
                            </div>
                          )}
                          {horasProj && (
                            <div className="flex justify-between text-xs">
                              <span>Projetadas:</span>
                              <span>{String(horasProj)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Funcionários por cargo (detalhe) */}
                    {(() => {
                      const cargos =
                        (unidade as any).cargosUnidade ||
                        (unidade as any).cargos_unidade ||
                        [];
                      if (!Array.isArray(cargos) || cargos.length === 0)
                        return null;

                      const MAX_VISIBLE = 3;
                      const isExpanded = !!expandedNaoInternacao[unidade.id];
                      const visible = isExpanded
                        ? cargos
                        : cargos.slice(0, MAX_VISIBLE);

                      return (
                        <div className="border-t pt-2 mt-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Funcionários por Cargo:
                          </span>
                          <div className="space-y-1 mt-1 text-xs">
                            {visible.map((c: any, idx: number) => {
                              const nome =
                                c.cargo?.nome ||
                                getCargoLabel(c.cargoId || c.cargoId);
                              const qtd =
                                c.quantidade_funcionarios ?? c.quantidade ?? 0;
                              return (
                                <div key={idx} className="flex justify-between">
                                  <span>{nome}</span>
                                  <span className="font-medium">{qtd}</span>
                                </div>
                              );
                            })}

                            {cargos.length > MAX_VISIBLE && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  className="text-xs text-primary underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedNaoInternacao((s) => ({
                                      ...s,
                                      [unidade.id]: !s[unidade.id],
                                    }));
                                  }}
                                >
                                  {isExpanded
                                    ? "Mostrar menos"
                                    : `Mais informações (${
                                        cargos.length - MAX_VISIBLE
                                      } a mais)`}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {unidadesNaoInternacao.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhuma unidade de não-internação cadastrada
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comece criando a primeira unidade de não-internação deste
                  hospital
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lista de Cargos */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Cargos do Hospital</h2>
          <div className="grid gap-4">
            {cargosList.length > 0 ? (
              cargosList.map((cargo) => (
                <Card key={cargo.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{cargo.nome}</h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          {cargo.salario && (
                            <span>Salário: R$ {cargo.salario}</span>
                          )}
                          {cargo.carga_horaria && (
                            <span>• {cargo.carga_horaria}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCargo(cargo);
                          setCargoFormData({
                            nome: cargo.nome,
                            salario: cargo.salario || "",
                            carga_horaria: cargo.carga_horaria || "",
                            descricao: cargo.descricao || "",
                            adicionais_tributos:
                              cargo.adicionais_tributos || "",
                          });
                          setCargoDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum cargo cadastrado
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Crie cargos para poder adicionar usuários
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Lista de Usuários */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Usuários</h2>
          <div className="grid gap-4">
            {colaboradores.length > 0 ? (
              colaboradores.map((colaborador) => {
                // usuários agora vinculam ao hospital, não à unidade
                return (
                  <Card key={colaborador.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            {colaborador.nome}
                          </h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>CPF: {colaborador.cpf}</span>
                            <Badge variant="outline" className="text-xs">
                              {getCargoLabel(colaborador.cargo)}
                            </Badge>
                            {/* unidade removida: colaboradores vinculam ao hospital */}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={colaborador.ativo ? "default" : "secondary"}
                        >
                          {colaborador.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditColaborador(colaborador)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteColaborador(colaborador)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum usuário cadastrado
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Adicione usuários para começar a gerenciar o hospital
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
