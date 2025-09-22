import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Building2,
  Layers3,
  BedDouble,
  Activity,
  CalendarDays,
  Gauge,
  FileBarChart2,
} from "lucide-react";
import {
  hospitaisApi,
  unidadesApi,
  leitosApi,
  colaboradoresApi,
  avaliacoesApi,
  avaliacoesSessaoApi,
} from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";

// Tipagens simples (parciais) para evitar uso de any
interface Hospital {
  id: string;
}
interface Unidade {
  id: string;
  nome?: string;
}
interface Leito {
  id: string;
  numero?: string;
}
interface Internacao {
  id: string;
  leitoId?: string;
  leito?: Leito;
  paciente?: { nome?: string };
  pacienteNome?: string;
  leitoNumero?: string;
  unidade?: { nome?: string };
  unidadeNome?: string;
}
interface Colaborador {
  id: string;
  ativo?: boolean;
}
interface SessaoAtivaDash {
  id: string;
  leitoId?: string;
  leito?: { id?: string; numero?: string };
  unidade?: { nome?: string };
  unidadeNome?: string;
  leitoNumero?: string;
  classificacao?: string;
  classe?: string;
  expiresAt?: string;
}

interface AvaliacaoResumo {
  id?: string;
  classificacao?: string;
  totalPontos?: number;
  created_at?: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [leitos, setLeitos] = useState<Leito[]>([]);
  const [internacoesAtivas, setInternacoesAtivas] = useState<Internacao[]>([]); // mantido caso necessário futuramente
  const [sessoesAtivas, setSessoesAtivas] = useState<SessaoAtivaDash[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoResumo[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hRes, uRes, lRes, cRes, aRes, sRes] = await Promise.all([
          hospitaisApi.listar().catch(() => []),
          unidadesApi.listar().catch(() => []),
          leitosApi.listar().catch(() => []),
          colaboradoresApi.listar().catch(() => []),
          avaliacoesApi.listarTodas().catch(() => []),
          avaliacoesSessaoApi.listarAtivas().catch(() => []),
        ]);
        const norm = <T,>(r: unknown): T[] => {
          if (Array.isArray(r)) return r as T[];
          if (
            r &&
            typeof r === "object" &&
            "data" in r &&
            Array.isArray((r as { data?: unknown }).data)
          ) {
            return ((r as { data?: unknown[] }).data || []) as T[];
          }
          return [] as T[];
        };
        setHospitais(norm(hRes));
        setUnidades(norm(uRes));
        setLeitos(norm(lRes));
        setInternacoesAtivas([]); // não usamos agora
        setColaboradores(norm(cRes));
        setAvaliacoes(norm(aRes).slice(-10).reverse());
        setSessoesAtivas(norm(sRes));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ocupacao = useMemo(() => {
    if (leitos.length === 0) return 0;
    // ocupação baseada em sessões SCP ativas (leitos em avaliação)
    const usados = new Set(
      sessoesAtivas
        .map((s) => s?.leito?.id || s.leitoId)
        .filter((v): v is string => typeof v === "string")
    );
    return Math.round((usados.size / leitos.length) * 100);
  }, [leitos.length, sessoesAtivas]);

  const colaboradoresAtivos = useMemo(
    () => colaboradores.filter((c) => c.ativo !== false).length,
    [colaboradores]
  );

  const classificacaoResumo = useMemo(() => {
    const mapa: Record<string, number> = {};
    avaliacoes.forEach((a) => {
      if (a.classificacao) {
        mapa[a.classificacao] = (mapa[a.classificacao] || 0) + 1;
      }
    });
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [avaliacoes]);

  const quickActions: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
  }[] = [
    { label: "Hospitais", icon: Building2, path: "/hospitais" },
    { label: "Unidades", icon: Layers3, path: "/unidades" },
    { label: "Leitos", icon: BedDouble, path: "/leitos" },
    { label: "Colaboradores", icon: Users, path: "/colaboradores" },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-5">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          <StatsCard
            title="Hospitais"
            value={loading ? "—" : hospitais.length}
            icon={Building2}
          />
          <StatsCard
            title="Unidades"
            value={loading ? "—" : unidades.length}
            icon={Layers3}
          />
          <StatsCard
            title="Leitos"
            value={loading ? "—" : leitos.length}
            icon={BedDouble}
          />
          <StatsCard
            title="Ocupação"
            value={loading ? "—" : `${ocupacao}%`}
            icon={Activity}
            description="Leitos ocupados"
          />
          <StatsCard
            title="Colaboradores Ativos"
            value={loading ? "—" : colaboradoresAtivos}
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Distribuição de Classificação (Avaliações) */}
          <Card className="hospital-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                Distribuição das Avaliações Recentes
              </CardTitle>
              <CardDescription>
                Últimas {avaliacoes.length} avaliações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  Carregando...
                </div>
              ) : classificacaoResumo.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  Sem avaliações registradas
                </div>
              ) : (
                <div className="space-y-4">
                  {classificacaoResumo.map(([classe, qtd]) => {
                    const total = avaliacoes.length || 1;
                    const pct = Math.round((qtd / total) * 100);
                    return (
                      <div key={classe} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{classe}</span>
                          <span>
                            {qtd} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-secondary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas Resumidas */}
          <Card className="hospital-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Resumo
                Operacional
              </CardTitle>
              <CardDescription>Métricas agregadas atuais</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  Carregando...
                </div>
              ) : (
                (() => {
                  const leitosEmSessao = new Set(
                    sessoesAtivas
                      .map((s) => s?.leito?.id || s.leitoId)
                      .filter((v): v is string => typeof v === "string")
                  ).size;
                  const leitosDisponiveis = leitos.length - leitosEmSessao;
                  const topClass = classificacaoResumo.slice(0, 3);
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="p-3 rounded-md border bg-background/50">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                            Leitos Ativos
                          </p>
                          <p className="text-xl font-semibold">
                            {leitosEmSessao}
                          </p>
                        </div>
                        <div className="p-3 rounded-md border bg-background/50">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                            Leitos Disponíveis
                          </p>
                          <p className="text-xl font-semibold">
                            {leitosDisponiveis}
                          </p>
                        </div>
                        <div className="p-3 rounded-md border bg-background/50">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                            Ocupação
                          </p>
                          <p className="text-xl font-semibold">{ocupacao}%</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-2 text-muted-foreground">
                          Top Classificações Recentes
                        </p>
                        {topClass.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            Sem dados suficientes.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {topClass.map(([classe, qtd]) => (
                              <div
                                key={classe}
                                className="flex items-center gap-2"
                              >
                                <span className="text-[11px] font-medium w-28 truncate">
                                  {classe}
                                </span>
                                <div className="h-2 flex-1 bg-muted rounded">
                                  <div
                                    className="h-full bg-gradient-to-r from-primary to-secondary"
                                    style={{
                                      width: `${Math.round(
                                        (qtd / (avaliacoes.length || 1)) * 100
                                      )}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-[11px] text-muted-foreground w-8 text-right">
                                  {qtd}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <Card className="hospital-card">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às páginas principais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="group flex flex-col items-center p-3 rounded-lg border bg-card hover:shadow hover:border-primary/40 transition-colors text-center"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-md flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium group-hover:text-primary leading-tight">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
