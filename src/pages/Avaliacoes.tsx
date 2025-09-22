import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, CalendarIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { avaliacoesApi, internacoesApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function Avaliacoes() {
  type LeitoDisponivel = { id?: string; codigo?: string };
  const [formData, setFormData] = useState({
    dataAplicacao: new Date(),
    unidadeId: "",
    leitoId: "",
    pacienteId: "",
    scp: "",
    itens: "{}",
  });
  const [loading, setLoading] = useState(false);
  const [leitosDisponiveis, setLeitosDisponiveis] = useState<LeitoDisponivel[]>(
    []
  );

  const { toast } = useToast();
  const { user } = useAuth();

  // Load saved unidadeId
  useEffect(() => {
    const savedUnidadeId = localStorage.getItem("ui.unidadeId");
    if (savedUnidadeId) {
      setFormData((prev) => ({ ...prev, unidadeId: savedUnidadeId }));
    }
  }, []);

  const handleUnidadeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, unidadeId: value }));
    localStorage.setItem("ui.unidadeId", value);
  };

  const handleConsultarLeitos = async () => {
    if (!formData.unidadeId) {
      toast({
        title: "Erro",
        description: "Por favor, informe a Unidade ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await internacoesApi.leitosDisponiveis(formData.unidadeId);
      setLeitosDisponiveis(
        (Array.isArray(data) ? data : []) as LeitoDisponivel[]
      );
      toast({
        title: "Sucesso",
        description: "Leitos disponíveis carregados",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao consultar leitos disponíveis",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.dataAplicacao ||
      !formData.unidadeId ||
      !formData.leitoId ||
      !formData.pacienteId ||
      !formData.scp
    ) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    let parsedItens: Record<string, number>;
    try {
      parsedItens = JSON.parse(formData.itens);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Formato inválido no campo Itens (deve ser JSON válido)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Calculate total points from items
      const totalPontos = Object.values(parsedItens).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      );

      await avaliacoesApi.criar({
        dataAplicacao: format(formData.dataAplicacao, "yyyy-MM-dd"),
        internacaoId: formData.leitoId, // FIXME: ajuste quando houver seleção direta da internação
        unidadeId: formData.unidadeId,
        scp: formData.scp,
        itens: parsedItens,
        totalPontos,
        classificacao: "PENDENTE", // Default classification
        colaboradorId: user?.tipo === "COLAB" ? user.id : undefined,
      });

      toast({
        title: "Sucesso",
        description: "Avaliação SCP criada com sucesso",
      });

      // Reset form
      setFormData({
        dataAplicacao: new Date(),
        unidadeId: formData.unidadeId, // Keep unidadeId
        leitoId: "",
        pacienteId: "",
        scp: "",
        itens: "{}",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar avaliação SCP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scpOptions = [
    { value: "PERROCA", label: "PERROCA" },
    { value: "FUGULIN", label: "FUGULIN" },
    { value: "DINI_PEDIATRICO", label: "DINI PEDIÁTRICO" },
  ];

  const exemploItens = {
    oxigenacao: 3,
    sinaisVitais: 2,
    mobilidade: 4,
    higiene: 2,
    alimentacao: 1,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Avaliações SCP
          </h1>
          <p className="text-muted-foreground">
            Sistema de Classificação de Pacientes - Registre avaliações de
            cuidados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário Principal */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Nova Avaliação SCP
                </CardTitle>
                <CardDescription>
                  Preencha os dados para registrar uma nova avaliação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data">Data de Aplicação</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.dataAplicacao && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(formData.dataAplicacao, "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.dataAplicacao}
                            onSelect={(date) =>
                              date &&
                              setFormData((prev) => ({
                                ...prev,
                                dataAplicacao: date,
                              }))
                            }
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scp">Sistema SCP</Label>
                      <Select
                        value={formData.scp}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, scp: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o sistema SCP" />
                        </SelectTrigger>
                        <SelectContent>
                          {scpOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unidade">Unidade ID</Label>
                      <Input
                        id="unidade"
                        placeholder="UUID da unidade"
                        value={formData.unidadeId}
                        onChange={(e) => handleUnidadeChange(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leito">Leito ID</Label>
                      <Input
                        id="leito"
                        placeholder="UUID do leito"
                        value={formData.leitoId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            leitoId: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paciente">Paciente ID</Label>
                      <Input
                        id="paciente"
                        placeholder="UUID do paciente"
                        value={formData.pacienteId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            pacienteId: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itens">Itens de Avaliação (JSON)</Label>
                    <Textarea
                      id="itens"
                      placeholder={`Exemplo: ${JSON.stringify(
                        exemploItens,
                        null,
                        2
                      )}`}
                      rows={8}
                      value={formData.itens}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          itens: e.target.value,
                        }))
                      }
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe um objeto JSON com os itens e suas pontuações
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? "Salvando..." : "Salvar Avaliação"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleConsultarLeitos}
                      disabled={!formData.unidadeId}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Consultar Leitos
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Painel Lateral */}
          <div className="space-y-6">
            {/* Leitos Disponíveis */}
            <Card>
              <CardHeader>
                <CardTitle>Leitos Disponíveis</CardTitle>
                <CardDescription>
                  {leitosDisponiveis.length} leito(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leitosDisponiveis.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {leitosDisponiveis.map((leito, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            leitoId: leito.id || leito.codigo || "",
                          }))
                        }
                      >
                        <div className="font-mono text-sm">
                          {leito.codigo || "Sem código"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {leito.id?.slice(0, 8)}...
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum leito encontrado. Clique em "Consultar Leitos" para
                    buscar.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Guia de Sistemas SCP */}
            <Card>
              <CardHeader>
                <CardTitle>Sistemas SCP</CardTitle>
                <CardDescription>
                  Informações sobre os sistemas disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">PERROCA</h4>
                  <p className="text-xs text-muted-foreground">
                    Sistema de classificação para cuidados de enfermagem
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">FUGULIN</h4>
                  <p className="text-xs text-muted-foreground">
                    Classificação focada em complexidade assistencial
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">DINI PEDIÁTRICO</h4>
                  <p className="text-xs text-muted-foreground">
                    Específico para unidades pediátricas
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Exemplo de Itens */}
            <Card>
              <CardHeader>
                <CardTitle>Exemplo de Itens</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(exemploItens, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
