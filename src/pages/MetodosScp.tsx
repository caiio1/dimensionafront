import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Activity,
  Edit,
  Trash2,
  Settings,
  Eye,
  BookOpen,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { metodosScpApi } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ScpFormView } from "@/components/ScpFormView";
import { SCPSchema, SCPType, Question } from "@/lib/scpSchemas";

// Alinhado ao contrato do backend (ScpMetodo)
export interface MetodoScp {
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
  created_at: string;
}

export default function MetodosScp() {
  const [metodos, setMetodos] = useState<MetodoScp[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMetodo, setEditingMetodo] = useState<MetodoScp | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<SCPSchema | null>(null);
  const [builtinTemplates, setBuiltinTemplates] = useState<SCPSchema[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newScpData, setNewScpData] = useState<{
    scp: SCPType;
    title: string;
    description: string;
    questions: Question[];
  } | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
  });
  const [questions, setQuestions] = useState<
    { key: string; text: string; options: { label: string; value: number }[] }[]
  >([]);
  const [faixas, setFaixas] = useState<
    { min: number; max: number; classe: string }[]
  >([]);
  const { toast } = useToast();

  const carregarMetodos = useCallback(async () => {
    try {
      const response = await metodosScpApi.listar();
      const list =
        (Array.isArray(response)
          ? response
          : (response as { data?: MetodoScp[] })?.data) || [];
      setMetodos(list as MetodoScp[]);
    } catch (_error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar métodos SCP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarMetodos();
  }, [carregarMetodos]);

  const toSlugKey = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .toUpperCase()
      .replace(/^_+|_+$/g, "");

  // Converte formatos legados {nome,pontos[]} para o formato oficial {key,text,options[]}
  const normalizeQuestions = (
    raw: unknown[]
  ): {
    key: string;
    text: string;
    options: { label: string; value: number }[];
  }[] => {
    return (raw || []).map((item, idx) => {
      const it = (item || {}) as Record<string, unknown>;
      const hasNewShape =
        typeof it.text === "string" && Array.isArray(it.options as unknown[]);
      if (hasNewShape) {
        const opts = (it.options as unknown[]).map((o) => {
          const oo = (o || {}) as Record<string, unknown>;
          return {
            label: String(oo.label ?? ""),
            value: Number(oo.value ?? 0),
          };
        });
        return {
          key:
            typeof it.key === "string"
              ? it.key
              : toSlugKey((it.text as string) || `ITEM_${idx + 1}`),
          text: it.text as string,
          options: opts,
        };
      }
      const nome =
        typeof it.nome === "string" ? (it.nome as string) : `Item ${idx + 1}`;
      const ptsArr = Array.isArray(it.pontos as unknown[])
        ? (it.pontos as unknown[] as number[])
        : [];
      const options = ptsArr.length
        ? ptsArr.map((v) => ({ label: String(v), value: Number(v) }))
        : [1, 2, 3].map((v) => ({ label: String(v), value: v }));
      return {
        key: typeof it.key === "string" ? (it.key as string) : toSlugKey(nome),
        text: nome,
        options,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // validações simples
      if (!formData.nome.trim()) throw new Error("Informe o nome do método");
      if (!questions.length) throw new Error("Adicione pelo menos uma questão");
      for (const q of questions) {
        if (!q.text?.trim()) throw new Error("Há questões sem texto");
        if (!q.key?.trim()) throw new Error("Há questões sem chave (key)");
        if (!q.options?.length)
          throw new Error("Cada questão precisa de pelo menos uma opção");
        for (const o of q.options) {
          if (
            o.label === undefined ||
            o.label === null ||
            String(o.label).trim() === ""
          )
            throw new Error("Há opções sem rótulo (label)");
          if (Number.isNaN(Number(o.value)))
            throw new Error("Há opções com valor inválido");
        }
      }

      const payloadQuestions = normalizeQuestions(
        questions as unknown as unknown[]
      );

      const createData = {
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        questions: payloadQuestions,
        faixas: faixas.length > 0 ? faixas : undefined,
      };

      if (editingMetodo) {
        // atualizar espera campos do backend; convertemos nome -> title
        await metodosScpApi.atualizar(editingMetodo.id, {
          title: formData.nome,
          description: formData.descricao || undefined,
          questions: payloadQuestions,
          faixas: faixas.length > 0 ? faixas : undefined,
        });
        toast({
          title: "Sucesso",
          description: "Método SCP atualizado com sucesso",
        });
      } else {
        await metodosScpApi.criar(createData);
        toast({
          title: "Sucesso",
          description: "Método SCP criado com sucesso",
        });
      }

      setDialogOpen(false);
      setEditingMetodo(null);
      setFormData({ nome: "", descricao: "" });
      setQuestions([]);
      setFaixas([]);
      carregarMetodos();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  const handleEdit = (metodo: MetodoScp) => {
    setEditingMetodo(metodo);
    setFormData({
      nome: metodo.title,
      descricao: metodo.description || "",
    });
    setQuestions(
      (metodo.questions || []).map((q) => ({
        key: q.key,
        text: q.text,
        options: (q.options || []).map((o) => ({
          label: o.label,
          value: o.value,
        })),
      }))
    );
    setFaixas(metodo.faixas || []);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este método SCP?")) return;

    try {
      await metodosScpApi.excluir(id);
      toast({
        title: "Sucesso",
        description: "Método SCP excluído com sucesso",
      });
      carregarMetodos();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro",
        description: msg || "Erro ao excluir método SCP",
        variant: "destructive",
      });
    }
  };

  const handleCreateFromSchema = (schema: SCPSchema) => {
    setNewScpData({
      scp: schema.scp as SCPType,
      title: schema.title,
      description: schema.description || "",
      questions: schema.questions,
    });
    setShowCreateForm(true);
  };

  const handleCreateFormSubmit = async (_responses: Record<string, number>) => {
    if (!newScpData) return;

    try {
      const questions = newScpData.questions.map((q) => ({
        key: q.key,
        text: q.text,
        options: q.options.map((opt) => ({
          label: opt.label,
          value: opt.value,
        })),
      }));

      const data: {
        nome: string;
        descricao?: string;
        questions: {
          key: string;
          text: string;
          options: { label: string; value: number }[];
        }[];
      } = {
        nome: newScpData.title,
        descricao: newScpData.description,
        questions,
      };

      await metodosScpApi.criar(data);
      toast({
        title: "Sucesso",
        description: "Método SCP criado com sucesso",
      });

      setShowCreateForm(false);
      setNewScpData(null);
      carregarMetodos();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro",
        description: msg || "Erro ao criar método SCP",
        variant: "destructive",
      });
    }
  };

  // sem exemplo em JSON: agora o formulário é visual

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Se está visualizando um schema específico
  if (selectedSchema) {
    return (
      <DashboardLayout>
        <ScpFormView
          schema={selectedSchema}
          onBack={() => setSelectedSchema(null)}
          mode="view"
        />
      </DashboardLayout>
    );
  }

  // Se está criando um novo método baseado em schema
  if (showCreateForm && newScpData) {
    return (
      <DashboardLayout>
        <ScpFormView
          schema={{
            scp: newScpData.scp,
            title: newScpData.title,
            description: newScpData.description,
            questions: newScpData.questions,
          }}
          onBack={() => {
            setShowCreateForm(false);
            setNewScpData(null);
          }}
          mode="create"
          onSubmit={handleCreateFormSubmit}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Métodos SCP</h1>
            <p className="text-muted-foreground">
              Gerencie os métodos de Sistema de Classificação de Pacientes
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Método Personalizado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {editingMetodo
                    ? "Editar Método SCP"
                    : "Novo Método SCP Personalizado"}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6 p-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome do Método *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) =>
                          setFormData({ ...formData, nome: e.target.value })
                        }
                        placeholder="Ex: PRONTUARIO, PERROCA MOD"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            descricao: e.target.value,
                          })
                        }
                        placeholder="Descrição do método de classificação"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Formulário dinâmico de questões */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        Questões
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setQuestions((prev) => [
                            ...prev,
                            {
                              key: toSlugKey(`QUESTAO_${prev.length + 1}`),
                              text: "",
                              options: [
                                { label: "1", value: 1 },
                                { label: "2", value: 2 },
                              ],
                            },
                          ])
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" /> Adicionar questão
                      </Button>
                    </div>

                    {questions.length === 0 && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground text-center">
                          Nenhuma questão adicionada. Clique em "Adicionar
                          questão" para começar.
                        </p>
                      </div>
                    )}

                    {questions.length > 0 && (
                      <div className="max-h-80 overflow-y-auto space-y-3 pr-2 border rounded-lg p-4">
                        {questions.map((q, qi) => (
                          <Card key={qi} className="bg-background">
                            <CardContent className="pt-4 space-y-3">
                              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-end">
                                <div className="lg:col-span-3">
                                  <Label className="text-sm font-medium">
                                    Texto da questão
                                  </Label>
                                  <Input
                                    value={q.text}
                                    onChange={(e) =>
                                      setQuestions((prev) =>
                                        prev.map((x, idx) =>
                                          idx === qi
                                            ? { ...x, text: e.target.value }
                                            : x
                                        )
                                      )
                                    }
                                    placeholder="Ex: Estado mental"
                                    className="text-sm"
                                  />
                                </div>
                                <div className="lg:col-span-2">
                                  <Label className="text-sm font-medium">
                                    Key
                                  </Label>
                                  <Input
                                    value={q.key}
                                    onChange={(e) =>
                                      setQuestions((prev) =>
                                        prev.map((x, idx) =>
                                          idx === qi
                                            ? {
                                                ...x,
                                                key: e.target.value.toUpperCase(),
                                              }
                                            : x
                                        )
                                      )
                                    }
                                    onBlur={(e) => {
                                      if (!e.target.value.trim()) {
                                        setQuestions((prev) =>
                                          prev.map((x, idx) =>
                                            idx === qi
                                              ? {
                                                  ...x,
                                                  key: toSlugKey(
                                                    q.text ||
                                                      `QUESTAO_${qi + 1}`
                                                  ),
                                                }
                                              : x
                                          )
                                        );
                                      }
                                    }}
                                    placeholder="Ex: ESTADO_MENTAL"
                                    className="text-sm"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">
                                    Opções
                                  </Label>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setQuestions((prev) =>
                                          prev.map((x, idx) =>
                                            idx === qi
                                              ? {
                                                  ...x,
                                                  options: [
                                                    ...x.options,
                                                    {
                                                      label: `${
                                                        x.options.length + 1
                                                      }`,
                                                      value:
                                                        x.options.length + 1,
                                                    },
                                                  ],
                                                }
                                              : x
                                          )
                                        )
                                      }
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Opção
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setQuestions((prev) =>
                                          prev.filter((_, idx) => idx !== qi)
                                        )
                                      }
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />{" "}
                                      Remover
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {q.options.map((opt, oi) => (
                                    <div
                                      key={oi}
                                      className="flex gap-2 items-center p-2 border rounded-md bg-muted/30"
                                    >
                                      <div className="flex-1">
                                        <Label className="text-xs">
                                          Rótulo
                                        </Label>
                                        <Input
                                          value={opt.label}
                                          onChange={(e) =>
                                            setQuestions((prev) =>
                                              prev.map((x, idx) => {
                                                if (idx !== qi) return x;
                                                const opts = [...x.options];
                                                opts[oi] = {
                                                  ...opts[oi],
                                                  label: e.target.value,
                                                };
                                                return { ...x, options: opts };
                                              })
                                            )
                                          }
                                          className="text-sm h-8"
                                        />
                                      </div>
                                      <div className="w-20">
                                        <Label className="text-xs">Valor</Label>
                                        <Input
                                          type="number"
                                          value={opt.value}
                                          onChange={(e) =>
                                            setQuestions((prev) =>
                                              prev.map((x, idx) => {
                                                if (idx !== qi) return x;
                                                const opts = [...x.options];
                                                opts[oi] = {
                                                  ...opts[oi],
                                                  value: Number(e.target.value),
                                                };
                                                return { ...x, options: opts };
                                              })
                                            )
                                          }
                                          className="text-sm h-8"
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setQuestions((prev) =>
                                            prev.map((x, idx) => {
                                              if (idx !== qi) return x;
                                              const opts = x.options.filter(
                                                (_, j) => j !== oi
                                              );
                                              return { ...x, options: opts };
                                            })
                                          )
                                        }
                                        className="h-8 w-8 p-0 mt-5"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Faixas de Classificação */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        Faixas de Classificação
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFaixas((prev) => [
                            ...prev,
                            {
                              min: 0,
                              max: 0,
                              classe: "MINIMOS",
                            },
                          ])
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" /> Adicionar faixa
                      </Button>
                    </div>

                    {faixas.length === 0 && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground text-center">
                          Defina as faixas de pontuação para classificação dos
                          pacientes. Se não informado, serão geradas
                          automaticamente.
                        </p>
                      </div>
                    )}

                    {faixas.length > 0 && (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 border rounded-lg p-4">
                        {faixas.map((faixa, fi) => (
                          <Card key={fi} className="bg-background">
                            <CardContent className="pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <div>
                                  <Label className="text-sm font-medium">
                                    Pontuação Mínima
                                  </Label>
                                  <Input
                                    type="number"
                                    value={faixa.min}
                                    onChange={(e) =>
                                      setFaixas((prev) =>
                                        prev.map((f, idx) =>
                                          idx === fi
                                            ? {
                                                ...f,
                                                min: Number(e.target.value),
                                              }
                                            : f
                                        )
                                      )
                                    }
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">
                                    Pontuação Máxima
                                  </Label>
                                  <Input
                                    type="number"
                                    value={faixa.max}
                                    onChange={(e) =>
                                      setFaixas((prev) =>
                                        prev.map((f, idx) =>
                                          idx === fi
                                            ? {
                                                ...f,
                                                max: Number(e.target.value),
                                              }
                                            : f
                                        )
                                      )
                                    }
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">
                                    Classificação
                                  </Label>
                                  <select
                                    value={faixa.classe}
                                    onChange={(e) =>
                                      setFaixas((prev) =>
                                        prev.map((f, idx) =>
                                          idx === fi
                                            ? { ...f, classe: e.target.value }
                                            : f
                                        )
                                      )
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <option value="MINIMOS">Mínimos</option>
                                    <option value="INTERMEDIARIOS">
                                      Intermediários
                                    </option>
                                    <option value="ALTA_DEPENDENCIA">
                                      Alta Dependência
                                    </option>
                                    <option value="SEMI_INTENSIVOS">
                                      Semi-Intensivos
                                    </option>
                                    <option value="INTENSIVOS">
                                      Intensivos
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setFaixas((prev) =>
                                        prev.filter((_, idx) => idx !== fi)
                                      )
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" /> Remover
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingMetodo(null);
                        setFormData({ nome: "", descricao: "" });
                        setQuestions([]);
                        setFaixas([]);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingMetodo ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* SCPs Padrão */}
            {builtinTemplates.map((schema) => (
              <Card
                key={schema.scp}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">
                    <Activity className="h-5 w-5 inline mr-2" />
                    {schema.title}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Padrão
                    </Badge>
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSchema(schema)}
                      title="Visualizar formulário"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCreateFromSchema(schema)}
                      title="Criar método a partir deste"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Tipo:
                      </span>
                      <Badge variant="outline">{schema.scp}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Questões:
                      </span>
                      <div className="flex items-center">
                        <Settings className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          {schema.questions.length}
                        </span>
                      </div>
                    </div>

                    {schema.description && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          {schema.description}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {schema.questions.slice(0, 3).map((question, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {question.text.split(" ")[0]}
                        </Badge>
                      ))}
                      {schema.questions.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{schema.questions.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Métodos Personalizados */}
            {metodos.map((metodo) => (
              <Card key={metodo.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">
                    <Activity className="h-5 w-5 inline mr-2" />
                    {metodo.title}
                    <Badge variant="outline" className="ml-2 text-xs">
                      Personalizado
                    </Badge>
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(metodo)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(metodo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Questões:
                      </span>
                      <div className="flex items-center">
                        <Settings className="h-4 w-4 mr-1" />
                        <span className="font-medium">
                          {metodo.questions.length}
                        </span>
                      </div>
                    </div>

                    {metodo.description && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                          {metodo.description}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mt-2">
                      {metodo.questions.slice(0, 3).map((item, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {item.text.split(" ")[0] || `Item ${index + 1}`}
                        </Badge>
                      ))}
                      {metodo.questions.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{metodo.questions.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {metodos.length === 0 && builtinTemplates.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhum método cadastrado
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  Crie métodos personalizados ou aguarde o carregamento dos
                  métodos padrão
                </p>
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Método Personalizado
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
