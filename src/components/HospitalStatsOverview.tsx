import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Users, 
  Bed, 
  Activity, 
  TrendingUp, 
  Globe,
  Network,
  MapPin 
} from "lucide-react";

interface HospitalStatsOverviewProps {
  hospitais: Array<{
    id: string;
    nome: string;
    regiao?: {
      id: string;
      nome: string;
      grupo?: {
        id: string;
        nome: string;
        rede?: {
          id: string;
          nome: string;
        };
      };
    };
    baseline?: {
      quantidade_funcionarios?: number;
      custo_total?: string;
    };
  }>;
  redes: Array<{ id: string; nome: string }>;
  grupos: Array<{ id: string; nome: string }>;
  regioes: Array<{ id: string; nome: string }>;
}

export function HospitalStatsOverview({ 
  hospitais, 
  redes, 
  grupos, 
  regioes 
}: HospitalStatsOverviewProps) {
  // Calcular distribuição por rede
  const distribuicaoPorRede = redes.map((rede) => {
    const hospitaisRede = hospitais.filter(
      (h) => h.regiao?.grupo?.rede?.id === rede.id
    );
    return {
      rede: rede.nome,
      quantidade: hospitaisRede.length,
      percentual: hospitais.length > 0 ? (hospitaisRede.length / hospitais.length) * 100 : 0,
    };
  }).filter(item => item.quantidade > 0);

  // Calcular custos totais
  const custoTotal = hospitais.reduce((acc, h) => {
    const custo = h.baseline?.custo_total;
    if (custo) {
      const valor = parseFloat(custo.replace(/[^\d,]/g, '').replace(',', '.'));
      return acc + (isNaN(valor) ? 0 : valor);
    }
    return acc;
  }, 0);

  const funcionariosTotal = hospitais.reduce((acc, h) => {
    return acc + (h.baseline?.quantidade_funcionarios || 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Distribuição por Rede */}
      <Card className="hospital-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-primary" />
            <span>Distribuição por Rede</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {distribuicaoPorRede.length > 0 ? (
            <div className="space-y-4">
              {distribuicaoPorRede.map((item) => (
                <div key={item.rede} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.rede}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{item.quantidade}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.percentual.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={item.percentual} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma rede configurada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo Financeiro */}
      <Card className="hospital-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Resumo Operacional</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {funcionariosTotal.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total de Funcionários
                </div>
              </div>
              <div className="text-center p-4 bg-secondary/5 rounded-lg">
                <div className="text-2xl font-bold text-secondary">
                  R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-muted-foreground">
                  Custo Total Baseline
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-muted/20 rounded">
                <div className="text-lg font-bold">{redes.length}</div>
                <div className="text-xs text-muted-foreground">Redes</div>
              </div>
              <div className="p-2 bg-muted/20 rounded">
                <div className="text-lg font-bold">{grupos.length}</div>
                <div className="text-xs text-muted-foreground">Grupos</div>
              </div>
              <div className="p-2 bg-muted/20 rounded">
                <div className="text-lg font-bold">{regioes.length}</div>
                <div className="text-xs text-muted-foreground">Regiões</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}