import {
  STATUS_SITIO_CONFIG,
  StatusSitioFuncional,
} from "@/types/unidadeNaoInternacao";
import { Badge } from "@/components/ui/badge";

interface StatusSitioProps {
  status: StatusSitioFuncional | undefined;
  showIcon?: boolean;
  className?: string;
}

export function StatusSitio({
  status,
  showIcon = true,
  className = "",
}: StatusSitioProps) {
  // Verificação de segurança para status undefined
  if (!status || !STATUS_SITIO_CONFIG[status]) {
    return (
      <Badge className={`bg-gray-100 text-gray-800 ${className}`}>
        {showIcon && <span className="mr-1">❓</span>}
        Indefinido
      </Badge>
    );
  }

  const config = STATUS_SITIO_CONFIG[status];

  return (
    <Badge className={`${config.color} ${className}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
