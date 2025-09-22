import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Activity, Plus } from "lucide-react";
import { useState } from "react";

export default function Departments() {
  const [departments, setDepartments] = useState([
    { id: 1, name: "Cardiologia", staff: 15, patients: 45, status: "Ativo" },
    { id: 2, name: "Pediatria", staff: 12, patients: 32, status: "Ativo" },
    { id: 3, name: "UTI", staff: 20, patients: 18, status: "Ativo" },
    { id: 4, name: "Emergência", staff: 25, patients: 78, status: "Ativo" },
    { id: 5, name: "Neurologia", staff: 8, patients: 23, status: "Ativo" },
    { id: 6, name: "Ortopedia", staff: 10, patients: 41, status: "Ativo" },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    staff: "",
    patients: "",
    status: "Ativo"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      const newDepartment = {
        id: departments.length + 1,
        name: formData.name,
        staff: parseInt(formData.staff) || 0,
        patients: parseInt(formData.patients) || 0,
        status: formData.status
      };
      setDepartments([...departments, newDepartment]);
      setFormData({ name: "", staff: "", patients: "", status: "Ativo" });
      setIsOpen(false);
    }
  };

  const handleDelete = (id: number) => {
    setDepartments(departments.filter(dept => dept.id !== id));
  };

  return (
    <DashboardLayout title="Setores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Gerenciar Setores
            </h2>
            <p className="text-muted-foreground font-semibold">
              Visualize e gerencie todos os setores hospitalares
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Setor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Setor</DialogTitle>
                <DialogDescription>
                  Adicione um novo setor ao hospital. Preencha as informações básicas.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Setor</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Cardiologia"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff">Funcionários</Label>
                    <Input
                      id="staff"
                      type="number"
                      value={formData.staff}
                      onChange={(e) => setFormData({...formData, staff: e.target.value})}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patients">Pacientes</Label>
                    <Input
                      id="patients"
                      type="number"
                      value={formData.patients}
                      onChange={(e) => setFormData({...formData, patients: e.target.value})}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Criar Setor
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Total de Setores"
            value={departments.length}
            icon={Building2}
            description="setores ativos"
          />
          <StatsCard
            title="Total de Funcionários"
            value={departments.reduce((acc, dept) => acc + dept.staff, 0)}
            icon={Users}
            description="em todos os setores"
          />
          <StatsCard
            title="Pacientes Atendidos"
            value={departments.reduce((acc, dept) => acc + dept.patients, 0)}
            icon={Activity}
            description="atualmente"
          />
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <Card key={dept.id} className="hospital-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>{dept.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-semibold">
                      Funcionários:
                    </span>
                    <span className="text-sm font-semibold">{dept.staff}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-semibold">
                      Pacientes:
                    </span>
                    <span className="text-sm font-semibold">{dept.patients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-semibold">
                      Status:
                    </span>
                    <span className={`text-sm font-semibold ${dept.status === 'Ativo' ? 'text-success' : 'text-muted-foreground'}`}>
                      {dept.status}
                    </span>
                  </div>
                  <div className="pt-2 space-y-2">
                    <Button variant="outline" className="w-full" size="sm">
                      Ver Detalhes
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" 
                      size="sm"
                      onClick={() => handleDelete(dept.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}