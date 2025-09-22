import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  FileText,
  Database,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { DimensionaLogo } from "./DimensionaLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Hospitais", url: "/hospitais", icon: Database },
  { title: "Métodos SCP", url: "/metodos-scp", icon: TrendingUp },
];

const qualitativoItems = [
  { title: "Áreas", url: "/qualitativo/areas", icon: Database },
  { title: "Configuraões", url: "/qualitativo/settings", icon: CheckSquare },
  { title: "Coletas", url: "/api-docs", icon: Users },
];

export function HospitalSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <Sidebar className="bg-white border-r border-gray-200" collapsible="icon">
      <SidebarHeader className="border-b border-gray-200 px-3 py-4 bg-white flex items-center justify-between">
        {!collapsed}
        {/* Mostrar apenas o botão quando colapsado */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100"
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 bg-white">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) => {
                        const base =
                          "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 font-medium";
                        if (isActive)
                          return `${base} hover:hospital-button-primary text-black shadow-md`;
                        return `${base} text-black hover:hospital-button-primary hover:text-white hover:shadow-md hover:scale-[1.02]`;
                      }}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon
                        className={`h-5 w-5 flex-shrink-0 ${"text-black hover:text-white"}`}
                      />
                      {!collapsed && (
                        <span className="font-normal">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/*  
        <SidebarGroup className="mt-8">
          <SidebarGroupLabel
            className={`text-xs font-semibold text-[#003151] uppercase tracking-wider mb-3 px-3 ${
              collapsed ? "sr-only" : ""
            }`}
          >
          Módulo Qualitativo
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {qualitativoItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors font-medium ${
                          isActive
                            ? "bg-[#0B6F88] text-white"
                            : "text-gray-700 hover:bg-blue-50 hover:text-[#0B6F88]"
                        }`
                      }
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon
                        className={`h-5 w-5 flex-shrink-0 ${
                          location.pathname === item.url
                            ? "text-white"
                            : "text-gray-600"
                        }`}
                      />
                      {!collapsed && (
                        <span className="font-normal">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>*/}
      </SidebarContent>
    </Sidebar>
  );
}
