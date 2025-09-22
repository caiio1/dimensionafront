import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon, ArrowRight } from "lucide-react";

interface HospitalNavigationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  count?: number;
  countLabel?: string;
  primaryAction: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

export function HospitalNavigationCard({
  title,
  description,
  icon: Icon,
  count,
  countLabel,
  primaryAction,
  secondaryAction,
  children,
  className = "",
}: HospitalNavigationCardProps) {
  return (
    <Card className={`hospital-card group cursor-pointer ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
              {count !== undefined && (
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {count} {countLabel || "itens"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        
        {children}
        
        <div className="flex items-center space-x-2 pt-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              primaryAction.onClick();
            }}
            variant={primaryAction.variant || "default"}
            size="sm"
            className="flex-1"
          >
            {primaryAction.label}
          </Button>
          {secondaryAction && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                secondaryAction.onClick();
              }}
              variant="outline"
              size="sm"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}