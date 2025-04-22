import React, { useState } from 'react';
import { Loader2, Save, Clock, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AdvisoryAllocationFormProps {
  programModuleId: string;
  companyId?: string;
  onSubmit: () => void;
  onCancel: () => void;
}

const AdvisoryAllocationForm: React.FC<AdvisoryAllocationFormProps> = ({
  programModuleId,
  companyId,
  onSubmit,
  onCancel
}) => {
  const [totalMinutes, setTotalMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Si no se proporciona companyId, necesitamos mostrar un selector de empresas
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(companyId || null);
  const [companies, setCompanies] = useState<any[]>([]);
  
  // Cargar empresas si es necesario
  React.useEffect(() => {
    if (!companyId) {
      fetchCompanies();
    }
  }, [companyId]);
  
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setCompanies(data || []);
    } catch (err) {
      console.error('Error al cargar empresas:', err);
      setError('Error al cargar la lista de empresas.');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetCompanyId = companyId || selectedCompanyId;
    
    if (!targetCompanyId) {
      setError('Debes seleccionar una empresa.');
      return;
    }
    
    if (totalMinutes <= 0) {
      setError('Los minutos deben ser un número positivo.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Verificar si ya existe una asignación para esta empresa y módulo
      const { data: existingAllocation, error: checkError } = await supabase
        .from('advisory_allocations')
        .select('id, total_minutes, used_minutes')
        .eq('company_id', targetCompanyId)
        .eq('program_module_id', programModuleId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingAllocation) {
        // Actualizar asignación existente
        const { error: updateError } = await supabase
          .from('advisory_allocations')
          .update({
            total_minutes: totalMinutes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAllocation.id);
        
        if (updateError) throw updateError;
      } else {
        // Crear nueva asignación
        const { error: insertError } = await supabase
          .from('advisory_allocations')
          .insert({
            company_id: targetCompanyId,
            program_module_id: programModuleId,
            total_minutes: totalMinutes,
            used_minutes: 0
          });
        
        if (insertError) throw insertError;
      }
      
      onSubmit();
    } catch (err) {
      console.error('Error al guardar asignación de asesoría:', err);
      setError('Error al guardar. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Asignar Horas de Asesoría</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {!companyId && (
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Empresa
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building size={18} className="text-gray-400" />
              </div>
              <select
                value={selectedCompanyId || ''}
                onChange={(e) => setSelectedCompanyId(e.target.value || null)}
                className="w-full pl-10 p-2 border rounded"
                required
              >
                <option value="">Selecciona una empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Minutos totales de asesoría
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock size={18} className="text-gray-400" />
            </div>
            <input
              type="number"
              value={totalMinutes}
              onChange={(e) => setTotalMinutes(parseInt(e.target.value) || 0)}
              className="w-full pl-10 p-2 border rounded"
              min="1"
              step="15"
              required
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Recomendado: 60 minutos (1 hora), 120 minutos (2 horas), etc.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Guardar
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdvisoryAllocationForm;
