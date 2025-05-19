import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, MoreHorizontal, 
  Check, X, Calendar, Building, Briefcase, RefreshCw 
} from 'lucide-react';
import { advisoryService } from './advisoryService';
import { Advisor, AdvisorAssignment } from './types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import GoogleCalendarStatus from './GoogleCalendarStatus';

/**
 * Componente para la gestión de asesores
 * Permite ver, crear, editar y asignar asesores a empresas y programas
 */
const AdvisorManager: React.FC = () => {
  // Estados para la lista de asesores
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [filteredAdvisors, setFilteredAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para la búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  
  // Estados para asignaciones
  const [assignments, setAssignments] = useState<AdvisorAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  // Estados para diálogos
  const [isNewAdvisorDialogOpen, setIsNewAdvisorDialogOpen] = useState(false);
  const [isEditAdvisorDialogOpen, setIsEditAdvisorDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  
  // Cargar asesores al montar el componente
  useEffect(() => {
    fetchAdvisors();
  }, []);
  
  // Filtrar asesores cuando cambia la búsqueda o el filtro
  useEffect(() => {
    if (!advisors) return;
    
    let filtered = [...advisors];
    
    // Aplicar búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(advisor => 
        advisor.name.toLowerCase().includes(term) || 
        advisor.email?.toLowerCase().includes(term) ||
        advisor.specialty?.toLowerCase().includes(term)
      );
    }
    
    // Aplicar filtro de especialidad
    if (filterSpecialty) {
      filtered = filtered.filter(advisor => 
        advisor.specialty === filterSpecialty
      );
    }
    
    setFilteredAdvisors(filtered);
  }, [advisors, searchTerm, filterSpecialty]);
  
  // Extraer especialidades únicas de los asesores
  useEffect(() => {
    if (!advisors) return;
    
    const uniqueSpecialties = Array.from(
      new Set(
        advisors
          .map(advisor => advisor.specialty)
          .filter(specialty => !!specialty) as string[]
      )
    );
    
    setSpecialties(uniqueSpecialties);
  }, [advisors]);
  
  // Función para cargar asesores
  const fetchAdvisors = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await advisoryService.getAdvisors();
      setAdvisors(data);
      setFilteredAdvisors(data);
    } catch (err: any) {
      console.error('Error al cargar asesores:', err);
      setError(err.message || 'Error al cargar asesores');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para cargar asignaciones de un asesor
  const fetchAdvisorAssignments = async (advisorId: string) => {
    setLoadingAssignments(true);
    
    try {
      // Implementar en advisoryService
      const data = await advisoryService.getAdvisorAssignments(advisorId);
      setAssignments(data);
    } catch (err) {
      console.error('Error al cargar asignaciones:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };
  
  // Función para abrir el diálogo de edición de asesor
  const handleEditAdvisor = (advisor: Advisor) => {
    setSelectedAdvisor(advisor);
    setIsEditAdvisorDialogOpen(true);
  };
  
  // Función para abrir el diálogo de asignaciones
  const handleManageAssignments = (advisor: Advisor) => {
    setSelectedAdvisor(advisor);
    fetchAdvisorAssignments(advisor.id);
    setIsAssignDialogOpen(true);
  };
  
  // Función para guardar un nuevo asesor
  const handleSaveNewAdvisor = async (formData: Partial<Advisor>) => {
    try {
      // Implementar en advisoryService
      await advisoryService.createAdvisor(formData);
      setIsNewAdvisorDialogOpen(false);
      fetchAdvisors();
    } catch (err) {
      console.error('Error al crear asesor:', err);
    }
  };
  
  // Función para actualizar un asesor existente
  const handleUpdateAdvisor = async (formData: Partial<Advisor> & { id: string }) => {
    try {
      await advisoryService.updateAdvisor(formData);
      setIsEditAdvisorDialogOpen(false);
      fetchAdvisors();
    } catch (err) {
      console.error('Error al actualizar asesor:', err);
    }
  };
  
  // Función para guardar asignaciones
  const handleSaveAssignments = async (assignments: AdvisorAssignment[]) => {
    try {
      // Implementar en advisoryService
      await advisoryService.updateAdvisorAssignments(assignments);
      setIsAssignDialogOpen(false);
    } catch (err) {
      console.error('Error al guardar asignaciones:', err);
    }
  };
  
  // Renderizar tabla de asesores
  const renderAdvisorsTable = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      );
    }
    
    if (filteredAdvisors.length === 0) {
      return (
        <div className="text-center p-8 text-gray-500">
          No se encontraron asesores con los criterios de búsqueda.
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asesor</TableHead>
            <TableHead>Especialidad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Google Calendar</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAdvisors.map(advisor => (
            <TableRow key={advisor.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={advisor.photo_url || ''} alt={advisor.name} />
                    <AvatarFallback>{advisor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{advisor.name}</div>
                    <div className="text-sm text-gray-500">{advisor.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {advisor.specialty ? (
                  <Badge variant="outline">{advisor.specialty}</Badge>
                ) : (
                  <span className="text-gray-400">No especificada</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={advisor.available ? "success" : "secondary"}>
                  {advisor.available ? 'Disponible' : 'No disponible'}
                </Badge>
              </TableCell>
              <TableCell>
                {advisor.calendar_sync_token ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    <X className="h-3 w-3 mr-1" />
                    No conectado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Acciones</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEditAdvisor(advisor)}>
                      Editar perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleManageAssignments(advisor)}>
                      Gestionar asignaciones
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className={advisor.available ? 'text-red-600' : 'text-green-600'}
                      onClick={() => handleUpdateAdvisor({
                        ...advisor,
                        available: !advisor.available
                      })}
                    >
                      {advisor.available ? 'Marcar como no disponible' : 'Marcar como disponible'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // Componente para el formulario de nuevo asesor
  const NewAdvisorForm = () => {
    const [formData, setFormData] = useState<Partial<Advisor>>({
      name: '',
      email: '',
      specialty: '',
      bio: '',
      phone: '',
      available: true
    });
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSaveNewAdvisor(formData);
    };
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidad</Label>
            <Input
              id="specialty"
              name="specialty"
              value={formData.specialty || ''}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Biografía</Label>
          <Textarea
            id="bio"
            name="bio"
            value={formData.bio || ''}
            onChange={handleChange}
            rows={4}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="available"
            checked={formData.available}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, available: !!checked }))
            }
          />
          <Label htmlFor="available">Disponible para asesorías</Label>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsNewAdvisorDialogOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit">Guardar asesor</Button>
        </DialogFooter>
      </form>
    );
  };
  
  // Componente para el formulario de edición de asesor
  const EditAdvisorForm = () => {
    const [formData, setFormData] = useState<Advisor | null>(selectedAdvisor);
    
    useEffect(() => {
      setFormData(selectedAdvisor);
    }, [selectedAdvisor]);
    
    if (!formData) return null;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData) {
        handleUpdateAdvisor(formData);
      }
    };
    
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre completo</Label>
            <Input
              id="edit-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Correo electrónico</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-specialty">Especialidad</Label>
            <Input
              id="edit-specialty"
              name="specialty"
              value={formData.specialty || ''}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Teléfono</Label>
            <Input
              id="edit-phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="edit-bio">Biografía</Label>
          <Textarea
            id="edit-bio"
            name="bio"
            value={formData.bio || ''}
            onChange={handleChange}
            rows={4}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="edit-available"
            checked={formData.available}
            onCheckedChange={(checked) => 
              setFormData(prev => prev ? { ...prev, available: !!checked } : null)
            }
          />
          <Label htmlFor="edit-available">Disponible para asesorías</Label>
        </div>
        
        {/* Sección de Google Calendar */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Integración con Google Calendar</h3>
          {selectedAdvisor && (
            <GoogleCalendarStatus />
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsEditAdvisorDialogOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit">Guardar cambios</Button>
        </DialogFooter>
      </form>
    );
  };
  
  // Componente para el diálogo de asignaciones
  const AssignmentsDialog = () => {
    if (!selectedAdvisor) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="h-12 w-12">
            <AvatarImage src={selectedAdvisor.photo_url || ''} alt={selectedAdvisor.name} />
            <AvatarFallback>{selectedAdvisor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-medium">{selectedAdvisor.name}</h3>
            <p className="text-sm text-gray-500">{selectedAdvisor.email}</p>
          </div>
        </div>
        
        <Tabs defaultValue="current">
          <TabsList className="mb-4">
            <TabsTrigger value="current">Asignaciones actuales</TabsTrigger>
            <TabsTrigger value="add">Añadir asignaciones</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current">
            {loadingAssignments ? (
              <div className="flex justify-center items-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : assignments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Programa</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map(assignment => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span>{assignment.company?.name || 'Empresa desconocida'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span>{assignment.program?.name || 'Programa desconocido'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <X className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-8 text-gray-500">
                Este asesor no tiene asignaciones actualmente.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="add">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Select>
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company1">Empresa 1</SelectItem>
                    <SelectItem value="company2">Empresa 2</SelectItem>
                    <SelectItem value="company3">Empresa 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="program">Programa</Label>
                <Select>
                  <SelectTrigger id="program">
                    <SelectValue placeholder="Seleccionar programa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="program1">Programa 1</SelectItem>
                    <SelectItem value="program2">Programa 2</SelectItem>
                    <SelectItem value="program3">Programa 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Añadir asignación
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Asesores</h1>
        <Button onClick={() => setIsNewAdvisorDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Asesor
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Asesores</CardTitle>
          <CardDescription>
            Gestiona los perfiles de asesores y sus asignaciones a empresas y programas.
          </CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, email o especialidad..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select
              value={filterSpecialty || ''}
              onValueChange={(value) => setFilterSpecialty(value || null)}
            >
              <SelectTrigger className="w-[200px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{filterSpecialty || 'Filtrar por especialidad'}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las especialidades</SelectItem>
                {specialties.map(specialty => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={fetchAdvisors}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {renderAdvisorsTable()}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {filteredAdvisors.length} de {advisors.length} asesores
          </div>
        </CardFooter>
      </Card>
      
      {/* Diálogo para crear nuevo asesor */}
      <Dialog open={isNewAdvisorDialogOpen} onOpenChange={setIsNewAdvisorDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear nuevo asesor</DialogTitle>
            <DialogDescription>
              Completa el formulario para crear un nuevo perfil de asesor.
            </DialogDescription>
          </DialogHeader>
          <NewAdvisorForm />
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para editar asesor */}
      <Dialog open={isEditAdvisorDialogOpen} onOpenChange={setIsEditAdvisorDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar asesor</DialogTitle>
            <DialogDescription>
              Actualiza la información del perfil de asesor.
            </DialogDescription>
          </DialogHeader>
          <EditAdvisorForm />
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para gestionar asignaciones */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Gestionar asignaciones</DialogTitle>
            <DialogDescription>
              Administra las asignaciones de este asesor a empresas y programas.
            </DialogDescription>
          </DialogHeader>
          <AssignmentsDialog />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvisorManager;
