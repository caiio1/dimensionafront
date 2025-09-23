import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Building2, 
  Users, 
  Layers3, 
  Activity,
  FileBarChart,
  Settings,
  Globe,
  Network,
  MapPin
} from "lucide-react";

interface HospitalQuickActionsProps {
  onCreateHospital: () => void;
  onManageRedes: () => void;
  onManageGrupos: () => void;
  onManageRegioes: () => void;
  onViewReports: () => void;
  onViewSettings: () => void;
}

export function HospitalQuickActions({
  onCreateHospital,
  onManageRedes,
  onManageGrupos,
  onManageRegioes,
  onViewReports,
  onViewSettings,
}: HospitalQuickActionsProps) {
  const actions = [
    {
      title: "Novo Hospital",
      description: "Cadastrar nova unidade hospitalar",
      icon: Building2,
      onClick: onCreateHospital,
      variant: "primary" as const,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Gerenciar Redes",
      description: "Configurar redes organizacionais",
      icon: Globe,
      onClick: onManageRedes,
      variant: "secondary" as const,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Gerenciar Grupos",
      description: "Organizar grupos regionais",
      icon: Network,
      onClick: onManageGrupos,
      variant: "secondary" as const,
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Gerenciar Regiões",
      description: "Definir regiões geográficas",
      icon: MapPin,
      onClick: onManageRegioes,
      variant: "secondary" as const,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Relatórios",
      description: "Visualizar análises e estatísticas",
      icon: FileBarChart,
      onClick: onViewReports,
      variant: "outline" as const,
      color: "bg-orange-50 text-orange-600",
    },
    {
      title: "Configurações",
      description: "Ajustar parâmetros do sistema",
      icon: Settings,
      onClick: onViewSettings,
      variant: "outline" as const,
      color: "bg-gray-50 text-gray-600",
    },
  ];

  return (
    <Card className="hospital-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary" />
          <span>Ações Rápidas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              className="group text-left p-4 rounded-xl border-2 border-transparent bg-gradient-to-br from-background to-muted/20 hover:border-primary/20 hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}