import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, X, UserCog, Building, Calendar, Mail, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Advisor, AdvisorAssignment } from '../advisory/types';

interface Company {
  id: string;
  name: string;
}

interface Program {
  id: string;
  name: string;
}

const AdvisorManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [assignments, setAssignments] = useState<AdvisorAssignment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  
  // Cargar datos del asesor
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar perfil del asesor
        const { data: advisorData, error: advisorError } = await supabase
          .from('advisors')
          .select('*')
          .eq('id', id)
          .single();
        
        if (advisorError) throw advisorError;
        
        // Cargar asignaciones del asesor
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('advisor_assignments')
          .select(`
            *,
            company:company_id (
              id,
              name
            ),
            program:program_id (
              id,
              name
            )
          `)
          .eq('advisor_id', id);
        
        if (assignmentsError) throw assignmentsError;
        
        // Cargar todas las empresas
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name')
          .order('name');
        
        if (companiesError) throw companiesError;
        
        // Cargar todos los programas
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('id, name')
          .order('name');
        
        if (programsError) throw programsError;
        
        setAdvisor(advisorData);
        setAssignments(assignmentsData || []);
        setCompanies(companiesData || []);
        setPrograms(programsData || []);
      } catch (err) {
        console.error('Error al cargar datos del asesor:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    }
  }, [id]);
  
  // Guardar cambios en el perfil del asesor
  const handleSaveAdvisor = async () => {
    if (!advisor) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('advisors')
        .update({
          name: advisor.name,
          bio: advisor.bio,
          specialty: advisor.specialty,
          email: advisor.email,
          phone: advisor.phone,
          photo_url: advisor.photo_url,
          google_account_email: advisor.google_account_email,
          available: advisor.available,
          updated_at: new Date().toISOString()
        })
        .eq('id', advisor.id);
      
      if (error) throw error;
      
      setSuccess('Perfil de asesor actualizado exitosamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al guardar perfil de asesor:', err);
      setError('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };
  
  // Asignar asesor a empresa y programa
  const handleAssignCompany = async () => {
    if (!advisor || !selectedCompany || !selectedProgram) {
      setError('Debes seleccionar una empresa y un programa.');
      return;
    }
    
    try {
      setSaving(true);
      
      // Verificar si ya existe esta asignación
      const exists = assignments.some(
        a => a.company_id === selectedCompany && a.program_id === selectedProgram
      );
      
      if (exists) {
        setError('Esta asignación ya existe.');
        setSaving(false);
        return;
      }
      
      // Crear nueva asignación
      const { data, error } = await supabase.rpc('assign_advisor_to_company', {
        p_advisor_id: advisor.id,
        p_company_id: selectedCompany,
        p_program_id: selectedProgram
      });
      
      if (error) throw error;
      
      // Obtener detalles de la empresa y programa
      const company = companies.find(c => c.id === selectedCompany);
      const program = programs.find(p => p.id === selectedProgram);
      
      // Añadir a la lista de asignaciones
      if (data && company && program) {
        const newAssignment: AdvisorAssignment = {
          id: data,
          advisor_id: advisor.id,
          company_id: selectedCompany,
          program_id: selectedProgram,
          created_at: new Date().toISOString(),
          company: {
            id: company.id,
            name: company.name
          },
          program: {
            id: program.id,
            name: program.name
          }
        };
        
        setAssignments([...assignments, newAssignment]);
        setSelectedCompany('');
        setSelectedProgram('');
        setSuccess('Empresa asignada exitosamente.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error al asignar empresa:', err);
      setError('Error al asignar la empresa. Por favor, inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };
  
  // Eliminar asignación
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta asignación?')) {
      try {
        setSaving(true);
        
        const { error } = await supabase
          .from('advisor_assignments')
          .delete()
          .eq('id', assignmentId);
        
        if (error) throw error;
        
        setAssignments(assignments.filter(a => a.id !== assignmentId));
        setSuccess('Asignación eliminada exitosamente.');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error('Error al eliminar asignación:', err);
        setError('Error al eliminar la asignación. Por favor, inténtalo de nuevo.');
      } finally {
        setSaving(false);
      }
    }
  };
  
  // Actualizar campo del asesor
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!advisor) return;
    
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setAdvisor({ ...advisor, [name]: checked });
    } else {
      setAdvisor({ ...advisor, [name]: value });
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!advisor) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>No se encontró el asesor solicitado.</p>
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => navigate('/admin/users')}
        >
          Volver a Usuarios
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Perfil de Asesor</h1>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => navigate('/admin/users')}
        >
          Volver a Usuarios
        </button>
      </div>
      
      {/* Mensajes de error y éxito */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={20} />
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>
            <X size={20} />
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Información del asesor */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <UserCog size={20} className="mr-2" />
            Información Personal
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2">Nombre</label>
              <input
                type="text"
                name="name"
                value={advisor.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Especialidad</label>
              <input
                type="text"
                name="specialty"
                value={advisor.specialty || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2 flex items-center">
                <Mail size={16} className="mr-1" />
                Correo Electrónico
              </label>
              <input
                type="email"
                name="email"
                value={advisor.email || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2 flex items-center">
                <Phone size={16} className="mr-1" />
                Teléfono
              </label>
              <input
                type="text"
                name="phone"
                value={advisor.phone || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-gray-700 mb-2">Biografía</label>
              <textarea
                name="bio"
                value={advisor.bio || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                rows={4}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">URL de Foto</label>
              <input
                type="text"
                name="photo_url"
                value={advisor.photo_url || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2 flex items-center">
                <Calendar size={16} className="mr-1" />
                Correo de Google Calendar
              </label>
              <input
                type="email"
                name="google_account_email"
                value={advisor.google_account_email || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="available"
                  checked={advisor.available}
                  onChange={(e) => setAdvisor({ ...advisor, available: e.target.checked })}
                  className="mr-2"
                />
                <span>Disponible para asesorías</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
              onClick={handleSaveAdvisor}
              disabled={saving}
            >
              {saving ? (
                <Loader2 size={20} className="mr-2 animate-spin" />
              ) : (
                <Save size={20} className="mr-2" />
              )}
              Guardar Cambios
            </button>
          </div>
        </div>
        
        {/* Asignaciones de empresas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Building size={20} className="mr-2" />
            Empresas Asignadas
          </h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Empresa</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Seleccionar empresa</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Programa</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Seleccionar programa</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
              onClick={handleAssignCompany}
              disabled={saving || !selectedCompany || !selectedProgram}
            >
              Asignar Empresa
            </button>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Empresas Actuales</h3>
            
            {assignments.length > 0 ? (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-gray-50 p-3 rounded border flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{assignment.company?.name}</p>
                      <p className="text-sm text-gray-600">{assignment.program?.name}</p>
                    </div>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      disabled={saving}
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No hay empresas asignadas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorManager;
