import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Filter, ChevronLeft, ChevronRight, Edit, Trash2, User, Mail, Building, UserCheck } from "lucide-react";

// Dados fictícios
const userData = [
  { id: 1, name: "Dr. Ana Silva", email: "ana.silva@hospital.com", role: "Médico", department: "Cardiologia", status: "Ativo" },
  { id: 2, name: "Enf. Carlos Santos", email: "carlos.santos@hospital.com", role: "Enfermeiro", department: "UTI", status: "Ativo" },
  { id: 3, name: "Dr. Maria Oliveira", email: "maria.oliveira@hospital.com", role: "Médico", department: "Pediatria", status: "Inativo" },
  { id: 4, name: "Téc. João Costa", email: "joao.costa@hospital.com", role: "Técnico", department: "Radiologia", status: "Ativo" },
  { id: 5, name: "Dr. Pedro Lima", email: "pedro.lima@hospital.com", role: "Médico", department: "Neurologia", status: "Ativo" },
  { id: 6, name: "Enf. Sofia Rocha", email: "sofia.rocha@hospital.com", role: "Enfermeiro", department: "Emergência", status: "Ativo" },
  { id: 7, name: "Dr. Lucas Ferreira", email: "lucas.ferreira@hospital.com", role: "Médico", department: "Ortopedia", status: "Inativo" },
  { id: 8, name: "Adm. Carla Mendes", email: "carla.mendes@hospital.com", role: "Administrativo", department: "RH", status: "Ativo" },
];

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [users, setUsers] = useState(userData);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    status: "Ativo"
  });
  const { toast } = useToast();
  const itemsPerPage = 6;

  // Filtrar dados
  const filteredData = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || user.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Função para adicionar novo usuário
  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.role || !newUser.department) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const newUserWithId = {
      ...newUser,
      id: Math.max(...users.map(u => u.id)) + 1
    };

    setUsers([...users, newUserWithId]);
    setNewUser({ name: "", email: "", role: "", department: "", status: "Ativo" });
    setIsNewUserModalOpen(false);
    
    toast({
      title: "Sucesso",
      description: "Usuário adicionado com sucesso!",
    });
  };

  // Função para excluir usuário
  const handleDeleteUser = (userId: number) => {
    setUsers(users.filter(user => user.id !== userId));
    toast({
      title: "Usuário excluído",
      description: "O usuário foi removido do sistema.",
    });
  };

  // Função para alterar status
  const toggleUserStatus = (userId: number) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "Ativo" ? "Inativo" : "Ativo" }
        : user
    ));
    toast({
      title: "Status alterado",
      description: "O status do usuário foi atualizado.",
    });
  };

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: string) => {
    return status === "Ativo" 
      ? <Badge variant="secondary" className="bg-success text-success-foreground">Ativo</Badge>
      : <Badge variant="secondary" className="bg-muted text-muted-foreground">Inativo</Badge>;
  };

  return (
    <DashboardLayout title="Usuários">
      <div className="space-y-6">
        {/* Header com ações */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold gradient-text">
              Gerenciar Usuários
            </h2>
            <p className="text-muted-foreground font-medium">
              Visualize e gerencie todos os usuários do sistema
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                {users.filter(u => u.status === "Ativo").length} ativos
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {users.length} total
              </span>
            </div>
          </div>
          
          <Dialog open={isNewUserModalOpen} onOpenChange={setIsNewUserModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full lg:w-auto hospital-button-primary shadow-lg hover:shadow-xl transition-all duration-200">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Adicionar Novo Usuário
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações para criar um novo usuário no sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nome completo
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex: Dr. João Silva"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao.silva@hospital.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Médico">Médico</SelectItem>
                        <SelectItem value="Enfermeiro">Enfermeiro</SelectItem>
                        <SelectItem value="Técnico">Técnico</SelectItem>
                        <SelectItem value="Administrativo">Administrativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Departamento
                    </Label>
                    <Select value={newUser.department} onValueChange={(value) => setNewUser({...newUser, department: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                        <SelectItem value="UTI">UTI</SelectItem>
                        <SelectItem value="Pediatria">Pediatria</SelectItem>
                        <SelectItem value="Radiologia">Radiologia</SelectItem>
                        <SelectItem value="Neurologia">Neurologia</SelectItem>
                        <SelectItem value="Emergência">Emergência</SelectItem>
                        <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                        <SelectItem value="RH">RH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewUserModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddUser} className="hospital-button-primary">
                  Adicionar Usuário
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros e Busca */}
        <Card className="hospital-card border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 focus:ring-2 focus:ring-primary/20 border-muted-foreground/20"
                  />
                </div>
              </div>
              <div className="w-full lg:w-56">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 border-muted-foreground/20">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="ativo">Apenas Ativos</SelectItem>
                    <SelectItem value="inativo">Apenas Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card className="hospital-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Lista de Usuários ({filteredData.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead className="font-semibold text-foreground">Nome</TableHead>
                      <TableHead className="font-semibold text-foreground">E-mail</TableHead>
                      <TableHead className="font-semibold text-foreground">Cargo</TableHead>
                      <TableHead className="font-semibold text-foreground">Departamento</TableHead>
                      <TableHead className="font-semibold text-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-foreground text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.department}</TableCell>
                        <TableCell>
                          <button onClick={() => toggleUserStatus(user.id)}>
                            {getStatusBadge(user.status)}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center space-x-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir <strong>{user.name}</strong>? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-4">
                {paginatedData.map((user) => (
                  <Card key={user.id} className="p-4 space-y-3 shadow-sm border-border/50">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <button onClick={() => toggleUserStatus(user.id)}>
                        {getStatusBadge(user.status)}
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building className="h-4 w-4" />
                        {user.department}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1 text-destructive border-destructive/20 hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir <strong>{user.name}</strong>? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Paginação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground font-medium">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredData.length)} de {filteredData.length} usuários
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-9"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <div className="hidden sm:flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-9 h-9 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <div className="sm:hidden">
                  <span className="text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-9"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}