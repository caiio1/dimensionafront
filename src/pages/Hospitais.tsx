/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Building2, MapPin, Phone, Edit, Trash2, Filter, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  hospitaisApi,
  redesApi,
  gruposApi,
  regioesApi,
  metodosScpApi,
} from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetodoScp } from "@/pages/MetodosScp";
import CurrencyInput from "@/components/CurrencyInput";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface CriarBaselineDTO {
  hospitalId: string;
  nome: string;
  quantidade_funcionarios?: number;
  custo_total?: string;
  setores?: string[];
  custo?: string[];
}

interface Hospital {
  id: string;
  nome: string;
  cnpj: string;
  endereco?: string;
  baseline?: CriarBaselineDTO;
  custoTotal?: string;
  totalFuncionarios?: number;
  telefone?: string;
  // New backend payload includes nested relations on the hospital object
  regiao?: Regiao;
  created_at: string;
}

interface Rede {
  id: string;
  nome: string;
  grupos?: Grupo[];
}

interface Grupo {
  id: string;
  nome: string;
  redeId: string;
  rede?: Rede;
  regioes?: Regiao[];
}

interface Regiao {
  id: string;
  nome: string;
  grupoId: string;
  grupo?: Grupo;
  hospitais?: Hospital[];
}

export default function Hospitais() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [metodos, setMetodos] = useState<MetodoScp[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    telefone: "",
    cnpj: "",
    baselineQuantidadeFuncionarios: "",
    baselineNome: "",
  });

  const [baselineSites, setBaselineSites] = useState<
    { nome: string; custo: string }[]
  >([]);

  // Filtros hierárquicos
  const [selectedRede, setSelectedRede] = useState<string>("all");
  const [selectedGrupo, setSelectedGrupo] = useState<string>("all");
  const [selectedRegiao, setSelectedRegiao] = useState<string>("all");

  // modal-level selections for creating/editing a hospital
  const [modalSelectedRede, setModalSelectedRede] = useState<string | null>(
    null
  );
  const [modalSelectedGrupo, setModalSelectedGrupo] = useState<string | null>(
    null
  );
  const [modalSelectedRegiao, setModalSelectedRegiao] = useState<string | null>(
    null
  );

  // orchestration state (header)
  const [createdRedeId, setCreatedRedeId] = useState<string | null>(null);
  const [createdGrupoId, setCreatedGrupoId] = useState<string | null>(null);
  const [createdRegiaoId, setCreatedRegiaoId] = useState<string | null>(null);

  // redes/grupos/regioes state
  const [redes, setRedes] = useState<Rede[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);

  const [newRedeName, setNewRedeName] = useState("");
  const [newGrupoName, setNewGrupoName] = useState("");
  const [newRegiaoName, setNewRegiaoName] = useState("");
  const [selectedRedeForGrupo, setSelectedRedeForGrupo] = useState<
    string | null
  >(null);
  const [selectedGrupoForRegiao, setSelectedGrupoForRegiao] = useState<
    string | null
  >(null);
  const [redeModalOpen, setRedeModalOpen] = useState(false);
  const [grupoModalOpen, setGrupoModalOpen] = useState(false);
  const [regiaoModalOpen, setRegiaoModalOpen] = useState(false);

  const computeBaselineTotal = () =>
    baselineSites.reduce((acc, s) => {
      const n = parseBRLToNumber(String(s.custo));
      return acc + (isNaN(n) ? 0 : n);
    }, 0);

  // Format a raw input (or existing value) into Brazilian Real currency string, e.g. "R$ 1.234,56".
  const formatToBRL = (value: string) => {
    if (!value) return "";
    // remove everything except digits and comma/dot and minus
    const cleaned = String(value).replace(/[^0-9,.-]/g, "");
    // normalize comma to dot for parsing decimals
    const normalized = cleaned.replace(/,/g, ".");
    const parsed = parseFloat(normalized);
    if (Number.isNaN(parsed)) return "";
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(parsed);
    } catch (e) {
      // fallback
      return parsed.toFixed(2);
    }
  };

  // Parse a BRL formatted string (or similar) to a Number.
  const parseBRLToNumber = (value: string) => {
    if (!value) return 0;
    // remove currency symbol and spaces
    let v = String(value).replace(/\s/g, "");
    // remove any non digit, comma or dot
    v = v.replace(/[^0-9,.-]/g, "");
    // Remove thousands separators (.) then replace comma with dot for decimal
    // e.g. "1.234,56" -> "1234,56" -> "1234.56"
    v = v.replace(/\./g, "").replace(/,/g, ".");
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const validarCNPJ = (cnpj: string) => {
    const regexCNPJ = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
    return regexCNPJ.test(cnpj);
  };

  const formatarCNPJ = (valor: string) =>
    valor
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);

  const validarTelefone = (telefone: string) => {
    const regexTelefone = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
    return regexTelefone.test(telefone);
  };

  const formatarTelefone = (valor: string) =>
    valor
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);

  const carregarHospitais = useCallback(async () => {
    try {
      const response = await hospitaisApi.listar();
      const list = Array.isArray(response)
        ? response
        : response && typeof response === "object" && (response as any).data
        ? (response as any).data
        : [];

      setHospitais(list as Hospital[]);
    } catch (error) {
      console.error("❌ Erro ao carregar hospitais:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar hospitais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const carregarRedes = async () => {
    try {
      const r: any = await redesApi.listar();
      const processedRedes = Array.isArray(r) ? r : (r && r.data) || [];
      setRedes(processedRedes);
    } catch (err) {
      console.error("❌ Erro ao carregar redes:", err);
    }
  };

  const carregarGrupos = async () => {
    try {
      const g: any = await gruposApi.listar();
      const processedGrupos = Array.isArray(g) ? g : (g && g.data) || [];
      setGrupos(processedGrupos);
    } catch (err) {
      console.error("❌ Erro ao carregar grupos:", err);
    }
  };

  const carregarRegioes = async () => {
    try {
      const rg: any = await regioesApi.listar();
      const processedRegioes = Array.isArray(rg) ? rg : (rg && rg.data) || [];
      setRegioes(processedRegioes);
    } catch (err) {
      console.error("❌ Erro ao carregar regiões:", err);
    }
  };

  useEffect(() => {
    carregarHospitais();
    carregarRedes();
    carregarGrupos();
    carregarRegioes();
  }, [carregarHospitais]);

  const carregarMetodos = async () => {
    try {
      const met = (await metodosScpApi.listar()) as MetodoScp[];
      setMetodos(met);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar métodos SCP",
        variant: "destructive",
      });
    }
  };

  // Função para obter grupos filtrados pela rede selecionada
  const getGruposFiltrados = () => {
    if (selectedRede === "all") return [];
    return grupos.filter(
      (grupo) =>
        grupo.redeId === selectedRede ||
        (grupo.rede && grupo.rede.id === selectedRede)
    );
  };

  // Função para obter regiões filtradas pelo grupo selecionado
  const getRegioesFiltradas = () => {
    if (selectedGrupo === "all") return [];
    return regioes.filter(
      (regiao) =>
        regiao.grupoId === selectedGrupo ||
        (regiao.grupo && regiao.grupo.id === selectedGrupo)
    );
  };

  // Função principal de filtro dos hospitais
  const getHospitaisFiltrados = () => {
    // If no filters are active, return all hospitals
    if (
      selectedRede === "all" &&
      selectedGrupo === "all" &&
      selectedRegiao === "all"
    ) {
      return hospitais;
    }

    // Assume each hospital includes nested `regiao` -> `grupo` -> `rede`
    return hospitais.filter((hospital) => {
      const regiaoObj = hospital.regiao;
      const grupoObj = regiaoObj?.grupo;
      const redeObj = grupoObj?.rede;

      const matchesRegiao =
        selectedRegiao === "all" || regiaoObj?.id === selectedRegiao;
      const matchesGrupo =
        selectedGrupo === "all" || grupoObj?.id === selectedGrupo;
      const matchesRede =
        selectedRede === "all" || redeObj?.id === selectedRede;

      return matchesRegiao && matchesGrupo && matchesRede;
    });
  };

  // Handler para mudança de rede
  const handleRedeChange = (value: string) => {
    console.log("\n🔄 MUDANÇA DE REDE:", value);
    setSelectedRede(value);
    setSelectedGrupo("all"); // Reset grupo
    setSelectedRegiao("all"); // Reset região
    console.log("🔄 Estados resetados: grupo=all, regiao=all");
  };

  // Handler para mudança de grupo
  const handleGrupoChange = (value: string) => {
    console.log("\n🔄 MUDANÇA DE GRUPO:", value);
    setSelectedGrupo(value);
    setSelectedRegiao("all"); // Reset região
    console.log("🔄 Estado resetado: regiao=all");
  };

  // Handler para mudança de região
  const handleRegiaoChange = (value: string) => {
    console.log("\n🔄 MUDANÇA DE REGIÃO:", value);
    setSelectedRegiao(value);
  };

  const handleOpenCreateModal = () => {
    setEditingHospital(null);
    setFormData({
      nome: "",
      endereco: "",
      telefone: "",
      cnpj: "",
      baselineQuantidadeFuncionarios: "",
      baselineNome: "",
    });
    setBaselineSites([]);
    // reset modal-level selects
    setModalSelectedRede(null);
    setModalSelectedGrupo(null);
    setModalSelectedRegiao(null);
    setDialogOpen(true);
    carregarMetodos();
  };

  const handleCloseModal = () => {
    setDialogOpen(false);
    setEditingHospital(null);
    setFormData({
      nome: "",
      endereco: "",
      telefone: "",
      cnpj: "",
      baselineQuantidadeFuncionarios: "",
      baselineNome: "",
    });
    setBaselineSites([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do hospital é obrigatório",
        variant: "destructive",
      });
      return;
    }
    if (!formData.cnpj.trim()) {
      toast({
        title: "CNPJ obrigatório",
        description: "O CNPJ do hospital é obrigatório",
        variant: "destructive",
      });
      return;
    }
    if (formData.cnpj && !validarCNPJ(formData.cnpj)) {
      toast({
        title: "CNPJ inválido",
        description: "Digite um CNPJ válido. Ex: 12.345.678/0001-90",
        variant: "destructive",
      });
      return;
    }
    if (formData.telefone && !validarTelefone(formData.telefone)) {
      toast({
        title: "Telefone inválido",
        description: "Digite um telefone válido. Ex: (11) 99999-9999",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload: any = {
        nome: formData.nome,
        endereco: formData.endereco || undefined,
        telefone: formData.telefone || undefined,
        cnpj: formData.cnpj || undefined,
        // use region selected inside modal if present, otherwise fallback to orchestration-created id
        regiaoId: modalSelectedRegiao || createdRegiaoId || undefined,
      };
      const baselineProvided =
        formData.baselineNome ||
        formData.baselineQuantidadeFuncionarios ||
        baselineSites.length > 0;
      if (baselineProvided) {
        payload.baseline = {
          nome: `baseline_${formData.nome}`,
          quantidade_funcionarios: formData.baselineQuantidadeFuncionarios
            ? Number(formData.baselineQuantidadeFuncionarios)
            : undefined,
          // send numeric strings for API (use dot as decimal separator)
          custo_total: String(computeBaselineTotal().toFixed(2)),
          setores: baselineSites.map((s) => s.nome).filter(Boolean),
          custo: baselineSites
            .map((s) => String(parseBRLToNumber(String(s.custo)).toFixed(2)))
            .filter(Boolean),
        } as any;
      }

      if (editingHospital) {
        await hospitaisApi.atualizar(editingHospital.id, payload);
        toast({
          title: "Sucesso",
          description: "Hospital atualizado com sucesso",
        });
      } else {
        await hospitaisApi.criar(payload);
        toast({ title: "Sucesso", description: "Hospital criado com sucesso" });
      }
      handleCloseModal();
      carregarHospitais();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar hospital",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setFormData({
      nome: hospital.nome,
      endereco: hospital.endereco || "",
      telefone: hospital.telefone || "",
      cnpj: hospital.cnpj || "",
      baselineQuantidadeFuncionarios:
        hospital.baseline?.quantidade_funcionarios?.toString() || "",
      baselineNome: hospital.baseline?.nome || `baseline_${hospital.nome}`,
    });
    if (hospital.baseline) {
      const setores = (hospital.baseline.setores || []).map((s, i) => ({
        nome: s,
        custo: formatToBRL(hospital.baseline?.custo?.[i] || ""),
      }));
      setBaselineSites(setores);
    } else {
      setBaselineSites([]);
    }
    // set modal-level selects from hospital (assume nested objects present)
    const regiaoObj = hospital.regiao;
    const grupoObj = regiaoObj?.grupo;
    const redeObj = grupoObj?.rede;

    setModalSelectedRede(redeObj?.id || null);
    setModalSelectedGrupo(grupoObj?.id || null);
    setModalSelectedRegiao(regiaoObj?.id || null);
    setDialogOpen(true);
    carregarMetodos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este hospital?")) return;
    try {
      await hospitaisApi.excluir(id);
      toast({ title: "Sucesso", description: "Hospital excluído com sucesso" });
      carregarHospitais();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir hospital",
        variant: "destructive",
      });
    }
  };

  const criarRedeLocal = async () => {
    if (!newRedeName.trim()) {
      return toast({
        title: "Nome da rede obrigatório",
        variant: "destructive",
      });
    }
    try {
      const r: any = await redesApi.criar({ nome: newRedeName });
      const id = r?.id || r?.data?.id;
      setNewRedeName("");
      carregarRedes();
      toast({ title: "Rede criada" });
      setRedeModalOpen(false);
      if (id) setCreatedRedeId(id);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  };

  const criarGrupoLocal = async () => {
    if (!newGrupoName.trim()) {
      return toast({
        title: "Nome do grupo obrigatório",
        variant: "destructive",
      });
    }
    const redeIdToUse = selectedRedeForGrupo || createdRedeId;
    if (!redeIdToUse) {
      return toast({
        title: "Selecione uma rede para criar o grupo",
        variant: "destructive",
      });
    }
    try {
      const g: any = await gruposApi.criar({
        nome: newGrupoName,
        redeId: redeIdToUse,
      });
      setNewGrupoName("");
      carregarGrupos();
      toast({ title: "Grupo criado" });
      setGrupoModalOpen(false);
      const id = g?.id || g?.data?.id;
      if (id) setCreatedGrupoId(id);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  };

  const criarRegiaoLocal = async () => {
    if (!newRegiaoName.trim()) {
      return toast({
        title: "Nome da região obrigatório",
        variant: "destructive",
      });
    }
    const grupoIdToUse = selectedGrupoForRegiao || createdGrupoId;
    if (!grupoIdToUse) {
      return toast({
        title: "Selecione um grupo para criar a região",
        variant: "destructive",
      });
    }
    try {
      const rg: any = await regioesApi.criar({
        nome: newRegiaoName,
        grupoId: grupoIdToUse,
      });
      setNewRegiaoName("");
      carregarRegioes();
      toast({ title: "Região criada" });
      setRegiaoModalOpen(false);
      const id = rg?.id || rg?.data?.id;
      if (id) setCreatedRegiaoId(id);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || String(err),
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

  const hospitaisFiltrados = getHospitaisFiltrados();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-2xl font-bold">Hospitais</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <p className="text-muted-foreground text-sm">
              Gerencie a rede hospitalar e suas hierarquias organizacionais
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>{hospitais.length} hospitais cadastrados</span>
              <span>•</span>
              <span>{redes.length} redes ativas</span>
              <span>•</span>
              <span>{grupos.length} grupos organizacionais</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Hospital
                </Button>
              </DialogTrigger>
              <div className="flex items-center space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setRedeModalOpen(true)}
                  className="text-xs"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Rede
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setGrupoModalOpen(true)}
                  className="text-xs"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Grupo
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setRegiaoModalOpen(true)}
                  className="text-xs"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Região
                </Button>
              </div>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingHospital ? "Editar Hospital" : "Novo Hospital"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome do Hospital *</Label>
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
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cnpj: formatarCNPJ(e.target.value),
                        })
                      }
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefone: formatarTelefone(e.target.value),
                        })
                      }
                      placeholder="(11) 99999-9999"
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
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Rede</Label>
                      <Select
                        value={modalSelectedRede ?? undefined}
                        onValueChange={(v) => {
                          setModalSelectedRede(
                            v === "__none__" ? null : v || null
                          );
                          setModalSelectedGrupo(null);
                          setModalSelectedRegiao(null);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a rede" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma</SelectItem>
                          {redes.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Grupo</Label>
                      <Select
                        value={modalSelectedGrupo ?? undefined}
                        onValueChange={(v) => {
                          setModalSelectedGrupo(
                            v === "__none__" ? null : v || null
                          );
                          setModalSelectedRegiao(null);
                        }}
                        disabled={!modalSelectedRede}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              modalSelectedRede
                                ? "Selecione o grupo"
                                : "Selecione uma rede primeiro"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma</SelectItem>
                          {grupos
                            .filter((g) =>
                              modalSelectedRede
                                ? g.redeId === modalSelectedRede ||
                                  g.rede?.id === modalSelectedRede
                                : false
                            )
                            .map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Região</Label>
                      <Select
                        value={modalSelectedRegiao ?? undefined}
                        onValueChange={(v) =>
                          setModalSelectedRegiao(
                            v === "__none__" ? null : v || null
                          )
                        }
                        disabled={!modalSelectedGrupo}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              modalSelectedGrupo
                                ? "Selecione a região"
                                : "Selecione um grupo primeiro"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma</SelectItem>
                          {regioes
                            .filter((r) =>
                              modalSelectedGrupo
                                ? r.grupoId === modalSelectedGrupo ||
                                  r.grupo?.id === modalSelectedGrupo
                                : false
                            )
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="baselineQuantidadeFuncionarios">
                        Qtde. Funcionários
                      </Label>
                      <Input
                        id="baselineQuantidadeFuncionarios"
                        type="number"
                        value={formData.baselineQuantidadeFuncionarios}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            baselineQuantidadeFuncionarios: e.target.value,
                          })
                        }
                        readOnly={!!editingHospital}
                      />
                    </div>
                    <div>
                      <Label> Custo Total </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={formatToBRL(String(computeBaselineTotal()))}
                          placeholder="R$ 0,00"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Sítios / Setores</Label>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          setBaselineSites((s) => [
                            ...s,
                            { nome: "", custo: "" },
                          ])
                        }
                        disabled={!!editingHospital}
                        title={
                          editingHospital
                            ? "Baseline não editável durante edição"
                            : undefined
                        }
                      >
                        Adicionar Setor/Sítio
                      </Button>
                    </div>
                    {baselineSites.map((site, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 gap-2 items-end"
                      >
                        <div>
                          <Label>Nome do sítio</Label>
                          <Input
                            value={site.nome}
                            onChange={
                              !editingHospital
                                ? (e) =>
                                    setBaselineSites((prev) => {
                                      const copy = [...prev];
                                      copy[idx] = {
                                        ...copy[idx],
                                        nome: e.target.value,
                                      };
                                      return copy;
                                    })
                                : undefined
                            }
                            readOnly={!!editingHospital}
                          />
                        </div>
                        <div>
                          <Label>Custo</Label>
                          <CurrencyInput
                            value={site.custo} // valor sem formatação
                            onChange={(value) => {
                              setBaselineSites((prev) => {
                                const copy = [...prev];
                                copy[idx] = {
                                  ...copy[idx],
                                  custo: value, // armazenar cru
                                };
                                return copy;
                              });
                            }}
                            placeholder="R$ 0,00"
                          />
                        </div>
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={
                              !editingHospital
                                ? () =>
                                    setBaselineSites((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                : undefined
                            }
                            disabled={!!editingHospital}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
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
                      {editingHospital ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Rede modal */}
            <Dialog open={redeModalOpen} onOpenChange={setRedeModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Rede</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Nome da rede"
                    value={newRedeName}
                    onChange={(e) => setNewRedeName(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setRedeModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={criarRedeLocal} className="ml-2">
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Grupo modal */}
            <Dialog open={grupoModalOpen} onOpenChange={setGrupoModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Grupo</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Nome do grupo"
                    value={newGrupoName}
                    onChange={(e) => setNewGrupoName(e.target.value)}
                  />
                  <Select
                    value={selectedRedeForGrupo ?? undefined}
                    onValueChange={(value) =>
                      setSelectedRedeForGrupo(value || null)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a rede" />
                    </SelectTrigger>
                    <SelectContent>
                      {redes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setGrupoModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={criarGrupoLocal} className="ml-2">
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Região modal */}
            <Dialog open={regiaoModalOpen} onOpenChange={setRegiaoModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Região</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Nome da região"
                    value={newRegiaoName}
                    onChange={(e) => setNewRegiaoName(e.target.value)}
                  />
                  <Select
                    value={selectedGrupoForRegiao ?? undefined}
                    onValueChange={(value) =>
                      setSelectedGrupoForRegiao(value || null)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setRegiaoModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={criarRegiaoLocal} className="ml-2">
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Seção de Filtros Hierárquicos */}
        <Card className="hospital-card border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Filter className="h-5 w-5 text-primary" />
              <span>Filtros Organizacionais</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Rede */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rede</Label>
              <Select value={selectedRede} onValueChange={handleRedeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Redes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Redes</SelectItem>
                  {redes.map((rede) => (
                    <SelectItem key={rede.id} value={rede.id}>
                      {rede.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Grupo - só habilitado se rede estiver selecionada */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Grupo</Label>
              <Select
                value={selectedGrupo}
                onValueChange={handleGrupoChange}
                disabled={selectedRede === "all"}
              >
                <SelectTrigger
                  className={`${
                    selectedRede === "all" ? "opacity-50" : ""
                  }`}
                >
                  <SelectValue placeholder="Todos os Grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Grupos</SelectItem>
                  {getGruposFiltrados().map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Região - só habilitado se grupo estiver selecionado */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Região</Label>
              <Select
                value={selectedRegiao}
                onValueChange={handleRegiaoChange}
                disabled={selectedGrupo === "all"}
              >
                <SelectTrigger
                  className={`${
                    selectedGrupo === "all" ? "opacity-50" : ""
                  }`}
                >
                  <SelectValue placeholder="Todas as Regiões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Regiões</SelectItem>
                  {getRegioesFiltradas().map((regiao) => (
                    <SelectItem key={regiao.id} value={regiao.id}>
                      {regiao.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Lista de Hospitais */}
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">
                Hospitais ({hospitaisFiltrados.length})
              </h2>
              {(selectedRede !== "all" || selectedGrupo !== "all" || selectedRegiao !== "all") && (
                <p className="text-sm text-muted-foreground">
                  Filtros ativos • {hospitais.length - hospitaisFiltrados.length} hospitais ocultos
                </p>
              )}
            </div>
            {(selectedRede !== "all" || selectedGrupo !== "all" || selectedRegiao !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedRede("all");
                  setSelectedGrupo("all");
                  setSelectedRegiao("all");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {hospitaisFiltrados.map((hospital) => (
              <Card
                key={hospital.id}
                className="hospital-card cursor-pointer group"
                onClick={() => navigate(`/hospitais/${hospital.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    <Building2 className="h-5 w-5 inline mr-2" />
                    {hospital.nome}
                  </CardTitle>
                  <div
                    className="flex space-x-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(hospital)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(hospital.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hospital.endereco && (
                      <div className="flex items-start text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="line-clamp-2">{hospital.endereco}</span>
                      </div>
                    )}
                    {hospital.telefone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="h-4 w-4 mr-2" />
                        {hospital.telefone}
                      </div>
                    )}

                    {/* Hierarquia organizacional */}
                    <div className="pt-3 border-t">
                      <div className="space-y-1">
                        {(() => {
                          const regiao = hospital.regiao || undefined;
                          const grupo = regiao?.grupo;
                          const rede = grupo?.rede;

                          return (
                            <div className="flex flex-wrap gap-1">
                              {rede && (
                                <Badge variant="outline" className="text-xs">
                                  {rede.nome}
                                </Badge>
                              )}
                              {grupo && (
                                <Badge variant="outline" className="text-xs">
                                  {grupo.nome}
                                </Badge>
                              )}
                              {regiao && (
                                <Badge variant="outline" className="text-xs">
                                  {regiao.nome}
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mensagem quando não há hospitais */}
          {hospitaisFiltrados.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {hospitais.length === 0
                    ? "Nenhum hospital cadastrado"
                    : "Nenhum hospital encontrado"}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {hospitais.length === 0
                    ? "Comece criando seu primeiro hospital"
                    : "Ajuste os filtros ou crie um novo hospital"}
                </p>
                <div className="flex space-x-2">
                  {hospitais.length === 0 ? (
                    <Button onClick={handleOpenCreateModal}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Hospital
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRede("all");
                          setSelectedGrupo("all");
                          setSelectedRegiao("all");
                        }}
                      >
                        Limpar Filtros
                      </Button>
                      <Button onClick={handleOpenCreateModal}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Hospital
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resumo estatístico quando há filtros ativos */}
        {(selectedRede !== "all" || selectedGrupo !== "all" || selectedRegiao !== "all") && 
         hospitaisFiltrados.length > 0 && (
          <Card className="hospital-card border-l-4 border-l-secondary">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <BarChart3 className="h-5 w-5 text-secondary" />
                <span>Resumo da Seleção</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {hospitaisFiltrados.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Hospitais</p>
                </div>
                <div className="p-3 bg-secondary/5 rounded-lg">
                  <p className="text-2xl font-bold text-secondary">
                    {selectedRede !== "all" ? "1" : redes.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRede !== "all" ? "Rede" : "Redes"}
                  </p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {selectedGrupo !== "all" ? "1" : getGruposFiltrados().length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedGrupo !== "all" ? "Grupo" : "Grupos"}
                  </p>
                </div>
                <div className="p-3 bg-secondary/5 rounded-lg">
                  <p className="text-2xl font-bold text-secondary">
                    {selectedRegiao !== "all" ? "1" : getRegioesFiltradas().length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRegiao !== "all" ? "Região" : "Regiões"}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Filtros ativos:
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRede("all");
                      setSelectedGrupo("all");
                      setSelectedRegiao("all");
                    }}
                    className="text-xs"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
