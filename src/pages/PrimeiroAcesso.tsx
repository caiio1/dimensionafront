import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { colaboradoresApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DimensionaLogo } from "@/components/DimensionaLogo";

export default function PrimeiroAcesso() {
  const { user, userId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [senha, setSenha] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || user.tipo !== "COLAB") return;
    if (!senha || senha.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter ao menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }
    if (senha !== confirm) {
      toast({
        title: "Confirmação incorreta",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }
    const userid = userId;
    console.log("User ID : ", userid);
    try {
      setLoading(true);
      await colaboradoresApi.alterarSenha(userId, senha);
      // update local stored user to clear mustChangePassword so auth resumes normally
      try {
        const raw = localStorage.getItem("auth.user");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.mustChangePassword = false;
          localStorage.setItem("auth.user", JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }

      toast({
        title: "Senha atualizada",
        description: "Senha alterada com sucesso",
      });
      // navigate to collaborator home (force reload so AuthProvider picks up change)
      window.location.replace("/#/meu-hospital");
    } catch (err: unknown) {
      let message = "Falha ao alterar senha";
      if (err && typeof err === "object") {
        const e = err as Record<string, unknown>;
        if (typeof e.message === "string") message = e.message;
      }
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl p-6">
        <div className="mb-6 text-center">
          <DimensionaLogo size="sm" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Primeiro Acesso — Crie sua senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a nova senha"
                />
              </div>
              <div>
                <Label>Confirme a senha</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="flex items-center justify-between">
                <Button type="submit" disabled={loading}>
                  {loading ? "Alterando..." : "Definir senha"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
