import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, Clock, Users, Calendar } from "lucide-react";
import { UnidadeNaoInternacaoResponse, TIPOS_UNIDADE_CONFIG } from "@/types/unidadeNaoInternacao";
import { StatusSitio } from "@/components/StatusSitio";

interface UnidadeCardProps {
  unidade: UnidadeNaoInternacaoResponse;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function UnidadeCard({ unidade, onView, onEdit, onDelete }: UnidadeCardProps) {
  const tipoConfig = TIPOS_UNIDADE_CONFIG[unidade.tipo];
  
  const sitiosDisponiveis = unidade.sitiosFuncionais.filter(s => s.status === 'DISPONIVEL').length;
  const sitiosEmUso = unidade.sitiosFuncionais.filter(s => s.status === 'EM_USO').length;
  const totalSitios = unidade.sitiosFuncionais.length;
  
  const diasFormatados = unidade.dias_funcionamento.map(dia => {
    const dias: Record<string, string> = {
      seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', 
      sex: 'Sex', sab: 'Sáb', dom: 'Dom'
    };
    return dias[dia] || dia;
  }).join(', ');

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{tipoConfig.icon}</span>
            <div>
              <CardTitle className="text-lg">{unidade.nome}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {tipoConfig.label}
              </Badge>
            </div>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(unidade.id)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(unidade.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(unidade.id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Estatísticas dos Sítios */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-semibold text-green-700">{sitiosDisponiveis}</div>
            <div className="text-green-600">Disponíveis</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-700">{sitiosEmUso}</div>
            <div className="text-blue-600">Em Uso</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-semibold text-gray-700">{totalSitios}</div>
            <div className="text-gray-600">Total</div>
          </div>
        </div>

        {/* Informações Operacionais */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>{unidade.horario_inicio} - {unidade.horario_fim}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{diasFormatados}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Capacidade: {unidade.capacidade_diaria}/dia</span>
          </div>
        </div>

        {/* Status dos Sítios */}
        {unidade.sitiosFuncionais.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500">
              {tipoConfig.sitioLabel}s Recentes:
            </div>
            <div className="flex flex-wrap gap-1">
              {unidade.sitiosFuncionais.slice(0, 3).map((sitio) => (
                <div key={sitio.id} className="flex items-center space-x-1 text-xs">
                  <span className="font-mono">{sitio.numero}</span>
                  <StatusSitio status={sitio.status} showIcon={false} className="text-xs" />
                </div>
              ))}
              {unidade.sitiosFuncionais.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{unidade.sitiosFuncionais.length - 3} mais
                </span>
              )}
            </div>
          </div>
        )}

        {/* Descrição */}
        {unidade.descricao && (
          <p className="text-sm text-gray-600 line-clamp-2">{unidade.descricao}</p>
        )}
      </CardContent>
    </Card>
  );
}
