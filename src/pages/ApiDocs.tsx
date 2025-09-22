import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Play, Code2 } from "lucide-react";

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description: string;
  responses: Record<string, string>;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

interface EndpointSection {
  id: string;
  tag: string;
  endpoints: Endpoint[];
}

const ApiDocs = () => {
  const [openSections, setOpenSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const endpoints: EndpointSection[] = [
    {
      id: "users",
      tag: "Usuários",
      endpoints: [
        {
          method: "GET",
          path: "/api/users",
          summary: "Listar todos os usuários",
          description: "Retorna uma lista paginada de todos os usuários do sistema",
          responses: {
            "200": "Lista de usuários retornada com sucesso",
            "401": "Não autorizado",
            "500": "Erro interno do servidor"
          },
          parameters: [
            { name: "page", type: "query", description: "Número da página" },
            { name: "limit", type: "query", description: "Limite de itens por página" }
          ]
        },
        {
          method: "POST",
          path: "/api/users",
          summary: "Criar novo usuário",
          description: "Cria um novo usuário no sistema",
          responses: {
            "201": "Usuário criado com sucesso",
            "400": "Dados inválidos",
            "401": "Não autorizado"
          }
        },
        {
          method: "GET",
          path: "/api/users/{id}",
          summary: "Buscar usuário por ID",
          description: "Retorna os dados de um usuário específico",
          responses: {
            "200": "Usuário encontrado",
            "404": "Usuário não encontrado",
            "401": "Não autorizado"
          }
        },
        {
          method: "PUT",
          path: "/api/users/{id}",
          summary: "Atualizar usuário",
          description: "Atualiza os dados de um usuário existente",
          responses: {
            "200": "Usuário atualizado com sucesso",
            "404": "Usuário não encontrado",
            "400": "Dados inválidos"
          }
        },
        {
          method: "DELETE",
          path: "/api/users/{id}",
          summary: "Deletar usuário",
          description: "Remove um usuário do sistema",
          responses: {
            "204": "Usuário deletado com sucesso",
            "404": "Usuário não encontrado",
            "401": "Não autorizado"
          }
        }
      ]
    },
    {
      id: "departments",
      tag: "Setores",
      endpoints: [
        {
          method: "GET",
          path: "/api/departments",
          summary: "Listar setores",
          description: "Retorna todos os setores hospitalares",
          responses: {
            "200": "Lista de setores retornada com sucesso",
            "401": "Não autorizado"
          }
        },
        {
          method: "POST",
          path: "/api/departments",
          summary: "Criar setor",
          description: "Cria um novo setor hospitalar",
          responses: {
            "201": "Setor criado com sucesso",
            "400": "Dados inválidos"
          }
        }
      ]
    },
    {
      id: "teams",
      tag: "Equipes",
      endpoints: [
        {
          method: "GET",
          path: "/api/teams",
          summary: "Listar equipes",
          description: "Retorna todas as equipes médicas",
          responses: {
            "200": "Lista de equipes retornada com sucesso",
            "401": "Não autorizado"
          }
        },
        {
          method: "POST",
          path: "/api/teams",
          summary: "Criar equipe",
          description: "Cria uma nova equipe médica",
          responses: {
            "201": "Equipe criada com sucesso",
            "400": "Dados inválidos"
          }
        }
      ]
    },
    {
      id: "reports",
      tag: "Relatórios",
      endpoints: [
        {
          method: "GET",
          path: "/api/reports/users",
          summary: "Relatório de usuários",
          description: "Gera relatório em Excel dos usuários",
          responses: {
            "200": "Relatório gerado com sucesso",
            "401": "Não autorizado"
          }
        },
        {
          method: "GET",
          path: "/api/reports/shifts",
          summary: "Análise de turnos",
          description: "Gera análise de turnos em PDF",
          responses: {
            "200": "Relatório gerado com sucesso",
            "401": "Não autorizado"
          }
        }
      ]
    },
    {
      id: "auth",
      tag: "Autenticação",
      endpoints: [
        {
          method: "POST",
          path: "/api/auth/login",
          summary: "Login",
          description: "Autentica usuário no sistema",
          responses: {
            "200": "Login realizado com sucesso",
            "401": "Credenciais inválidas",
            "400": "Dados inválidos"
          }
        },
        {
          method: "POST",
          path: "/api/auth/logout",
          summary: "Logout",
          description: "Encerra sessão do usuário",
          responses: {
            "200": "Logout realizado com sucesso",
            "401": "Não autorizado"
          }
        },
        {
          method: "POST",
          path: "/api/auth/forgot-password",
          summary: "Esqueci minha senha",
          description: "Envia email para recuperação de senha",
          responses: {
            "200": "Email enviado com sucesso",
            "404": "Email não encontrado"
          }
        }
      ]
    }
  ];

  const getMethodColor = (method: string) => {
    const colors = {
      GET: "bg-blue-100 text-blue-800 border-blue-200",
      POST: "bg-green-100 text-green-800 border-green-200",
      PUT: "bg-yellow-100 text-yellow-800 border-yellow-200",
      DELETE: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[method as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getResponseColor = (status: string) => {
    if (status.startsWith("2")) return "text-green-600";
    if (status.startsWith("4")) return "text-red-600";
    if (status.startsWith("5")) return "text-red-700";
    return "text-gray-600";
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">API Dimensiona</h1>
        <p className="text-muted-foreground text-lg">
          Documentação da API do Sistema de Gestão Hospitalar
        </p>
        <div className="flex items-center gap-4 mt-4">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Versão 1.0.0
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Base URL: https://api.dimensiona.com/v1
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {endpoints.map((section) => (
          <Card key={section.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{section.tag}</CardTitle>
                  <CardDescription>
                    {section.endpoints.length} endpoint{section.endpoints.length !== 1 ? 's' : ''} disponível{section.endpoints.length !== 1 ? 'eis' : ''}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection(section.id)}
                >
                  {openSections.includes(section.id) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            
            <Collapsible open={openSections.includes(section.id)}>
              <CollapsibleContent>
                <CardContent className="p-0">
                  {section.endpoints.map((endpoint, index) => (
                    <div key={index} className="border-b last:border-b-0">
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge 
                            variant="outline" 
                            className={`font-mono text-xs ${getMethodColor(endpoint.method)}`}
                          >
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {endpoint.path}
                          </code>
                        </div>
                        
                        <h4 className="font-semibold mb-2">{endpoint.summary}</h4>
                        <p className="text-muted-foreground text-sm mb-4">{endpoint.description}</p>
                        
                        {endpoint.parameters && (
                          <div className="mb-4">
                            <h5 className="font-medium mb-2 text-sm">Parâmetros:</h5>
                            <div className="space-y-1">
                              {endpoint.parameters.map((param, paramIndex) => (
                                <div key={paramIndex} className="text-sm flex items-center gap-2">
                                  <code className="bg-muted px-1 rounded text-xs">{param.name}</code>
                                  <Badge variant="outline" className="text-xs">{param.type}</Badge>
                                  <span className="text-muted-foreground">{param.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <h5 className="font-medium mb-2 text-sm">Respostas:</h5>
                          <div className="space-y-1">
                            {Object.entries(endpoint.responses).map(([status, description]) => (
                              <div key={status} className="text-sm flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getResponseColor(status)}`}
                                >
                                  {status}
                                </Badge>
                                <span className="text-muted-foreground">{description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs">
                            <Play className="h-3 w-3 mr-1" />
                            Testar
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs">
                            <Code2 className="h-3 w-3 mr-1" />
                            Exemplo
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Autenticação</CardTitle>
          <CardDescription>
            Como autenticar suas requisições
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Bearer Token</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Inclua o token de autenticação no header Authorization:
              </p>
              <code className="block bg-muted p-3 rounded text-sm">
                Authorization: Bearer your_token_here
              </code>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Exemplo de requisição</h4>
              <code className="block bg-muted p-3 rounded text-sm whitespace-pre-wrap">
{`curl -X GET "https://api.dimensiona.com/v1/users" \\
  -H "Authorization: Bearer your_token_here" \\
  -H "Content-Type: application/json"`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiDocs;