import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HierarchyLevel {
  id: string;
  nome: string;
  type: "rede" | "grupo" | "regiao" | "hospital";
}

interface HierarchyBreadcrumbProps {
  levels: HierarchyLevel[];
  onLevelClick?: (level: HierarchyLevel) => void;
  className?: string;
}

export function HierarchyBreadcrumb({
  levels,
  onLevelClick,
  className = "",
}: HierarchyBreadcrumbProps) {
  const typeLabels = {
    rede: "Rede",
    grupo: "Grupo", 
    regiao: "Região",
    hospital: "Hospital",
  };

  const typeColors = {
    rede: "bg-blue-50 text-blue-700 border-blue-200",
    grupo: "bg-green-50 text-green-700 border-green-200",
    regiao: "bg-purple-50 text-purple-700 border-purple-200",
    hospital: "bg-primary/10 text-primary border-primary/20",
  };

  if (levels.length === 0) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {levels.map((level, index) => (
        <div key={level.id} className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${
              typeColors[level.type]
            }`}
            onClick={() => onLevelClick?.(level)}
          >
            <span className="font-medium mr-1">{typeLabels[level.type]}:</span>
            {level.nome}
          </Badge>
          {index < levels.length - 1 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}