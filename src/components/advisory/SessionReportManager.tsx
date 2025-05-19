import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Download, Calendar, Clock, User, Building, CheckCircle, AlertTriangle, X, Edit, Trash2, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { advisoryService } from './advisoryService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

// Interfaces
interface SessionReport {
  id: string;
  session_id: string;
  advisor_id: string;
  company_id: string;
  title: string;
  summary: string;
  achievements: string;
  next_steps: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  feedback?: string;
  created_at: string;
  updated_at: string;
}

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  advisor_id: string;
  company_id: string;
  status: string;
  advisor_name?: string;
  company_name?: string;
}

interface FilterOptions {
  search: string;
  status: string;
  dateRange: {
    from: string;
    to: string;
  };
  advisorId: string;
  companyId: string;
}

/**
 * Componente para gestionar los reportes de sesiones de asesoría
 */
const SessionReportManager: React.FC = () => {
  const { user, profile } = useAuthStore();
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [currentReport, setCurrentReport] = useState<SessionReport | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    search: '',
    status: 'all',
    dateRange: {
      from: '',
      to: ''
    },
    advisorId: '',
    companyId: ''
  });
  
  // Cargar reportes al montar el componente
  useEffect(() => {
    if (user) {
      fetchReports();
      fetchSessions();
    }
  }, [user]);
  
  // Función para cargar reportes
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Esta función debe implementarse en advisoryService
      const data = await advisoryService.getSessionReports(user?.id || '', profile?.role || '');
      setReports(data);
    } catch (err: any) {
      console.error('Error al cargar reportes:', err);
      setError(err.message || 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para cargar sesiones sin reportes
  const fetchSessions = async () => {
    try {
      // Esta función debe implementarse en advisoryService
      const data = await advisoryService.getSessionsWithoutReports(user?.id || '', profile?.role || '');
      setSessions(data);
    } catch (err) {
      console.error('Error al cargar sesiones:', err);
    }
  };
  
  // Función para crear un nuevo reporte
  const createReport = async (reportData: Partial<SessionReport>) => {
    try {
      // Esta función debe implementarse en advisoryService
      const success = await advisoryService.createSessionReport({
        ...reportData,
        advisor_id: user?.id || '',
        status: 'draft'
      });
      
      if (success) {
        fetchReports();
        fetchSessions();
        setIsDialogOpen(false);
        setCurrentReport(null);
      }
    } catch (err) {
      console.error('Error al crear reporte:', err);
    }
  };
  
  // Función para actualizar un reporte existente
  const updateReport = async (reportData: Partial<SessionReport>) => {
    if (!currentReport) return;
    
    try {
      // Esta función debe implementarse en advisoryService
      const success = await advisoryService.updateSessionReport({
        ...currentReport,
        ...reportData,
        updated_at: new Date().toISOString()
      });
      
      if (success) {
        fetchReports();
        setIsDialogOpen(false);
        setCurrentReport(null);
      }
    } catch (err) {
      console.error('Error al actualizar reporte:', err);
    }
  };
  
  // Función para eliminar un reporte
  const deleteReport = async (reportId: string) => {
    try {
      // Esta función debe implementarse en advisoryService
      const success = await advisoryService.deleteSessionReport(reportId);
      
      if (success) {
        fetchReports();
        fetchSessions();
      }
    } catch (err) {
      console.error('Error al eliminar reporte:', err);
    }
  };
  
  // Función para cambiar el estado de un reporte
  const changeReportStatus = async (reportId: string, status: string, feedback?: string) => {
    try {
      // Esta función debe implementarse en advisoryService
      const success = await advisoryService.updateSessionReportStatus(reportId, status, feedback);
      
      if (success) {
        fetchReports();
      }
    } catch (err) {
      console.error('Error al cambiar estado del reporte:', err);
    }
  };
  
  // Función para abrir el diálogo de edición
  const openEditDialog = (report: SessionReport) => {
    setCurrentReport(report);
    setIsCreateMode(false);
    setIsDialogOpen(true);
  };
  
  // Función para abrir el diálogo de creación
  const openCreateDialog = (session: Session) => {
    setCurrentReport({
      id: '',
      session_id: session.id,
      advisor_id: session.advisor_id,
      company_id: session.company_id,
      title: `Reporte: ${session.title}`,
      summary: '',
      achievements: '',
      next_steps: '',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    setIsCreateMode(true);
    setIsDialogOpen(true);
  };
  
  // Función para filtrar reportes
  const filteredReports = reports.filter(report => {
    // Filtro por pestaña
    if (activeTab !== 'all' && report.status !== activeTab) return false;
    
    // Filtro por búsqueda
    if (filterOptions.search && 
        !report.title.toLowerCase().includes(filterOptions.search.toLowerCase()) &&
        !report.summary.toLowerCase().includes(filterOptions.search.toLowerCase())) {
      return false;
    }
    
    // Filtro por estado
    if (filterOptions.status !== 'all' && report.status !== filterOptions.status) return false;
    
    // Filtro por fecha
    if (filterOptions.dateRange.from) {
      const fromDate = new Date(filterOptions.dateRange.from);
      const reportDate = new Date(report.created_at);
      if (reportDate < fromDate) return false;
    }
    
    if (filterOptions.dateRange.to) {
      const toDate = new Date(filterOptions.dateRange.to);
      const reportDate = new Date(report.created_at);
      if (reportDate > toDate) return false;
    }
    
    // Filtro por asesor
    if (filterOptions.advisorId && report.advisor_id !== filterOptions.advisorId) return false;
    
    // Filtro por empresa
    if (filterOptions.companyId && report.company_id !== filterOptions.companyId) return false;
    
    return true;
  });
  
  // Obtener color de badge según el estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Borrador</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Enviado</Badge>;
      case 'approved':
        return <Badge variant="success">Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: es });
    } catch (err) {
      return dateString;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Reportes de Sesiones</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchReports()}
              disabled={loading}
            >
              <Search className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
        <CardDescription>
          Gestiona los reportes de las sesiones de asesoría, crea nuevos reportes y revisa el estado de los existentes.
        </CardDescription>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="draft">Borradores</TabsTrigger>
            <TabsTrigger value="submitted">Enviados</TabsTrigger>
            <TabsTrigger value="approved">Aprobados</TabsTrigger>
            <TabsTrigger value="rejected">Rechazados</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {/* Filtros */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por título o contenido..."
                value={filterOptions.search}
                onChange={(e) => setFilterOptions({...filterOptions, search: e.target.value})}
                className="w-full"
                prefix={<Search className="h-4 w-4 mr-2 text-gray-400" />}
              />
            </div>
            <Select
              value={filterOptions.status}
              onValueChange={(value) => setFilterOptions({...filterOptions, status: value})}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="submitted">Enviado</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 rounded-full" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No hay reportes {activeTab !== 'all' ? 'en esta categoría' : ''}</p>
            {sessions.length > 0 && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => openCreateDialog(sessions[0])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear nuevo reporte
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map(report => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.title}</TableCell>
                    <TableCell>{formatDate(report.created_at)}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditDialog(report)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {report.status === 'draft' && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteReport(report.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        {report.status === 'draft' && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => changeReportStatus(report.id, 'submitted')}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {filteredReports.length} de {reports.length} reportes
        </div>
        {sessions.length > 0 && (
          <Button onClick={() => openCreateDialog(sessions[0])}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Reporte
          </Button>
        )}
      </CardFooter>
      
      {/* Diálogo para crear/editar reportes */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreateMode ? 'Crear nuevo reporte' : 'Editar reporte'}
            </DialogTitle>
            <DialogDescription>
              {isCreateMode 
                ? 'Completa la información para crear un nuevo reporte de sesión.' 
                : 'Actualiza la información del reporte de sesión.'}
            </DialogDescription>
          </DialogHeader>
          
          {currentReport && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input 
                  id="title" 
                  value={currentReport.title}
                  onChange={(e) => setCurrentReport({...currentReport, title: e.target.value})}
                  placeholder="Título del reporte"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="summary">Resumen</Label>
                <Textarea 
                  id="summary" 
                  value={currentReport.summary}
                  onChange={(e) => setCurrentReport({...currentReport, summary: e.target.value})}
                  placeholder="Resumen de la sesión"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="achievements">Logros</Label>
                <Textarea 
                  id="achievements" 
                  value={currentReport.achievements}
                  onChange={(e) => setCurrentReport({...currentReport, achievements: e.target.value})}
                  placeholder="Logros alcanzados en la sesión"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="next_steps">Próximos pasos</Label>
                <Textarea 
                  id="next_steps" 
                  value={currentReport.next_steps}
                  onChange={(e) => setCurrentReport({...currentReport, next_steps: e.target.value})}
                  placeholder="Próximos pasos a seguir"
                  rows={3}
                />
              </div>
              
              {currentReport.status === 'rejected' && currentReport.feedback && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <Label className="text-red-700">Feedback de rechazo:</Label>
                  <p className="mt-1 text-red-700">{currentReport.feedback}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => isCreateMode 
                ? createReport(currentReport || {}) 
                : updateReport(currentReport || {})
              }
            >
              {isCreateMode ? 'Crear' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SessionReportManager;
