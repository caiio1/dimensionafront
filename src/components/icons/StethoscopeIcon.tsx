import * as React from "react";

/**
 * StethoscopeIcon - ícone SVG estilizado (stetoscópio) para uso em botões, sidebar, etc.
 * Props:
 *  - size: número ou string (largura/altura). Default: 32
 *  - className: classes Tailwind adicionais
 *  - strokeWidth: espessura do traçado (default 2)
 */
export interface StethoscopeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number;
}

export const StethoscopeIcon: React.FC<StethoscopeIconProps> = ({
  size = 32,
  strokeWidth = 2,
  className = "",
  ...rest
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {/* Tubos principais */}
      <path
        d="M34 12v32c0 15.464 12.536 28 28 28s28-12.536 28-28V12"
        stroke="#2E2B31"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Orelhas esquerda/direita */}
      <path
        d="M34 12c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke="#6E6A70"
        strokeWidth={strokeWidth}
      />
      <path
        d="M74 12c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke="#6E6A70"
        strokeWidth={strokeWidth}
      />
      {/* Junta inferior em laço */}
      <path
        d="M62 72v18.5c0 10.77-8.73 19.5-19.5 19.5S23 101.27 23 90.5c0-7.456 6.044-13.5 13.5-13.5 4.694 0 8.5 3.806 8.5 8.5 0 3.59-2.91 6.5-6.5 6.5-2.485 0-4.5-2.015-4.5-4.5"
        stroke="#B3B1B5"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Disco / Diafragma */}
      <circle
        cx="100"
        cy="72"
        r="18"
        stroke="#2E2B31"
        strokeWidth={strokeWidth}
        fill="#E5E4E6"
      />
      <circle cx="100" cy="72" r="7" fill="#9C9A9E" />
    </svg>
  );
};

export default StethoscopeIcon;
