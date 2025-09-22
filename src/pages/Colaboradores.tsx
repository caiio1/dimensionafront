import { useState, useEffect } from "react";
import {
  Plus,
  Users,
  Search,
  Edit,
  Trash2,
  UserCheck,
  Building,
} from "lucide-react";
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
import { colaboradoresApi, unidadesApi, hospitaisApi } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Colaborador {
  id: string;
  nome: string;
  cpf: string;
  cargo: "ENF" | "TEC" | "SUP";
  ativo: boolean;
  unidadeId: string;
  unidade?: { nome: string };
  hospitalId?: string;
  hospital?: { id: string; nome: string };
  created_at: string;
  mustChangePassword?: boolean;
}

interface Unidade {
  id: string;
  nome: string;
  hospitalId?: string;
  hospital?: { id: string; nome: string };
}
interface Hospital {
  id: string;
  nome: string;
}

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] =
    useState<Colaborador | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const ALL_UNIDADES = "__ALL__";
  const [filtroUnidade, setFiltroUnidade] = useState<string>(ALL_UNIDADES);
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    cargo: "",
    unidadeId: "",
    ativo: true,
  });
  const { toast } = useToast();

  const cargoOptions = [
    { value: "ENF", label: "Enfermeiro(a)" },
    { value: "TEC", label: "Técnico(a) de Enfermagem" },
    { value: "SUP", label: "Supervisor(a)" },
  ];

  // Log para depuração
  useEffect(() => {
    console.log("colaboradoresApi", colaboradoresApi);
    console.log("unidadesApi", unidadesApi);
  }, []);

  useEffect(() => {
    const carregar = async () => {
      try {
        await Promise.all([
          carregarColaboradores(),
          carregarUnidades(),
          carregarHospitais(),
        ]);
      } catch (err) {
        console.error("Erro inicial:", err);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados iniciais",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarColaboradores = async () => {
    try {
      const params =
        filtroUnidade && filtroUnidade !== ALL_UNIDADES
          ? { hospitalId: filtroUnidade }
          : {};
      const response = (await colaboradoresApi?.listar?.(params)) as unknown;

      console.log("Resposta colaboradores:", response);

      let lista: Colaborador[] = [];

      if (Array.isArray(response)) {
        lista = response as Colaborador[];
      } else if (response && typeof response === "object") {
        const dataPart = (response as Record<string, unknown>)["data"];
        if (Array.isArray(dataPart)) lista = dataPart as Colaborador[];
      }

      setColaboradores(lista);
    } catch (error) {
      console.error("Erro ao carregar colaboradores:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar colaboradores",
        variant: "destructive",
      });
    }
  };

  const carregarUnidades = async () => {
    try {
      const response = (await unidadesApi?.listar?.()) as unknown;

      console.log("Resposta unidades:", response);

      let lista: Unidade[] = [];

      if (Array.isArray(response)) {
        lista = response as Unidade[];
      } else if (response && typeof response === "object") {
        const dataPart = (response as Record<string, unknown>)["data"];
        if (Array.isArray(dataPart)) lista = dataPart as Unidade[];
      }

      setUnidades(lista);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar unidades",
        variant: "destructive",
      });
    }
  };

  const carregarHospitais = async () => {
    try {
      const response = (await hospitaisApi?.listar?.()) as unknown;
      let lista: Hospital[] = [];
      if (Array.isArray(response)) lista = response as Hospital[];
      else if (response && typeof response === "object") {
        const dataPart = (response as Record<string, unknown>)["data"];
        if (Array.isArray(dataPart)) lista = dataPart as Hospital[];
      }
      setHospitais(lista);
    } catch (error) {
      console.error("Erro ao carregar hospitais:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar hospitais",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!loading) {
      carregarColaboradores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroUnidade, loading]);

  // Clear editing state and reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setEditingColaborador(null);
      setFormData({ nome: "", cpf: "", cargo: "", unidadeId: "", ativo: true });
    }
  }, [dialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      nome: formData.nome,
      cpf: formData.cpf,
      cargo: formData.cargo as "ENF" | "TEC" | "SUP",
      hospitalId: formData.unidadeId,
      ativo: formData.ativo,
    };

    try {
      if (editingColaborador) {
        await colaboradoresApi?.atualizar?.(editingColaborador.id, data);
        toast({
          title: "Sucesso",
          description: "Colaborador atualizado com sucesso",
        });
      } else {
        await colaboradoresApi?.criar?.(data);
        toast({
          title: "Sucesso",
          description: "Colaborador criado com sucesso",
        });
      }

      setDialogOpen(false);
      setEditingColaborador(null);
      setFormData({ nome: "", cpf: "", cargo: "", unidadeId: "", ativo: true });
      await carregarColaboradores();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Erro ao salvar colaborador:", error);
      toast({
        title: "Erro",
        description: message || "Erro ao salvar colaborador",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador);
    setFormData({
      nome: colaborador.nome,
      cargo: colaborador.cargo,
      cpf: colaborador.cpf,
      unidadeId: colaborador.unidadeId,
      ativo: colaborador.ativo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este colaborador?")) return;

    try {
      await colaboradoresApi?.excluir?.(id);
      toast({
        title: "Sucesso",
        description: "Colaborador excluído com sucesso",
      });
      carregarColaboradores();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Erro ao excluir colaborador:", error);
      toast({
        title: "Erro",
        description: message || "Erro ao excluir colaborador",
        variant: "destructive",
      });
    }
  };

  const filteredColaboradores = colaboradores.filter((colaborador) =>
    colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Map hospitalId -> hospitalName for grouping
  const hospitalNameMap: Record<string, string> = hospitais.reduce((acc, h) => {
    acc[h.id] = h.nome;
    return acc;
  }, {} as Record<string, string>);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Colaboradores</h1>
            <p className="text-muted-foreground">
              Gerencie o cadastro de colaboradores
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              {/* precisa ser exatamente 1 filho */}
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingColaborador
                    ? "Editar Colaborador"
                    : "Novo Colaborador"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome Completo *</Label>
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
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) =>
                      setFormData({ ...formData, cpf: e.target.value })
                    }
                    placeholder="Digite o CPF"
                    required
                  />
                </div>

                <div>
                  <Label>Cargo *</Label>
                  <Select
                    value={formData.cargo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cargo: value })
                    }
                  >
                    <SelectTrigger>
                      {/* só 1 filho aqui */}
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Unidade *</Label>
                  <Select
                    value={formData.unidadeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unidadeId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((unidade) => (
                        <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, ativo: checked })
                    }
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingColaborador ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Filtrar por hospital" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_UNIDADES}>Todos os hospitais</SelectItem>
              {hospitais.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-10">
          {Object.entries(
            filteredColaboradores.reduce<Record<string, Colaborador[]>>(
              (acc, c) => {
                const unidadeInfo = unidades.find((u) => u.id === c.unidadeId);
                const hospitalId =
                  c.hospitalId ||
                  c.hospital?.id ||
                  unidadeInfo?.hospitalId ||
                  unidadeInfo?.hospital?.id ||
                  "SEM_HOSPITAL";
                const hospitalNome =
                  hospitalNameMap[hospitalId] ||
                  (hospitalId === "SEM_HOSPITAL"
                    ? "Sem Hospital"
                    : "Carregando...");
                if (!acc[hospitalNome]) acc[hospitalNome] = [];
                acc[hospitalNome].push(c);
                return acc;
              },
              {}
            )
          ).map(([hospitalNome, lista]) => (
            <div key={hospitalNome} className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" /> {hospitalNome}
                <span className="text-xs font-normal text-muted-foreground">
                  {lista.length} colaborador(es)
                </span>
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {lista.map((colaborador) => (
                  <Card key={colaborador.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg">
                        <Users className="h-5 w-5 inline mr-2" />{" "}
                        {colaborador.nome}
                      </CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(colaborador)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(colaborador.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            CPF:
                          </span>
                          <Badge variant="outline">{colaborador.cpf}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Cargo:
                          </span>
                          <Badge variant="outline">
                            {colaborador.cargo === "ENF"
                              ? "Enfermeiro(a)"
                              : "Técnico(a)"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Status:
                          </span>
                          <Badge
                            variant={
                              colaborador.ativo ? "default" : "secondary"
                            }
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            {colaborador.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredColaboradores.length === 0 && searchTerm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum colaborador encontrado
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Tente buscar com outros termos
              </p>
            </CardContent>
          </Card>
        )}

        {colaboradores.length === 0 && !searchTerm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum colaborador cadastrado
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece criando o primeiro colaborador
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
