import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Plus, Clock, Users } from "lucide-react";
import { useState } from "react";

export default function Teams() {
  const [teams, setTeams] = useState([
    {
      id: 1,
      name: "Equipe Alpha",
      department: "UTI",
      shift: "Manhã",
      members: [
        { name: "Dr. Ana Silva", role: "Médico" },
        { name: "Enf. Carlos Santos", role: "Enfermeiro" },
        { name: "Téc. Maria Costa", role: "Técnico" },
      ],
      employeeCount: 3,
      status: "Ativa"
    },
    {
      id: 2,
      name: "Equipe Beta",
      department: "Emergência",
      shift: "Tarde",
      members: [
        { name: "Dr. Pedro Lima", role: "Médico" },
        { name: "Enf. Sofia Rocha", role: "Enfermeiro" },
        { name: "Téc. João Silva", role: "Técnico" },
      ],
      employeeCount: 3,
      status: "Ativa"
    },
    {
      id: 3,
      name: "Equipe Gamma",
      department: "Cardiologia",
      shift: "Noite",
      members: [
        { name: "Dr. Lucas Ferreira", role: "Médico" },
        { name: "Enf. Carla Mendes", role: "Enfermeiro" },
      ],
      employeeCount: 2,
      status: "Inativa"
    },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    shift: "",
    status: "Ativa",
    employeeCount: "0",
  });

  const [editData, setEditData] = useState({
    id: 0,
    employeeCount: 0,
    status: "Ativa",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.department && formData.shift) {
      const newTeam = {
        id: teams.length + 1,
        name: formData.name,
        department: formData.department,
        shift: formData.shift,
        members: [],
        status: formData.status,
        employeeCount: Number(formData.employeeCount) || 0,
      };
      setTeams([...teams, newTeam]);
      setFormData({ name: "", department: "", shift: "", status: "Ativa", employeeCount: "0" });
      setIsOpen(false);
    }
  };

  const handleDelete = (id: number) => {
    setTeams(teams.filter(team => team.id !== id));
  };

  const getShiftBadge = (shift: string) => {
    const colors = {
      "Manhã": "bg-warning text-warning-foreground",
      "Tarde": "bg-secondary text-secondary-foreground", 
      "Noite": "bg-primary text-primary-foreground"
    };
    return <Badge className={colors[shift as keyof typeof colors]}>{shift}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === "Ativa" 
      ? <Badge variant="secondary" className="bg-success text-success-foreground">Ativa</Badge>
      : <Badge variant="secondary" className="bg-muted text-muted-foreground">Inativa</Badge>;
  };

  return (
    <DashboardLayout title="Equipes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Gerenciar Equipes
            </h2>
            <p className="text-muted-foreground font-semibold">
              Organize e gerencie as equipes de trabalho
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Nova Equipe</DialogTitle>
                <DialogDescription>
                  Adicione uma nova equipe de trabalho. Configure os dados básicos da equipe.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Equipe</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Equipe Alpha"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Setor</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({...formData, department: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTI">UTI</SelectItem>
                      <SelectItem value="Emergência">Emergência</SelectItem>
                      <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                      <SelectItem value="Pediatria">Pediatria</SelectItem>
                      <SelectItem value="Neurologia">Neurologia</SelectItem>
                      <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shift">Turno</Label>
                    <Select value={formData.shift} onValueChange={(value) => setFormData({...formData, shift: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Turno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manhã">Manhã</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                        <SelectItem value="Noite">Noite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativa">Ativa</SelectItem>
                        <SelectItem value="Inativa">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeCount">Número de Funcionários</Label>
                  <Input
                    id="employeeCount"
                    type="number"
                    min={0}
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                    placeholder="Ex: 8"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Criar Equipe
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="hospital-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    <span>{team.name}</span>
                  </CardTitle>
                  {getStatusBadge(team.status)}
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span className="font-semibold">{team.department}</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    {getShiftBadge(team.shift)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Membros ({team.members.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {team.members.map((member, memberIndex) => (
                        <div key={memberIndex} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/20">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">
                              {member.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      size="sm"
                      onClick={() => {
                        setEditData({ id: team.id, employeeCount: team.employeeCount ?? team.members.length, status: team.status });
                        setIsEditOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="outline" className="flex-1" size="sm">
                      Ver Escalas
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" 
                      size="sm"
                      onClick={() => handleDelete(team.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Equipe</DialogTitle>
              <DialogDescription>
                Ajuste o número de funcionários e o status da equipe.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setTeams(teams.map(t => t.id === editData.id ? { ...t, employeeCount: editData.employeeCount, status: editData.status } : t));
                setIsEditOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="employeeCountEdit">Número de Funcionários</Label>
                <Input
                  id="employeeCountEdit"
                  type="number"
                  min={0}
                  value={editData.employeeCount}
                  onChange={(e) => setEditData({ ...editData, employeeCount: Number(e.target.value) })}
                  placeholder="Ex: 8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statusEdit">Status</Label>
                <Select
                  value={editData.status}
                  onValueChange={(value) => setEditData({ ...editData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}