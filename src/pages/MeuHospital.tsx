import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { hospitaisApi, colaboradoresApi, unidadesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DimensionaLogo } from "@/components/DimensionaLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Bed, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Página simplificada para COLABORADOR: mostra somente seu hospital e unidades
// Sem sidebar. Reutiliza estilos básicos.

interface Hospital {
  id: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  scpMetodo?: { key?: string };
}
interface Unidade {
  id: string;
  nome: string;
  leitos?: { id: string }[];
}
interface Colaborador {
  id: string;
  nome: string;
  hospital: Hospital;
}

export default function MeuHospital() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  // Colaboradores completos não são mais necessários (removida a seção Equipe)

  const [loading, setLoading] = useState(true);

  // Estratégia: Carregar todos hospitais e inferir o hospital do colaborador pelo primeiro hospital onde ele aparece na listagem de colaboradores filtrada (API atual não retorna hospitalId no login).
  useEffect(() => {
    const load = async () => {
      console.log(user.id);
      if (!user || user.tipo !== "COLAB") return;
      try {
        setLoading(true);
        // Tentar descobrir hospital via lista de colaboradores filtrando pelo nome (fallback simples)
        const colaborador = (await colaboradoresApi.obter(
          user.id
        )) as Colaborador;

        console.log("Colaborador:", colaborador);
        const hospital = (await hospitaisApi.obter(
          colaborador.hospital.id
        )) as Hospital;

        if (!hospital) {
          toast({
            title: "Atenção",
            description: "Não foi possível identificar o hospital associado.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        // Carregar hospital

        setHospital(hospital);
        // Unidades
        const unidades = (await unidadesApi.listar(hospital.id)) as Unidade[];
        if (!unidades || unidades.length === 0) {
          toast({
            title: "Atenção",
            description: "Não foi possível identificar as unidades associadas.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        setUnidades(unidades);
        // Não carregamos mais colaboradores detalhados (informação sensível removida da view)
      } catch (e) {
        console.error(e);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, toast]);

  if (!user || user.tipo !== "COLAB") {
    return (
      <div className="flex h-screen items-center justify-center">
        Acesso restrito.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header profissional com logo integrada */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo destacada */}
          <div className="flex items-center space-x-4">
            <DimensionaLogo size="lg" variant="white" />
            <span className="text-lg font-semibold">
              {hospital?.nome || "Carregando..."}
            </span>
          </div>

          {/* Título centralizado */}
          <div className="flex-1 flex justify-center">
            <h1 className="text-xl font-bold">Meu Hospital</h1>
          </div>

          {/* Menu do usuário */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold tracking-wide bg-white/20 px-3 py-1 rounded-lg backdrop-blur">
              {user.nome?.split(" ")[0] || user.nome}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        {loading && <div>Carregando...</div>}
        {!loading && !hospital && (
          <div>Nenhum hospital associado encontrado.</div>
        )}
        {hospital && (
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-semibold mb-4">Unidades</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {unidades.map((u) => (
                  <Card
                    key={u.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() =>
                      navigate(`/lista-dias/${hospital.id}/${u.id}`)
                    }
                  >
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-medium">
                        <Building className="h-4 w-4 inline mr-2 text-primary" />
                        {u.nome}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Leitos</span>
                        <div className="flex items-center">
                          <Bed className="h-4 w-4 mr-1 text-muted-foreground" />
                          {u.leitos?.length || 0}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {unidades.length === 0 && (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Sem unidades cadastradas.
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
