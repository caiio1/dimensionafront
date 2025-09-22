/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useEffect, useState } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { HospitalSidebar } from "./HospitalSidebar";
import { DimensionaLogo } from "./DimensionaLogo";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { colaboradoresApi, hospitaisApi } from "@/lib/api";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

function DashboardContent({ children, title }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [hospitalName, setHospitalName] = useState<string>("");

  useEffect(() => {
    const fetchHospitalName = async () => {
      if (user?.tipo === "COLAB") {
        try {
          const colaborador = (await colaboradoresApi.obter(user.id)) as any;
          if (colaborador?.hospital?.id) {
            const hospital = (await hospitaisApi.obter(
              colaborador.hospital.id
            )) as any;
            setHospitalName(hospital?.nome || "");
          }
        } catch (error) {
          console.error("Erro ao buscar hospital:", error);
        }
      }
    };

    fetchHospitalName();
  }, [user]);

  // Layout para colaboradores (sem sidebar)
  if (user?.tipo === "COLAB") {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <div className="flex flex-col w-full">
          {/* Header profissional com logo integrada */}
          <header className="sticky top-0 z-40 background-gradient text-white shadow-lg">
            {/* Barra principal com logo, hospital e usuário */}
            <div className="flex items-center justify-between px-6 py-4">
              {/* Logo e informações do hospital */}
              <div className="flex items-center space-x-6">
                <DimensionaLogo size="lg" variant="white" />
                {hospitalName && (
                  <div className="hidden md:block">
                    <span className="text-lg font-semibold text-white">
                      {hospitalName}
                    </span>
                  </div>
                )}
              </div>

              {/* Título centralizado se houver */}
              {title && (
                <div className="flex-1 flex justify-center">
                  <h1 className="text-xl font-bold text-white">{title}</h1>
                </div>
              )}

              {/* Menu do usuário */}
              <div className="flex items-center space-x-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-white/20 text-white text-xs font-semibold">
                          {user?.nome?.slice(0, 2).toUpperCase() || "US"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:block text-sm font-medium text-white">
                        {user?.nome || "Usuário"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => logout()}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          {/* Main Content */}
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    );
  }

  // Layout para administradores (com sidebar)
  return (
    <div className="flex min-h-screen w-full bg-background">
      <HospitalSidebar />
      <SidebarInset className="flex flex-col w-full">
        {/* Header profissional com logo integrada */}
        <header className="sticky top-0 z-40 background-gradient text-white shadow-lg">
          {/* Barra principal */}
          <div className="flex items-center justify-between px-6 py-4">
            {/* Sidebar trigger e logo */}
            <div className="flex items-center space-x-6">
              <SidebarTrigger className="lg:hidden text-white hover:bg-white/20 p-2 rounded-lg" />
              <DimensionaLogo size="lg" variant="white" />
            </div>

            {/* Título centralizado se houver */}
            {title && (
              <div className="flex-1 flex justify-center">
                <h1 className="text-xl font-bold text-white">{title}</h1>
              </div>
            )}

            {/* Menu do usuário */}
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-white/20 text-white text-xs font-semibold">
                        {user?.nome?.slice(0, 2).toUpperCase() || "US"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:block text-sm font-medium text-white">
                      {user?.nome || "Usuário"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </SidebarInset>
    </div>
  );
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user } = useAuth();

  // Colaboradores não precisam do SidebarProvider
  if (user?.tipo === "COLAB") {
    return <DashboardContent children={children} title={title} />;
  }

  // Apenas administradores usam o SidebarProvider
  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardContent children={children} title={title} />
    </SidebarProvider>
  );
}
