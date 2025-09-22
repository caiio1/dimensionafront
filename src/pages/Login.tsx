import { useState, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  EyeOff,
  Stethoscope,
  Heart,
  Activity,
  Mail,
  Lock,
  IdCard,
} from "lucide-react";
import medicalTeamImage from "@/assets/medical-team-topview.webp";
import { DimensionaLogo } from "@/components/DimensionaLogo";

type UserType = "admin" | "colaborador";

export default function Login() {
  const { login, isLoading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // unified: single identifier field that accepts e-mail or CPF
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    console.log("Identificador : ", identifier);
    if (!identifier || !password) {
      toast({
        title: "Erro no login",
        description: "Informe e-mail/CPF e senha",
        variant: "destructive",
      });
      return;
    }

    try {
      // normalize inputs: trim whitespace and require email
      const rawIdentifier = identifier;
      const trimmed = rawIdentifier.trim();
      const payloadSenha = password.trim();

      // Enforce email-only login (collaborador login is email now)
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(trimmed)) {
        const errMsg = "Informe um e-mail válido";
        toast({
          title: "Erro no login",
          description: errMsg,
          variant: "destructive",
        });
        return;
      }

      const payloadIdentifier = trimmed;

      // debug: log raw vs sent payload
      console.log("Login payload (raw):", {
        identifier: rawIdentifier,
        senha: password,
      });
      console.log("Login payload (sent):", {
        identifier: payloadIdentifier,
        senha: payloadSenha,
        inferredType: "email",
      });

      await login(payloadIdentifier, payloadSenha);
    } catch (err) {
      const errorMsg = "Credenciais inválidas";
      setError(errorMsg);
      toast({
        title: "Erro no login",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  if (user) {
    // If collaborator needs to change password, redirect
    if (user.tipo === "COLAB" && user?.mustChangePassword) {
      return <Navigate to="/primeiro-acesso" replace />;
    }
    return (
      <Navigate
        to={user.tipo === "COLAB" ? "/meu-hospital" : "/dashboard"}
        replace
      />
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Login Form */}
      <div className="flex-1 lg:flex-[0_0_40%] flex items-center justify-center p-8 bg-gradient-to-br from-primary via-primary to-secondary relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 opacity-20">
          <Stethoscope className="h-16 w-16 text-white" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-20">
          <Heart className="h-12 w-12 text-white" />
        </div>
        <div className="absolute top-1/3 right-16 opacity-15">
          <Activity className="h-20 w-20 text-white" />
        </div>

        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="space-y-6 text-center">
            <div className="mx-auto">
              <DimensionaLogo size="lg" className="mx-auto" />
            </div>
            <div>
              <CardDescription className="text-muted-foreground">
                Acesse sua conta para continuar
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    placeholder="seu@email.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 pl-10 pr-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !identifier || !password}
                className="w-full h-11"
                variant="default"
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:text-secondary transition-colors"
                onClick={() => navigate("/forgot-password")}
              >
                Esqueci minha senha
              </button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              © DIMENSIONA+ · 2025
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Hero Image */}
      <div className="hidden lg:flex flex-[0_0_60%] relative bg-background overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />

        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-32 h-32 border border-primary/20 rounded-full" />
        <div className="absolute top-40 right-40 w-16 h-16 border border-secondary/30 rounded-full" />
        <div className="absolute bottom-32 right-16 w-24 h-24 border border-primary/15 rounded-full" />
        <div className="absolute bottom-20 right-32 w-8 h-8 bg-secondary/20 rounded-full" />

        <img
          src={medicalTeamImage}
          alt="Equipe médica profissional"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />

        <div className="absolute bottom-8 left-8 right-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-primary/10">
            <h2 className="text-xl font-bold text-foreground mb-2">API </h2>
            <p className="text-muted-foreground text-sm">
              Otimize a gestão de equipes, monitore indicadores e melhore a
              qualidade do atendimento com nossa plataforma inteligente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
