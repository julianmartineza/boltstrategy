import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, UserPlus, X, Check, AlertTriangle } from 'lucide-react';
import { advisoryService } from '../advisory/advisoryService';

interface Advisor {
  id: string;
  name: string;
  email: string;
  specialty: string;
}

interface Company {
  id: string;
  name: string;
  industry: string;
}

interface Program {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  advisor_id: string;
  company_id: string;
  program_id: string;
  advisor_name: string;
  company_name: string;
  program_name: string;
  created_at: string;
}

const AdvisorAssignmentManager: React.FC = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para el formulario de asignación
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAdvisor, setFilterAdvisor] = useState<string>('');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterProgram, setFilterProgram] = useState<string>('');

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

  // Función para cargar todos los datos necesarios
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Cargar asesores
      const { data: advisorsData, error: advisorsError } = await supabase
        .from('advisors')
        .select('id, name, email, specialty')
        .order('name');
      
      if (advisorsError) throw advisorsError;
      
      // Cargar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, industry')
        .order('name');
      
      if (companiesError) throw companiesError;
      
      // Cargar programas
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      
      if (programsError) throw programsError;
      
      // Cargar asignaciones existentes
      await fetchAssignments();
      
      setAdvisors(advisorsData || []);
      setCompanies(companiesData || []);
      setPrograms(programsData || []);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar asignaciones existentes
  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('advisor_assignments')
        .select(`
          id,
          advisor_id,
          company_id,
          program_id,
          created_at,
          advisors:advisor_id(name),
          companies:company_id(name),
          programs:program_id(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transformar los datos para facilitar su uso
      const formattedAssignments = data.map(item => ({
        id: item.id,
        advisor_id: item.advisor_id,
        company_id: item.company_id,
        program_id: item.program_id,
        advisor_name: item.advisors.name,
        company_name: item.companies.name,
        program_name: item.programs.name,
        created_at: item.created_at
      }));
      
      setAssignments(formattedAssignments);
    } catch (err: any) {
      console.error('Error al cargar asignaciones:', err);
      setError('Error al cargar las asignaciones. Por favor, inténtalo de nuevo.');
    }
  };

  // Función para asignar un asesor a una empresa
  const handleAssignAdvisor = async () => {
    if (!selectedAdvisor || !selectedCompany || !selectedProgram) {
      setError('Debes seleccionar un asesor, una empresa y un programa.');
      return;
    }
    
    setAssignmentLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Verificar si ya existe esta asignación
      const exists = assignments.some(
        a => a.advisor_id === selectedAdvisor && 
             a.company_id === selectedCompany && 
             a.program_id === selectedProgram
      );
      
      if (exists) {
        setError('Esta asignación ya existe.');
        return;
      }
      
      // Crear la asignación
      const result = await advisoryService.assignAdvisorToCompany(
        selectedAdvisor,
        selectedCompany,
        selectedProgram
      );
      
      if (!result) {
        throw new Error('Error al crear la asignación');
      }
      
      // Actualizar la lista de asignaciones
      await fetchAssignments();
      
      // Mostrar mensaje de éxito
      setSuccess('Asesor asignado correctamente');
      
      // Limpiar el formulario
      setSelectedAdvisor('');
      setSelectedCompany('');
      setSelectedProgram('');
    } catch (err: any) {
      console.error('Error al asignar asesor:', err);
      setError('Error al asignar el asesor. Por favor, inténtalo de nuevo.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  // Función para eliminar una asignación
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta asignación?')) {
      return;
    }
    
    try {
      const result = await advisoryService.removeAdvisorAssignment(assignmentId);
      
      if (!result) {
        throw new Error('Error al eliminar la asignación');
      }
      
      // Actualizar la lista de asignaciones
      await fetchAssignments();
      
      // Mostrar mensaje de éxito
      setSuccess('Asignación eliminada correctamente');
    } catch (err: any) {
      console.error('Error al eliminar asignación:', err);
      setError('Error al eliminar la asignación. Por favor, inténtalo de nuevo.');
    }
  };

  // Filtrar asignaciones según los criterios seleccionados
  const filteredAssignments = assignments.filter(assignment => {
    // Filtrar por término de búsqueda
    const searchMatch = searchTerm === '' || 
      assignment.advisor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.program_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrar por asesor
    const advisorMatch = filterAdvisor === '' || assignment.advisor_id === filterAdvisor;
    
    // Filtrar por empresa
    const companyMatch = filterCompany === '' || assignment.company_id === filterCompany;
    
    // Filtrar por programa
    const programMatch = filterProgram === '' || assignment.program_id === filterProgram;
    
    return searchMatch && advisorMatch && companyMatch && programMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Gestión de Asignaciones de Asesores</h2>
      
      {/* Mensajes de error y éxito */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-700 hover:text-red-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
          <Check className="h-5 w-5 mr-2" />
          <span>{success}</span>
          <button 
            onClick={() => setSuccess(null)} 
            className="ml-auto text-green-700 hover:text-green-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Formulario para asignar asesor */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Asignar Asesor a Empresa</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asesor
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
            >
              <option value="">Selecciona un asesor</option>
              {advisors.map(advisor => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="">Selecciona una empresa</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Programa
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              <option value="">Selecciona un programa</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={handleAssignAdvisor}
          disabled={assignmentLoading}
        >
          {assignmentLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          Asignar Asesor
        </button>
      </div>
      
      {/* Filtros y búsqueda */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar asignaciones..."
                className="w-full p-2 pl-10 border border-gray-300 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="p-2 border border-gray-300 rounded-md"
              value={filterAdvisor}
              onChange={(e) => setFilterAdvisor(e.target.value)}
            >
              <option value="">Todos los asesores</option>
              {advisors.map(advisor => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.name}
                </option>
              ))}
            </select>
            
            <select
              className="p-2 border border-gray-300 rounded-md"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            >
              <option value="">Todas las empresas</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            
            <select
              className="p-2 border border-gray-300 rounded-md"
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
            >
              <option value="">Todos los programas</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Lista de asignaciones */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asesor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Programa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Asignación
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron asignaciones
                </td>
              </tr>
            ) : (
              filteredAssignments.map(assignment => (
                <tr key={assignment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {assignment.advisor_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.company_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {assignment.program_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(assignment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdvisorAssignmentManager;
