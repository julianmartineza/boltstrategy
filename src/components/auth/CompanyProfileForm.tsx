import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Save, Building } from 'lucide-react';

interface CompanyProfileFormProps {
  onComplete?: () => void;
  userId?: string;
  isAdmin?: boolean;
}

interface CompanyData {
  id?: string;
  name: string;
  industry: string;
  size: string;
  user_id: string;
  annual_revenue: number | null;
  website: string;
}

const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({ 
  onComplete, 
  userId: externalUserId,
  isAdmin = false
}) => {
  const { user } = useAuthStore();
  const userId = externalUserId || user?.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [website, setWebsite] = useState('');

  // Variable para almacenar el ID de la empresa si ya existe
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;

    const loadCompanyProfile = async () => {
      try {
        setLoading(true);
        console.log('Cargando perfil de empresa para usuario:', userId);
        
        // Intentar consulta directa a la tabla companies
        let companyData = null;
        
        // Primer intento: consulta directa
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('Error en la consulta directa:', error);
        } else if (data) {
          console.log('Datos de empresa obtenidos con consulta directa:', data);
          companyData = data;
        } else {
          console.log('No se encontró información de empresa con consulta directa');
        }
        
        // Segundo intento: consulta con filtro
        if (!companyData) {
          console.log('Intentando consulta con filtro...');
          
          // Consulta usando filter en lugar de eq
          const { data: filterData, error: filterError } = await supabase
            .from('companies')
            .select('*')
            .filter('user_id', 'eq', userId)
            .maybeSingle();
          
          if (filterError) {
            console.error('Error en la consulta con filtro:', filterError);
          } else if (filterData) {
            console.log('Datos obtenidos con consulta filtrada:', filterData);
            companyData = filterData;
          } else {
            console.log('No se encontró información de empresa con consulta filtrada');
          }
        }
        
        // Tercer intento: consulta a todas las empresas
        if (!companyData) {
          console.log('Intentando consulta a todas las empresas...');
          
          // Obtener todas las empresas y filtrar manualmente
          const { data: allCompanies, error: allError } = await supabase
            .from('companies')
            .select('*');
          
          if (allError) {
            console.error('Error al obtener todas las empresas:', allError);
          } else if (allCompanies && allCompanies.length > 0) {
            // Buscar la empresa del usuario actual
            const userCompany = allCompanies.find(company => company.user_id === userId);
            
            if (userCompany) {
              console.log('Empresa encontrada en la lista completa:', userCompany);
              companyData = userCompany;
            } else {
              console.log('No se encontró la empresa del usuario en la lista completa');
            }
          } else {
            console.log('No se encontraron empresas en la base de datos');
          }
        }
        
        // Si se encontraron datos, actualizar el estado
        if (companyData) {
          setCompanyId(companyData.id);
          setCompanyName(companyData.name || '');
          setIndustry(companyData.industry || '');
          setCompanySize(companyData.size || '');
          setAnnualRevenue(companyData.annual_revenue?.toString() || '');
          setWebsite(companyData.website || '');
          console.log('Información de empresa cargada correctamente');
        } else {
          console.log('No se encontró información de empresa para este usuario');
        }
      } catch (err) {
        console.error('Error al cargar el perfil de empresa:', err);
        setError('Error al cargar los datos de la empresa. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    loadCompanyProfile();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('No se ha podido identificar al usuario. Por favor, inicia sesión nuevamente.');
      return;
    }
    
    try {
      setSaving(true);
      console.log('Guardando perfil de empresa para usuario:', userId);
      
      // Crear objeto de datos de la empresa
      const companyData: CompanyData = {
        user_id: userId,
        name: companyName,
        industry,
        size: companySize,
        annual_revenue: annualRevenue ? parseFloat(annualRevenue) : null,
        website
      };
      
      // Si ya existe un ID de empresa, incluirlo en los datos
      if (companyId) {
        companyData.id = companyId;
        console.log('Actualizando empresa existente con ID:', companyId);
      } else {
        console.log('Creando nuevo registro de empresa');
      }
      
      // Realizar la operación upsert
      const { error } = await supabase
        .from('companies')
        .upsert(companyData, { onConflict: 'user_id' });
      
      if (error) {
        console.error('Error en la operación upsert:', error);
        throw error;
      }
      
      console.log('Empresa guardada exitosamente');
      setSuccess('Información de empresa guardada exitosamente.');
      setTimeout(() => setSuccess(null), 3000);
      
      // Si se proporcionó una función de callback, ejecutarla
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Error al guardar el perfil de empresa:', err);
      setError('Error al guardar los datos de la empresa. Por favor, inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <Building size={24} className="text-blue-500 mr-2" />
        <h2 className="text-xl font-bold">
          {isAdmin ? 'Editar información de empresa' : 'Completa tu perfil de empresa'}
        </h2>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="company-name">
              Nombre de la empresa <span className="text-red-500">*</span>
            </label>
            <input
              id="company-name"
              type="text"
              className="w-full p-2 border rounded"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nombre de tu empresa"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="industry">
              Industria <span className="text-red-500">*</span>
            </label>
            <select
              id="industry"
              className="w-full p-2 border rounded"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
            >
              <option value="">Selecciona una industria</option>
              <option value="Technology">Tecnología</option>
              <option value="Healthcare">Salud</option>
              <option value="Finance">Finanzas</option>
              <option value="Education">Educación</option>
              <option value="Retail">Comercio minorista</option>
              <option value="Manufacturing">Manufactura</option>
              <option value="Consulting">Consultoría</option>
              <option value="Food & Beverage">Alimentos y bebidas</option>
              <option value="Real Estate">Bienes raíces</option>
              <option value="Other">Otra</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="company-size">
              Tamaño de la empresa <span className="text-red-500">*</span>
            </label>
            <select
              id="company-size"
              className="w-full p-2 border rounded"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              required
            >
              <option value="">Selecciona el tamaño</option>
              <option value="1-10 employees">1-10 empleados</option>
              <option value="11-50 employees">11-50 empleados</option>
              <option value="51-200 employees">51-200 empleados</option>
              <option value="201-500 employees">201-500 empleados</option>
              <option value="501-1000 employees">501-1000 empleados</option>
              <option value="1000+ employees">Más de 1000 empleados</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="annual-revenue">
              Ingresos anuales (USD)
            </label>
            <input
              id="annual-revenue"
              type="number"
              className="w-full p-2 border rounded"
              value={annualRevenue}
              onChange={(e) => setAnnualRevenue(e.target.value)}
              placeholder="Ej: 100000"
              min="0"
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="website">
              Sitio web
            </label>
            <input
              id="website"
              type="url"
              className="w-full p-2 border rounded"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.tuempresa.com"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={20} className="mr-2 animate-spin" />
            ) : (
              <Save size={20} className="mr-2" />
            )}
            Guardar información
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfileForm;
