/* eslint-disable react-refresh/only-export-components */
/* @refresh skip */
import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { authApi, api as apiClientRaw } from "@/lib/api";
// typed wrapper for the runtime-augmented api client
const apiClient = apiClientRaw as unknown as {
  setToken?: (token: string | null) => void;
};
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  tipo: "ADMIN";
  email?: string;
  id: string;
  nome: string;
  role?: string;
  cargo?: string | null;
  mustChangePassword?: boolean;
}
interface ColaboradorUser {
  tipo: "COLAB";
  cpf?: string;
  email?: string;
  id: string;
  nome: string;
  role?: string;
  hospital?: { id: string; nome: string } | null;
  cargo?: string | null;
  mustChangePassword?: boolean;
}
export type User = AdminUser | ColaboradorUser;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // identifier = email or cpf
  login: (identifier: string, senha: string) => Promise<void>;
  logout: () => void;
  getUserId: () => string | null;
  userId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth.token");
    const userData = localStorage.getItem("auth.user");

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem("auth.token");
        localStorage.removeItem("auth.user");
      }
    }

    setIsLoading(false);
  }, []);

  const getUserId = () => {
    console.log("User :", user);
    return user.id;
  };

  const login = async (identifier: string, senha: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(identifier, senha);

      console.log("Login response:", response);

      localStorage.setItem("auth.token", response.token);
      apiClient.setToken?.(response.token);

      // Map response to User (no BaseUser inheritance anymore)
      const role = response.role || "OTHER";
      const tipo = role === "ADMIN" ? "ADMIN" : "COLAB";

      setUserId(response.id);
      const common = {
        id: response.id ?? "",
        nome: response.nome || "",
        role: response.role,
        hospital: response.hospital ?? null,
        cargo: response.cargo ?? null,
        mustChangePassword: !!response.mustChangePassword,
      } as const;

      // local typed view of login response (some backends include email)
      const loginResp = response as { email?: string; mensagem?: string };

      if (tipo === "ADMIN") {
        const admin: AdminUser = {
          tipo: "ADMIN",
          id: common.id,
          nome: common.nome,
          role: common.role,
          cargo: common.cargo,
          // prefer explicit email from response, otherwise fall back to identifier when it looks like an email
          email:
            loginResp.email ??
            (identifier.includes("@") ? identifier : undefined),
          mustChangePassword: common.mustChangePassword,
        };
        localStorage.setItem("auth.user", JSON.stringify(admin));
        setUser(admin);
      } else {
        const colaborador: ColaboradorUser = {
          tipo: "COLAB",
          id: common.id,
          nome: common.nome,
          role: common.role,
          hospital: common.hospital ?? undefined,
          cargo: common.cargo,
          // try to infer cpf from identifier when it contains digits
          cpf: /\d{3}/.test(identifier)
            ? identifier.replace(/\D/g, "")
            : undefined,
          email: loginResp.email ?? undefined,
          mustChangePassword: common.mustChangePassword,
        };
        localStorage.setItem("auth.user", JSON.stringify(colaborador));
        setUser(colaborador);
      }

      toast({
        title: "Login realizado",
        description: response.mensagem || "Autenticado",
      });
    } catch (error) {
      toast({
        title: "Erro no login",
        description:
          error instanceof Error ? error.message : "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("auth.token");
    localStorage.removeItem("auth.user");
    apiClient.setToken?.(null);
    setUser(null);
    // single login page now
    window.location.replace("/#/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        userId,
        login,
        logout,
        getUserId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
