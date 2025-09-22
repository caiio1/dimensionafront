import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Plus, Trash2, Save, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { unidadesNaoInternacao } from "@/lib/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TipoUnidadeNaoInternacao,
  TipoSitioFuncional,
  TIPOS_UNIDADE_CONFIG,
  DIAS_SEMANA,
  CreateUnidadeNaoInternacao,
  UnidadeNaoInternacaoResponse,
} from "@/types/unidadeNaoInternacao";

const sitioSchema = z.object({
  numero: z.string().min(1, "Número é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  descricao: z.string().default(""),
  tempo_padrao_procedimento: z.coerce
    .number()
    .min(1, "Tempo deve ser maior que 0"),
  especificacoes: z
    .object({
      capacidade: z.coerce.number().optional(),
      equipamentos: z.array(z.string()).optional(),
      especialidade: z.string().optional(),
      restricoes: z.array(z.string()).optional(),
      observacoes: z.string().optional(),
    })
    .optional(),
});

const cargoSchema = z.object({
  cargoId: z.string().min(1, "Cargo é obrigatório"),
  quantidade_funcionarios: z.coerce
    .number()
    .min(1, "Quantidade deve ser maior que 0"),
});

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  tipo: z.string().min(1, "Tipo é obrigatório"),
  descricao: z.string().optional(),
  horario_inicio: z.string().min(1, "Horário de início é obrigatório"),
  horario_fim: z.string().min(1, "Horário de fim é obrigatório"),
  dias_funcionamento: z.array(z.string()).min(1, "Selecione pelo menos um dia"),
  capacidade_diaria: z.coerce
    .number()
    .min(1, "Capacidade deve ser maior que 0"),
  tempo_medio_procedimento: z.coerce
    .number()
    .min(0.1, "Tempo deve ser maior que 0"),
  sitios_funcionais: z
    .array(sitioSchema)
    .min(1, "Adicione pelo menos um sítio funcional"),
  cargos_unidade: z.array(cargoSchema).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function FormUnidadeNaoInternacao() {
  const navigate = useNavigate();
  const { hospitalId, unidadeId } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dados");
  const [cargosDisponiveis, setCargosDisponiveis] = useState<
    Array<{ id: string; nome: string }>
  >([]);

  const isEdit = !!unidadeId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      tipo: "",
      descricao: "",
      horario_inicio: "07:00",
      horario_fim: "17:00",
      dias_funcionamento: ["seg", "ter", "qua", "qui", "sex"],
      capacidade_diaria: 1,
      tempo_medio_procedimento: 1,
      sitios_funcionais: [],
      cargos_unidade: [],
    },
  });

  const {
    fields: sitiosFields,
    append: appendSitio,
    remove: removeSitio,
  } = useFieldArray({
    control: form.control,
    name: "sitios_funcionais",
  });

  const {
    fields: cargosFields,
    append: appendCargo,
    remove: removeCargo,
  } = useFieldArray({
    control: form.control,
    name: "cargos_unidade",
  });

  const tipoSelecionado = form.watch("tipo") as TipoUnidadeNaoInternacao;
  const tipoConfig = tipoSelecionado
    ? TIPOS_UNIDADE_CONFIG[tipoSelecionado]
    : null;

  const carregarUnidade = useCallback(async () => {
    if (!unidadeId) return;

    try {
      const unidade = (await unidadesNaoInternacao.obter(
        unidadeId
      )) as UnidadeNaoInternacaoResponse;

      form.reset({
        nome: unidade.nome,
        tipo: unidade.tipo,
        descricao: unidade.descricao || "",
        horario_inicio: unidade.horario_inicio,
        horario_fim: unidade.horario_fim,
        dias_funcionamento: unidade.dias_funcionamento,
        capacidade_diaria: unidade.capacidade_diaria,
        tempo_medio_procedimento: unidade.tempo_medio_procedimento,
        sitios_funcionais: unidade.sitiosFuncionais.map((s) => ({
          numero: s.numero,
          nome: s.nome,
          tipo: s.tipo,
          tempo_padrao_procedimento: s.tempo_padrao_procedimento,
          especificacoes: s.especificacoes || {},
        })),
        cargos_unidade: unidade.cargosUnidade.map((c) => ({
          cargoId: c.cargoId,
          quantidade_funcionarios: c.quantidade_funcionarios,
        })),
      });
    } catch (error) {
      console.error("Erro ao carregar unidade:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da unidade",
        variant: "destructive",
      });
    }
  }, [unidadeId, form, toast]);

  const carregarCargos = useCallback(async () => {
    try {
      // Simular cargos - em produção, buscar da API
      setCargosDisponiveis([
        { id: "1", nome: "Enfermeiro" },
        { id: "2", nome: "Técnico de Enfermagem" },
        { id: "3", nome: "Médico" },
        { id: "4", nome: "Auxiliar de Limpeza" },
        { id: "5", nome: "Recepcionista" },
      ]);
    } catch (error) {
      console.error("Erro ao carregar cargos:", error);
    }
  }, []);

  useEffect(() => {
    if (isEdit && unidadeId) {
      carregarUnidade();
    }
    carregarCargos();
  }, [isEdit, unidadeId, carregarUnidade, carregarCargos]);

  const adicionarSitio = () => {
    const numeroSugerido = `${
      tipoConfig?.sitioLabel?.toUpperCase().slice(0, 4) || "SITIO"
    }-${String(sitiosFields.length + 1).padStart(2, "0")}`;

    appendSitio({
      numero: numeroSugerido,
      nome: "",
      tipo: tipoConfig?.sitioTipo || "ESTACAO_TRABALHO",
      descricao: "",
      tempo_padrao_procedimento:
        tipoSelecionado === "CENTRO_CIRURGICO" ? 180 : 30,
      especificacoes: {
        capacidade: 1,
        equipamentos: [],
        especialidade: "",
        restricoes: [],
        observacoes: "",
      },
    });
  };

  const adicionarCargo = () => {
    appendCargo({
      cargoId: "",
      quantidade_funcionarios: 1,
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!hospitalId) return;

    console.log("Dados do formulário:", data);

    setLoading(true);
    try {
      const payload: CreateUnidadeNaoInternacao = {
        hospitalId,
        nome: data.nome,
        tipo: data.tipo as TipoUnidadeNaoInternacao,
        descricao: data.descricao || "",
        horario_inicio: data.horario_inicio,
        horario_fim: data.horario_fim,
        dias_funcionamento: data.dias_funcionamento,
        capacidade_diaria: data.capacidade_diaria,
        tempo_medio_procedimento: data.tempo_medio_procedimento,
        horas_extra_reais: "",
        horas_extra_projetadas: "",
        sitios_funcionais: data.sitios_funcionais.map((sitio) => ({
          numero: sitio.numero,
          nome: sitio.nome,
          tipo: sitio.tipo as TipoSitioFuncional,
          descricao: sitio.descricao || "",
          tempo_padrao_procedimento: sitio.tempo_padrao_procedimento,
          especificacoes: sitio.especificacoes || {},
        })),
        cargos_unidade: (data.cargos_unidade || []).map((cargo) => ({
          cargoId: cargo.cargoId,
          quantidade_funcionarios: cargo.quantidade_funcionarios,
        })),
      };

      console.log("Payload enviado:", payload);

      if (isEdit && unidadeId) {
        console.log("Atualizando unidade:", unidadeId);
        await unidadesNaoInternacao.atualizar(unidadeId, payload);
        toast({
          title: "Sucesso",
          description: "Unidade atualizada com sucesso",
        });
      } else {
        console.log("Criando nova unidade");
        const result = await unidadesNaoInternacao.criar(payload);
        console.log("Resultado da criação:", result);
        toast({
          title: "Sucesso",
          description: "Unidade criada com sucesso",
        });
      }

      navigate(`/hospitais/${hospitalId}/unidades-nao-internacao`);
    } catch (error) {
      console.error("Erro ao salvar unidade:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar unidade",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() =>
            navigate(`/hospitais/${hospitalId}/unidades-nao-internacao`)
          }
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? "Editar" : "Criar"} Unidade de Não-Internação
          </h1>
          <p className="text-gray-600">
            {isEdit
              ? "Modifique os dados da unidade"
              : "Configure uma nova unidade de serviços"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">📋 Dados Básicos</TabsTrigger>
              <TabsTrigger value="sitios">🏥 Sítios Funcionais</TabsTrigger>
              <TabsTrigger value="cargos">👥 Cargos</TabsTrigger>
            </TabsList>

            {/* Aba 1: Dados Básicos */}
            <TabsContent value="dados" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Unidade</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Centro Cirúrgico Principal"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Unidade</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TIPOS_UNIDADE_CONFIG).map(
                              ([tipo, config]) => (
                                <SelectItem key={tipo} value={tipo}>
                                  {config.icon} {config.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva a unidade e suas especialidades"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Horários e Funcionamento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="horario_inicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário de Início</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="horario_fim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário de Término</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tempo_medio_procedimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo Médio (horas)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="1.5"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <FormLabel>Dias de Funcionamento</FormLabel>
                    <FormField
                      control={form.control}
                      name="dias_funcionamento"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                            {DIAS_SEMANA.map((dia) => (
                              <div
                                key={dia.value}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={dia.value}
                                  checked={field.value.includes(dia.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([
                                        ...field.value,
                                        dia.value,
                                      ]);
                                    } else {
                                      field.onChange(
                                        field.value.filter(
                                          (d) => d !== dia.value
                                        )
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={dia.value}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {dia.label}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="capacidade_diaria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacidade Diária (procedimentos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 2: Sítios Funcionais */}
            <TabsContent value="sitios" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <MapPin className="h-5 w-5" />
                        <span>{tipoConfig?.sitioLabel}s</span>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Configure os espaços físicos onde os procedimentos são
                        realizados
                      </p>
                    </div>
                    <Button type="button" onClick={adicionarSitio}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar {tipoConfig?.sitioLabel}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sitiosFields.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-4">🏥</div>
                      <p className="text-gray-600 mb-4">
                        Nenhum {tipoConfig?.sitioLabel?.toLowerCase()}{" "}
                        configurado
                      </p>
                      <Button type="button" onClick={adicionarSitio}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Primeiro {tipoConfig?.sitioLabel}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sitiosFields.map((field, index) => (
                        <Card key={field.id} className="border border-gray-200">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">
                                {tipoConfig?.sitioLabel} {index + 1}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSitio(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`sitios_funcionais.${index}.numero`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Número/Código</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: SALA-01"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`sitios_funcionais.${index}.nome`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: Sala Cirúrgica Cardíaca"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`sitios_funcionais.${index}.tempo_padrao_procedimento`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tempo Padrão (minutos)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="Ex: 180"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`sitios_funcionais.${index}.especificacoes.especialidade`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Especialidade</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: Cardiologia"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba 3: Cargos */}
            <TabsContent value="cargos" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Cargos e Funcionários</CardTitle>
                    <Button type="button" onClick={adicionarCargo}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Cargo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {cargosFields.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-4">👥</div>
                      <p className="text-gray-600 mb-4">
                        Nenhum cargo configurado
                      </p>
                      <Button type="button" onClick={adicionarCargo}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Primeiro Cargo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cargosFields.map((field, index) => (
                        <Card key={field.id} className="border border-gray-200">
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                              <FormField
                                control={form.control}
                                name={`cargos_unidade.${index}.cargoId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cargo</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione o cargo" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {cargosDisponiveis.map((cargo) => (
                                          <SelectItem
                                            key={cargo.id}
                                            value={cargo.id}
                                          >
                                            {cargo.nome}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`cargos_unidade.${index}.quantidade_funcionarios`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quantidade</FormLabel>
                                    <FormControl>
                                      <Input type="number" min="1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCargo(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(`/hospitais/${hospitalId}/unidades-nao-internacao`)
              }
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEdit ? "Atualizar" : "Criar"} Unidade
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
