interface DimensionaLogoProps {
  className?: string;
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  hideTagline?: boolean;
  variant?: "default" | "white"; // para usar na barra azul
}

export function DimensionaLogo({
  className = "",
  size = "lg",
  hideTagline = false,
  variant = "default",
}: DimensionaLogoProps) {
  const sizeClasses = {
    xxs: {
      image: "h-8",
    },
    xs: {
      image: "h-10",
    },
    sm: {
      image: "h-14",
    },
    md: {
      image: "h-20",
    },
    lg: {
      image: "h-24",
    },
    xl: {
      image: "h-28",
    },
    "2xl": {
      image: "h-32",
    },
  } as const;

  const currentSize = sizeClasses[size];
  const logoSrc =
    variant === "white"
      ? "/lovable-uploads/logo.png"
      : "/lovable-uploads/184f17fa-3692-4310-8190-9cc7760de3a2.png";
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={logoSrc}
        alt="DIMENSIONA+ - Gestão Inteligente de Equipes Hospitalares"
        className={`${currentSize.image} w-auto object-contain`}
      />
    </div>
  );
}
