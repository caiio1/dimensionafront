/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { Plus, Building, Bed, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import { unidadesApi, hospitaisApi, metodosScpApi } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Unidade {
  id: string;
  nome: string;
  numeroLeitos: number; // normalizado no carregamento
  scp: string;
  scpMetodoKey?: string | null;
  hospitalId?: string;
  hospital?: { id?: string; nome: string };
  // campos alternativos que podem vir da API serão absorvidos (numero_leitos, leitosCount, leitos[])
}

interface Hospital {
  id: string;
  nome: string;
  scpMetodo?: { id?: string; key: string; title?: string };
}
interface MetodoScp {
  id: string;
  key: string;
  title: string;
  description?: string;
  questions: {
    key: string;
    text: string;
    options: { label: string; value: number }[];
  }[];
  faixas: { min: number; max: number; classe: string }[];
}

export default function Unidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);
  const [metodos, setMetodos] = useState<MetodoScp[]>([]);
  const [formData, setFormData] = useState({
    nome: "",
    numeroLeitos: "",
    hospitalId: "",
    metodoKey: "", // único campo selecionável (padrão ou personalizado)
  });
  const { toast } = useToast();

  const asArray = <T,>(r: unknown): T[] =>
    Array.isArray(r) ? (r as T[]) : (r as { data?: T[] })?.data ?? [];

  const carregarMetodos = useCallback(async () => {
    try {
      const response = await metodosScpApi.listar();
      setMetodos(asArray<MetodoScp>(response));
    } catch (_error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar métodos",
        variant: "destructive",
      });
    }
  }, [toast]);

  const carregarUnidades = useCallback(async () => {
    try {
      const response = await unidadesApi.listar();
      const lista = asArray<Unidade>(response).map((u) => {
        const anyU = u as unknown as Record<string, unknown>;
        const rawLeitos = anyU["leitos"] as unknown;
        const leitosArr = Array.isArray(rawLeitos) ? rawLeitos : [];
        return {
          ...(u as object),
          numeroLeitos:
            (anyU.numeroLeitos as number | undefined) ??
            (anyU.numero_leitos as number | undefined) ??
            (anyU.leitosCount as number | undefined) ??
            leitosArr.length ??
            0,
        } as Unidade;
      });
      setUnidades(lista);
    } catch (_error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar unidades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const carregarHospitais = useCallback(async () => {
    try {
      const response = await hospitaisApi.listar();
      setHospitais(asArray<Hospital>(response));
    } catch (error) {
      console.error("Erro ao carregar hospitais:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([carregarUnidades(), carregarHospitais(), carregarMetodos()]);
  }, [carregarUnidades, carregarHospitais, carregarMetodos]);

  // Função para abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingUnidade(null);
    setFormData({
      nome: "",
      numeroLeitos: "",
      hospitalId: "",
      metodoKey: "",
    });
    setDialogOpen(true);
  };

  // Função para fechar modal e resetar estados
  const handleCloseModal = () => {
    setDialogOpen(false);
    setEditingUnidade(null);
    setFormData({
      nome: "",
      numeroLeitos: "",
      hospitalId: "",
      metodoKey: "",
    });
  };

  // old loader functions replaced by useCallback versions above

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUnidade) {
        // Para edição, envia apenas nome e numeroLeitos
        const dataEdicao = {
          nome: formData.nome,
          numeroLeitos: parseInt(formData.numeroLeitos),
        };

        await unidadesApi.atualizar(editingUnidade.id, dataEdicao);
        toast({
          title: "Sucesso",
          description: "Unidade atualizada com sucesso",
        });
      } else {
        if (!formData.metodoKey) {
          toast({
            title: "Selecione o método",
            description:
              "É necessário escolher um método (padrão ou personalizado)",
            variant: "destructive",
          });
          return;
        }
        // Para criação, envia todos os campos mapeando o método selecionado
        const key = (formData.metodoKey || "").toUpperCase();
        const BUILTINS: ReadonlyArray<string> = ["FUGULIN", "PERROCA", "DINI"];
        const isBuiltin = BUILTINS.includes(key);
        const numeroLeitos = parseInt(formData.numeroLeitos);
        const dataCriacao: any = {
          nome: formData.nome,
          numeroLeitos,
          scp: isBuiltin ? key : "FUGULIN",
          hospitalId: formData.hospitalId || undefined,
        };

        // If a custom key selected, try to resolve to method id
        if (!isBuiltin) {
          const matched = metodos.find(
            (m) => m.key === key || (m.title || "").toUpperCase() === key
          );
          if (matched && matched.id) dataCriacao.scpMetodoId = matched.id;
          else dataCriacao.scpMetodoKey = key;
        }

        await unidadesApi.criar(dataCriacao);
        toast({
          title: "Sucesso",
          description: "Unidade criada com sucesso",
        });
      }

      handleCloseModal();
      await carregarUnidades();
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
      numeroLeitos: unidade.numeroLeitos.toString(),
      hospitalId: unidade.hospitalId || "",
      metodoKey: unidade.scpMetodoKey || unidade.scp || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta unidade?")) return;

    try {
      await unidadesApi.excluir(id);
      toast({
        title: "Sucesso",
        description: "Unidade excluída com sucesso",
      });
      await carregarUnidades();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Erro ao excluir unidade";
      toast({ title: "Erro", description: msg, variant: "destructive" });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Unidades</h1>
            <p className="text-muted-foreground">
              Gerencie as unidades hospitalares
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {/* Botão de criação removido conforme solicitação */}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUnidade ? "Editar Unidade" : "Nova Unidade"}
                </DialogTitle>
                <DialogDescription>
                  {editingUnidade
                    ? "Atualize os dados básicos da unidade. Método SCP e hospital são fixos."
                    : "Preencha os dados para criar uma nova unidade."}
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
                  <Label htmlFor="numeroLeitos">Número de Leitos *</Label>
                  <Input
                    id="numeroLeitos"
                    type="number"
                    min="1"
                    value={formData.numeroLeitos}
                    onChange={(e) =>
                      setFormData({ ...formData, numeroLeitos: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label>Método *</Label>
                  {editingUnidade ? (
                    // Campo READONLY na edição (mostra o selecionado na criação)
                    <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                      {(() => {
                        const k = formData.metodoKey;
                        const m = metodos.find((mm) => mm.key === k);
                        return m ? `${m.title} (${m.key})` : k || "-";
                      })()}
                    </div>
                  ) : (
                    // Campo único editável na criação: lista todos os métodos
                    <Select
                      value={formData.metodoKey}
                      onValueChange={(value) =>
                        setFormData({ ...formData, metodoKey: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método (padrão ou personalizado)" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodos.length > 0 ? (
                          metodos.map((m) => (
                            <SelectItem key={m.key} value={m.key}>
                              {m.title} ({m.key})
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="FUGULIN">
                              Fugulin (FUGULIN)
                            </SelectItem>
                            <SelectItem value="PERROCA">
                              Perroca (PERROCA)
                            </SelectItem>
                            <SelectItem value="DINI">Dini (DINI)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label>Hospital</Label>
                  {editingUnidade ? (
                    // Campo READONLY na edição
                    <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground">
                      {editingUnidade.hospital?.nome ||
                        "Nenhum hospital vinculado"}
                    </div>
                  ) : (
                    // Campo editável na criação
                    <Select
                      value={formData.hospitalId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, hospitalId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um hospital" />
                      </SelectTrigger>
                      <SelectContent>
                        {hospitais.map((hospital) => (
                          <SelectItem key={hospital.id} value={hospital.id}>
                            {hospital.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {editingUnidade && (
                  <div className="p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                    <strong>Nota:</strong> O método SCP e o hospital não podem
                    ser alterados após a criação da unidade.
                  </div>
                )}

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
        </div>

        {/* Agrupadas por Hospital (exibe método do hospital) */}
        <div className="space-y-10">
          {Object.entries(
            unidades.reduce<Record<string, Unidade[]>>((acc, u) => {
              const hid = u.hospital?.id || u.hospitalId || "SEM";
              if (!acc[hid]) acc[hid] = [];
              acc[hid].push(u);
              return acc;
            }, {})
          ).map(([hospitalId, lista]) => {
            const hospital = hospitais.find((h) => h.id === hospitalId);
            const hospitalNome =
              hospital?.nome || lista[0]?.hospital?.nome || "Sem Hospital";
            const metodoKey = hospital?.scpMetodo?.key;
            const metodoLabel = (() => {
              if (!metodoKey) return null;
              const m = metodos.find((mm) => mm.key === metodoKey);
              return m ? `${m.title} (${m.key})` : metodoKey;
            })();
            return (
              <div key={hospitalId} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" /> {hospitalNome}
                  </h2>
                  {metodoLabel && (
                    <Badge variant="secondary" className="text-xs">
                      Método: {metodoLabel}
                    </Badge>
                  )}
                  <span className="text-xs font-normal text-muted-foreground">
                    {lista.length} unidade(s)
                  </span>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {lista.map((unidade) => (
                    <Card key={unidade.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg">
                          <Building className="h-5 w-5 inline mr-2" />
                          {unidade.nome}
                        </CardTitle>
                        <div className="flex space-x-1">
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
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Leitos:
                            </span>
                            <span className="font-medium">
                              {unidade.numeroLeitos ?? 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {unidades.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhuma unidade cadastrada
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece criando sua primeira unidade
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
