import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Download, Calendar, Users, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Reports() {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const { toast } = useToast();

  const generateUsersReport = async () => {
    setIsGenerating("users");
    
    // Simula geração do relatório
    setTimeout(() => {
      // Cria dados fake para o Excel
      const users = [
        ["Nome", "Email", "Setor", "Cargo", "Status", "Data Cadastro"],
        ["Dr. João Silva", "joao@hospital.com", "Cardiologia", "Médico", "Ativo", "2024-01-15"],
        ["Enf. Maria Santos", "maria@hospital.com", "UTI", "Enfermeira", "Ativo", "2024-02-10"],
        ["Dr. Pedro Oliveira", "pedro@hospital.com", "Neurologia", "Médico", "Ativo", "2024-01-20"],
        ["Enf. Ana Costa", "ana@hospital.com", "Pediatria", "Enfermeira", "Ativo", "2024-03-05"],
        ["Tec. Carlos Lima", "carlos@hospital.com", "Laboratório", "Técnico", "Inativo", "2023-12-01"]
      ];

      // Gera arquivo Excel (.xlsx)
      const excelContent = users.map(row => row.join("\t")).join("\n");
      const blob = new Blob([excelContent], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio-usuarios-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Relatório gerado com sucesso!",
        description: "O arquivo Excel foi baixado com os dados dos usuários.",
      });
      
      setIsGenerating(null);
    }, 2000);
  };

  const generateShiftsReport = async () => {
    setIsGenerating("shifts");
    
    // Simula geração do relatório PDF
    setTimeout(() => {
      // Simula criação de PDF com dados fake
      const pdfContent = `
DIMENSIONA - Gestão Inteligente de Equipes Hospitalares
RELATÓRIO DE ANÁLISE DE TURNOS
Data: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}

=== RESUMO EXECUTIVO ===
Total de Turnos Analisados: 156
Ocupação Média: 87%
Eficiência Operacional: 92%

=== ANÁLISE POR SETOR ===
Cardiologia: 23 turnos | 89% ocupação
UTI: 45 turnos | 95% ocupação  
Neurologia: 18 turnos | 82% ocupação
Pediatria: 32 turnos | 85% ocupação
Laboratório: 38 turnos | 91% ocupação

=== INDICADORES DE PERFORMANCE ===
Pontualidade: 94%
Absenteísmo: 3.2%
Horas Extras: 12.5%
Satisfação Equipe: 8.7/10

=== RECOMENDAÇÕES ===
- Otimizar escalas na Neurologia
- Reduzir horas extras no geral
- Implementar rodízio de turnos

Relatório gerado automaticamente pelo sistema DIMENSIONA.
      `;

      const blob = new Blob([pdfContent], { type: "application/pdf" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `analise-turnos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Relatório gerado com sucesso!",
        description: "O arquivo PDF foi baixado com a análise de turnos.",
      });
      
      setIsGenerating(null);
    }, 2500);
  };

  const reportsData = [
    {
      id: "users",
      title: "Relatório de Usuários",
      description: "Lista completa de usuários com dados de perfil, setores e status",
      icon: Users,
      format: "Excel (.xlsx)",
      action: generateUsersReport,
      color: "bg-blue-500",
      stats: "247 usuários cadastrados"
    },
    {
      id: "shifts",
      title: "Análise de Turnos",
      description: "Relatório detalhado sobre distribuição e eficiência dos turnos",
      icon: Clock,
      format: "PDF (.pdf)",
      action: generateShiftsReport,
      color: "bg-green-500",
      stats: "156 turnos analisados"
    }
  ];

  return (
    <DashboardLayout title="Relatórios">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Central de Relatórios</h2>
            <p className="text-muted-foreground">Gere relatórios detalhados para análise de dados</p>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Relatórios Excel</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Relatórios PDF</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Este Mês</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reportsData.map((report) => {
            const Icon = report.icon;
            const isLoading = isGenerating === report.id;
            
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${report.color} bg-opacity-10`}>
                        <Icon className={`h-6 w-6`} style={{ color: report.color.replace('bg-', '').replace('-500', '') }} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {report.format}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Dados disponíveis:</span>
                      <span className="font-medium">{report.stats}</span>
                    </div>
                    
                    <Button 
                      onClick={report.action}
                      disabled={isLoading}
                      className="w-full"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Gerando relatório...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Gerar e Baixar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Recentes</CardTitle>
            <CardDescription>Últimos relatórios gerados pelo sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Relatório de Usuários - Janeiro", date: "2024-01-31", type: "Excel", size: "2.3 MB" },
                { name: "Análise de Turnos - Dezembro", date: "2023-12-31", type: "PDF", size: "1.8 MB" },
                { name: "Performance Mensal", date: "2023-12-15", type: "PDF", size: "3.1 MB" },
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {report.type === "Excel" ? (
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">{report.date} • {report.size}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}