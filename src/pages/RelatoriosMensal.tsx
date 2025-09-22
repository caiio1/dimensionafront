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
import {
  Download,
  ExternalLink,
  Calendar as CalendarIcon,
  Building,
  BedDouble,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { hospitaisApi, unidadesApi, exportApi } from "@/lib/api";

interface HospitalLite {
  id: string;
  nome: string;
}
interface UnidadeLite {
  id: string;
  nome: string;
}

export default function RelatoriosMensal() {
  const { toast } = useToast();
  const [hospitais, setHospitais] = useState<HospitalLite[]>([]);
  const [unidades, setUnidades] = useState<UnidadeLite[]>([]);
  const [hospitalId, setHospitalId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const today = new Date();
  const [dataDiaria, setDataDiaria] = useState<string>(
    today.toISOString().slice(0, 10)
  );
  const [ano, setAno] = useState<number>(today.getFullYear());
  const [mes, setMes] = useState<number>(today.getMonth() + 1);
  const [loadingHospitais, setLoadingHospitais] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Carregar hospitais na montagem
  useEffect(() => {
    (async () => {
      setLoadingHospitais(true);
      try {
        const resp = await hospitaisApi.listar();
        const list: HospitalLite[] = Array.isArray(resp)
          ? resp
          : (resp as { data?: HospitalLite[] })?.data || [];
        setHospitais(list);
      } catch (e) {
        toast({
          title: "Erro",
          description: "Falha ao carregar hospitais",
          variant: "destructive",
        });
      } finally {
        setLoadingHospitais(false);
      }
    })();
  }, [toast]);

  // Carregar unidades ao selecionar hospital
  useEffect(() => {
    if (!hospitalId) {
      setUnidades([]);
      setUnidadeId("");
      return;
    }
    (async () => {
      setLoadingUnidades(true);
      try {
        const resp = await unidadesApi.listar(hospitalId);
        const list: UnidadeLite[] = Array.isArray(resp)
          ? resp
          : (resp as { data?: UnidadeLite[] })?.data || [];
        setUnidades(list);
      } catch (e) {
        toast({
          title: "Erro",
          description: "Falha ao carregar unidades",
          variant: "destructive",
        });
      } finally {
        setLoadingUnidades(false);
      }
    })();
  }, [hospitalId, toast]);

  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];
  const anos = Array.from({ length: 6 }, (_, i) => today.getFullYear() - i);

  const validateSelections = (opts: {
    needMonthly?: boolean;
    needDaily?: boolean;
  }) => {
    if (!hospitalId) {
      toast({
        title: "Hospitais",
        description: "Selecione um hospital",
        variant: "destructive",
      });
      return false;
    }
    if (!unidadeId) {
      toast({
        title: "Unidade",
        description: "Selecione uma unidade",
        variant: "destructive",
      });
      return false;
    }
    if (opts.needDaily && !dataDiaria) {
      toast({
        title: "Data",
        description: "Escolha a data para relatório diário",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const execDownload = async (key: string, fn: () => Promise<unknown>) => {
    if (downloading) return;
    setDownloading(key);
    try {
      await fn();
      toast({ title: "Exportação", description: "Download iniciado" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha na exportação";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const handleResumoDiarioXlsx = async () => {
    if (!validateSelections({ needDaily: true })) return;
    await execDownload("resumo-xlsx", () =>
      exportApi.resumoDiarioXlsx(unidadeId, dataDiaria)
    );
  };
  const handleResumoDiarioPdf = async () => {
    if (!validateSelections({ needDaily: true })) return;
    await execDownload("resumo-pdf", () =>
      exportApi.resumoDiarioPdf(unidadeId, dataDiaria)
    );
  };
  const handleMensalXlsx = async () => {
    if (!validateSelections({})) return;
    await execDownload("mensal-xlsx", () =>
      exportApi.mensalXlsx(unidadeId, ano, mes)
    );
  };
  const handleMensalPdf = async () => {
    if (!validateSelections({})) return;
    await execDownload("mensal-pdf", () =>
      exportApi.mensalPdf(unidadeId, ano, mes)
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Exportar Relatórios
          </h1>
          <p className="text-muted-foreground">
            Gere arquivos XLSX/PDF dos relatórios diário e mensal
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" /> Seleção de Hospital & Unidade
            </CardTitle>
            <CardDescription>
              Escolha o hospital e depois a unidade para liberar os botões de
              exportação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Hospital</Label>
                <Select
                  value={hospitalId}
                  onValueChange={(v) => setHospitalId(v)}
                  disabled={loadingHospitais}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingHospitais ? "Carregando..." : "Selecione"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {hospitais.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={unidadeId}
                  onValueChange={(v) => setUnidadeId(v)}
                  disabled={!hospitalId || loadingUnidades}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !hospitalId
                          ? "Selecione hospital"
                          : loadingUnidades
                          ? "Carregando..."
                          : "Selecione"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data (Resumo Diário)</Label>
                <Input
                  type="date"
                  value={dataDiaria}
                  onChange={(e) => setDataDiaria(e.target.value)}
                  max={today.toISOString().slice(0, 10)}
                  disabled={!unidadeId}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Ano (Relatório Mensal)</Label>
                <Select
                  value={ano.toString()}
                  onValueChange={(v) => setAno(Number(v))}
                  disabled={!unidadeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((a) => (
                      <SelectItem key={a} value={a.toString()}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês (Relatório Mensal)</Label>
                <Select
                  value={mes.toString()}
                  onValueChange={(v) => setMes(Number(v))}
                  disabled={!unidadeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" /> Exportações
            </CardTitle>
            <CardDescription>
              Use os botões abaixo para gerar e baixar cada formato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                disabled={
                  !unidadeId || !dataDiaria || downloading === "resumo-xlsx"
                }
                onClick={handleResumoDiarioXlsx}
              >
                <Download className="h-6 w-6" />
                <span className="text-xs font-medium text-center leading-tight">
                  Resumo Diário XLSX
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                disabled={
                  !unidadeId || !dataDiaria || downloading === "resumo-pdf"
                }
                onClick={handleResumoDiarioPdf}
              >
                <ExternalLink className="h-6 w-6" />
                <span className="text-xs font-medium text-center leading-tight">
                  Resumo Diário PDF
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                disabled={!unidadeId || downloading === "mensal-xlsx"}
                onClick={handleMensalXlsx}
              >
                <Download className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-center leading-tight">
                  Relatório Mensal XLSX
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                disabled={!unidadeId || downloading === "mensal-pdf"}
                onClick={handleMensalPdf}
              >
                <ExternalLink className="h-6 w-6 text-destructive" />
                <span className="text-xs font-medium text-center leading-tight">
                  Relatório Mensal PDF
                </span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-4">
              As exportações utilizam as rotas /export/relatorios/*. Para
              diários, parâmetros: unidadeId & data (YYYY-MM-DD). Para mensais:
              unidadeId, ano, mes.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
