/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Plus, Edit, Save, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CurrencyInput from "@/components/CurrencyInput";

interface Cargo {
  id: string;
  nome: string;
  salario?: string | null;
  carga_horaria?: string | null;
  descricao?: string | null;
  adicionais_tributos?: string | null;
}

export default function Cargos() {
  const { toast } = useToast();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    salario: "",
    carga_horaria: "",
    descricao: "",
    adicionais_tributos: "",
  });

  const asArray = <T,>(r: unknown): T[] =>
    Array.isArray(r) ? (r as T[]) : (r as { data?: T[] })?.data ?? [];

  const fetchCargos = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/cargos");
      const list = asArray<Cargo>(resp);
      setCargos(list);
    } catch (err) {
      toast({
        title: "Erro ao buscar cargos",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCargos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const criarCargo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.nome.trim()) return toast({ title: "Informe o nome" });
    try {
      const payload = {
        nome: form.nome.trim(),
        salario: form.salario || undefined,
        carga_horaria: form.carga_horaria || undefined,
        descricao: form.descricao || undefined,
        adicionais_tributos: form.adicionais_tributos || undefined,
      };
      const resp = await api.post("/cargos", payload);
      const created = (resp as any)?.data ?? resp;
      setCargos((s) => [created, ...s]);
      setForm({
        nome: "",
        salario: "",
        carga_horaria: "",
        descricao: "",
        adicionais_tributos: "",
      });
      toast({ title: "Cargo criado" });
    } catch (err) {
      toast({
        title: "Erro ao criar cargo",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const atualizarCampo = async (id: string, updated: Partial<Cargo>) => {
    try {
      const resp = await api.patch(`/cargos/${id}`, updated);
      const updatedItem = (resp as any)?.data ?? resp;
      setCargos((s) =>
        s.map((c) => (c.id === id ? { ...c, ...updatedItem } : c))
      );
      toast({ title: "Campo atualizado" });
    } catch (err) {
      toast({
        title: "Erro ao atualizar",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  const finalizarEdicao = () => {
    setEditingId(null);
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este cargo?")) return;
    try {
      await api.delete(`/cargos/${id}`);
      setCargos((s) => s.filter((c) => c.id !== id));
      toast({ title: "Removido" });
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Cargos</h2>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Criar novo cargo</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={criarCargo}
              className="grid grid-cols-1 sm:grid-cols-5 gap-3"
            >
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>

              <div>
                <Label>Salário</Label>
                <CurrencyInput
                  value={form.salario} // armazenará string "4200,00"
                  onChange={(v) => setForm({ ...form, salario: v })}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <Label>Adicionais/Tributos</Label>
                <CurrencyInput
                  value={form.adicionais_tributos}
                  onChange={(v) => setForm({ ...form, adicionais_tributos: v })}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <Label>Carga horária semanal</Label>
                <Input
                  value={form.carga_horaria}
                  onChange={(e) =>
                    setForm({ ...form, carga_horaria: e.target.value })
                  }
                  placeholder="44"
                />
              </div>

              <div className="flex items-end">
                <div className="w-full">
                  <Label>Descrição</Label>
                  <Input
                    value={form.descricao}
                    onChange={(e) =>
                      setForm({ ...form, descricao: e.target.value })
                    }
                    placeholder="Atuação em UTI"
                  />
                </div>
              </div>

              <div className="sm:col-span-5 flex gap-2 mt-2">
                <Button type="submit" className="hospital-button-primary">
                  Criar cargo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && <div>Carregando...</div>}
          {cargos.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {c.nome}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {c.descricao || "Sem descrição"}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {editingId === c.id ? (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={finalizarEdicao}
                        title="Finalizar edição"
                        className="h-8 w-8"
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setEditingId(c.id)}
                        title="Editar"
                        className="h-8 w-8"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => excluir(c.id)}
                      title="Excluir"
                      className="h-8 w-8"
                    >
                      <Trash className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-primary">
                      Salário:
                    </span>
                    <span className="text-sm text-foreground">
                      {c.salario ? `R$ ${c.salario}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-primary">
                      Adicionais/Tributos:
                    </span>
                    <span className="text-sm text-foreground">
                      {c.adicionais_tributos
                        ? `R$ ${c.adicionais_tributos}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-primary">
                      Carga:
                    </span>
                    <span className="text-sm text-foreground">
                      {c.carga_horaria ? `${c.carga_horaria}h` : "—"}
                    </span>
                  </div>
                </div>

                {editingId === c.id && (
                  <div className="mt-4 space-y-2 pt-3 border-t border-border">
                    <Input
                      defaultValue={c.nome}
                      onBlur={(e) =>
                        atualizarCampo(c.id, { nome: e.currentTarget.value })
                      }
                      placeholder="Nome do cargo"
                      className="text-sm"
                    />
                    <Input
                      defaultValue={c.salario ?? ""}
                      onBlur={(e) =>
                        atualizarCampo(c.id, {
                          salario: e.currentTarget.value || undefined,
                        })
                      }
                      placeholder="Salário"
                      className="text-sm"
                    />
                    <Input
                      defaultValue={c.adicionais_tributos ?? ""}
                      onBlur={(e) =>
                        atualizarCampo(c.id, {
                          adicionais_tributos:
                            e.currentTarget.value || undefined,
                        })
                      }
                      placeholder="Adicionais/Tributos"
                      className="text-sm"
                    />
                    <Input
                      defaultValue={c.carga_horaria ?? ""}
                      onBlur={(e) =>
                        atualizarCampo(c.id, {
                          carga_horaria: e.currentTarget.value || undefined,
                        })
                      }
                      placeholder="Carga horária"
                      className="text-sm"
                    />
                    <Input
                      defaultValue={c.descricao ?? ""}
                      onBlur={(e) =>
                        atualizarCampo(c.id, {
                          descricao: e.currentTarget.value || undefined,
                        })
                      }
                      placeholder="Descrição"
                      className="text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
