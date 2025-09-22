import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Bell, Shield, Database, Mail } from "lucide-react";

export default function Settings() {
  return (
    <DashboardLayout title="Configurações">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Configurações do Sistema
          </h2>
          <p className="text-muted-foreground font-semibold">
            Gerencie as configurações gerais do sistema hospitalar
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configurações Gerais */}
          <Card className="hospital-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5 text-primary" />
                <span>Configurações Gerais</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hospital-name">Nome do Hospital</Label>
                <Input
                  id="hospital-name"
                  defaultValue="Hospital Central"
                  placeholder="Digite o nome do hospital"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">E-mail do Administrador</Label>
                <Input
                  id="admin-email"
                  type="email"
                  defaultValue="admin@hospital.com"
                  placeholder="admin@hospital.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Input
                  id="timezone"
                  defaultValue="America/Sao_Paulo"
                  placeholder="America/Sao_Paulo"
                />
              </div>
              <Button className="w-full">
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card className="hospital-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-primary" />
                <span>Notificações</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber atualizações importantes por e-mail
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Sistema</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre falhas do sistema
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios Automáticos</Label>
                  <p className="text-sm text-muted-foreground">
                    Envio automático de relatórios mensais
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="hospital-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Segurança</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticação de Dois Fatores</Label>
                  <p className="text-sm text-muted-foreground">
                    Adicionar camada extra de segurança
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Tempo Limite de Sessão (minutos)</Label>
                <Input
                  type="number"
                  defaultValue="60"
                  placeholder="60"
                />
              </div>
              <div className="space-y-2">
                <Label>Tentativas de Login Permitidas</Label>
                <Input
                  type="number"
                  defaultValue="3"
                  placeholder="3"
                />
              </div>
              <Button variant="outline" className="w-full">
                Atualizar Configurações de Segurança
              </Button>
            </CardContent>
          </Card>

          {/* Backup e Dados */}
          <Card className="hospital-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <span>Backup e Dados</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Backup Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Backup diário dos dados do sistema
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Frequência do Backup</Label>
                <Input
                  defaultValue="Diário às 02:00"
                  placeholder="Diário às 02:00"
                />
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1">
                  Fazer Backup Agora
                </Button>
                <Button variant="outline" className="flex-1">
                  Restaurar Backup
                </Button>
              </div>
              <div className="bg-muted/20 p-3 rounded-lg">
                <p className="text-sm font-semibold text-foreground">
                  Último backup: Hoje às 02:00
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: Concluído com sucesso
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}