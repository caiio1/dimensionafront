import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  Globe, 
  Network, 
  MapPin, 
  Building2,
  Eye,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Hospital {
  id: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
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
}

interface HierarchyData {
  rede: { id: string; nome: string; descricao?: string };
  grupos: Array<{
    grupo: { id: string; nome: string; descricao?: string };
    regioes: Array<{
      regiao: { id: string; nome: string; descricao?: string };
      hospitais: Hospital[];
    }>;
  }>;
}

interface HospitalHierarchyViewProps {
  organizacaoHierarquica: HierarchyData[];
  hospitaisSemHierarquia: Hospital[];
  searchTerm: string;
  onHospitalView: (id: string) => void;
  onHospitalEdit: (hospital: Hospital) => void;
  onHospitalDelete: (id: string) => void;
}

export function HospitalHierarchyView({
  organizacaoHierarquica,
  hospitaisSemHierarquia,
  searchTerm,
  onHospitalView,
  onHospitalEdit,
  onHospitalDelete,
}: HospitalHierarchyViewProps) {
  const [expandedRedes, setExpandedRedes] = useState<Set<string>>(new Set());
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
  const [expandedRegioes, setExpandedRegioes] = useState<Set<string>>(new Set());

  const toggleRede = (redeId: string) => {
    const newExpanded = new Set(expandedRedes);
    if (newExpanded.has(redeId)) {
      newExpanded.delete(redeId);
    } else {
      newExpanded.add(redeId);
    }
    setExpandedRedes(newExpanded);
  };

  const toggleGrupo = (grupoId: string) => {
    const newExpanded = new Set(expandedGrupos);
    if (newExpanded.has(grupoId)) {
      newExpanded.delete(grupoId);
    } else {
      newExpanded.add(grupoId);
    }
    setExpandedGrupos(newExpanded);
  };

  const toggleRegiao = (regiaoId: string) => {
    const newExpanded = new Set(expandedRegioes);
    if (newExpanded.has(regiaoId)) {
      newExpanded.delete(regiaoId);
    } else {
      newExpanded.add(regiaoId);
    }
    setExpandedRegioes(newExpanded);
  };

  const HospitalMiniCard = ({ hospital }: { hospital: Hospital }) => (
    <div className="group relative bg-background border border-border/50 rounded-lg p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
            {hospital.nome}
          </h4>
          <div className="mt-1 space-y-1">
            {hospital.endereco && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {hospital.endereco}
              </p>
            )}
            {hospital.baseline && (
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-muted-foreground">
                  {hospital.baseline.quantidade_funcionarios || 0} funcionários
                </span>
                {hospital.baseline.custo_total && (
                  <span className="text-muted-foreground">
                    R$ {hospital.baseline.custo_total}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onHospitalView(hospital.id)}
            className="h-7 w-7 p-0"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onHospitalEdit(hospital)}
            className="h-7 w-7 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onHospitalDelete(hospital.id)}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Hierarquia organizacional */}
      {organizacaoHierarquica.map((redeItem) => {
        const totalHospitaisRede = redeItem.grupos.reduce(
          (acc, g) => acc + g.regioes.reduce((acc2, r) => acc2 + r.hospitais.length, 0),
          0
        );

        return (
          <Card key={redeItem.rede.id} className="hospital-card border-l-4 border-l-blue-500">
            <Collapsible
              open={expandedRedes.has(redeItem.rede.id)}
              onOpenChange={() => toggleRede(redeItem.rede.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {expandedRedes.has(redeItem.rede.id) ? (
                        <ChevronDown className="h-5 w-5 text-blue-600" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-blue-600" />
                      )}
                      <Globe className="h-6 w-6 text-blue-600" />
                      <div>
                        <CardTitle className="text-xl">{redeItem.rede.nome}</CardTitle>
                        {redeItem.rede.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {redeItem.rede.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {totalHospitaisRede} hospital{totalHospitaisRede !== 1 ? 'is' : ''}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Rede
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {redeItem.grupos.map((grupoItem) => {
                    const totalHospitaisGrupo = grupoItem.regioes.reduce(
                      (acc, r) => acc + r.hospitais.length,
                      0
                    );

                    return (
                      <div key={grupoItem.grupo.id} className="border-l-2 border-l-green-300 pl-4">
                        <Collapsible
                          open={expandedGrupos.has(grupoItem.grupo.id)}
                          onOpenChange={() => toggleGrupo(grupoItem.grupo.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/20 cursor-pointer transition-colors">
                              <div className="flex items-center space-x-3">
                                {expandedGrupos.has(grupoItem.grupo.id) ? (
                                  <ChevronDown className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-green-600" />
                                )}
                                <Network className="h-5 w-5 text-green-600" />
                                <div>
                                  <span className="font-semibold">{grupoItem.grupo.nome}</span>
                                  {grupoItem.grupo.descricao && (
                                    <p className="text-xs text-muted-foreground">
                                      {grupoItem.grupo.descricao}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                  {totalHospitaisGrupo} hospital{totalHospitaisGrupo !== 1 ? 'is' : ''}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Grupo
                                </Badge>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="space-y-3 mt-2">
                              {grupoItem.regioes.map((regiaoItem) => (
                                <div key={regiaoItem.regiao.id} className="border-l-2 border-l-purple-300 pl-4">
                                  <Collapsible
                                    open={expandedRegioes.has(regiaoItem.regiao.id)}
                                    onOpenChange={() => toggleRegiao(regiaoItem.regiao.id)}
                                  >
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 cursor-pointer transition-colors">
                                        <div className="flex items-center space-x-3">
                                          {expandedRegioes.has(regiaoItem.regiao.id) ? (
                                            <ChevronDown className="h-4 w-4 text-purple-600" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-purple-600" />
                                          )}
                                          <MapPin className="h-4 w-4 text-purple-600" />
                                          <span className="font-medium">{regiaoItem.regiao.nome}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                            {regiaoItem.hospitais.length} hospital{regiaoItem.hospitais.length !== 1 ? 'is' : ''}
                                          </Badge>
                                          <Badge variant="outline" className="text-xs">
                                            Região
                                          </Badge>
                                        </div>
                                      </div>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                      <div className="mt-3 space-y-2">
                                        {regiaoItem.hospitais.length > 0 ? (
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            {regiaoItem.hospitais
                                              .filter((h) =>
                                                h.nome.toLowerCase().includes(searchTerm.toLowerCase())
                                              )
                                              .map((hospital) => (
                                                <HospitalMiniCard key={hospital.id} hospital={hospital} />
                                              ))}
                                          </div>
                                        ) : (
                                          <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                                            Nenhum hospital nesta região
                                          </div>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      {/* Hospitais sem hierarquia */}
      {hospitaisSemHierarquia.length > 0 && (
        <Card className="hospital-card border-l-4 border-l-gray-400">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-gray-600" />
              <span className="text-xl">Hospitais Independentes</span>
              <Badge variant="outline" className="bg-gray-100 text-gray-700">
                Sem Hierarquia
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Hospitais que não estão vinculados a uma região específica
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitaisSemHierarquia
                .filter((h) => h.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((hospital) => (
                  <HospitalMiniCard key={hospital.id} hospital={hospital} />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {organizacaoHierarquica.length === 0 && hospitaisSemHierarquia.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum hospital cadastrado</h3>
            <p className="text-muted-foreground text-center mb-6">
              Comece criando seu primeiro hospital na rede
            </p>
            <Button className="hospital-button-primary">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Hospital
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}