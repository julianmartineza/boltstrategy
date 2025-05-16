import React, { useState, useEffect } from 'react';
import { Loader2, Save, User, Mail, Phone, Image, Calendar, Check, Link, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { advisoryService } from './advisoryService';
import { Advisor } from './types';
import GoogleCalendarAuth from './GoogleCalendarAuth';

const AdvisorProfileForm: React.FC = () => {
  const { user } = useAuthStore();
  
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Campos del formulario
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [googleAccountEmail, setGoogleAccountEmail] = useState('');
  
  // Estado para el modal de conexión con Google Calendar
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  
  // Cargar datos del asesor
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;
        
        setLoading(true);
        
        // Verificar si el usuario es asesor
        const isAdvisor = await advisoryService.isUserAdvisor(user.id);
        
        if (!isAdvisor) {
          setError('No tienes permisos de asesor.');
          setLoading(false);
          return;
        }
        
        // Cargar perfil del asesor
        const advisorData = await advisoryService.getAdvisorByUserId(user.id);
        
        if (!advisorData) {
          setError('No se encontró tu perfil de asesor.');
          setLoading(false);
          return;
        }
        
        setAdvisor(advisorData);
        
        // Inicializar campos del formulario
        setName(advisorData.name || '');
        setBio(advisorData.bio || '');
        setSpecialty(advisorData.specialty || '');
        setEmail(advisorData.email || '');
        setPhone(advisorData.phone || '');
        setPhotoUrl(advisorData.photo_url || '');
        setGoogleAccountEmail(advisorData.google_account_email || '');
        
        // Verificar si ya tiene conexión con Google Calendar
        setCalendarConnected(!!advisorData.calendar_sync_token);
      } catch (err) {
        console.error('Error al cargar datos del asesor:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!advisor || !user) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Actualizar perfil del asesor
      const { error } = await supabase
        .from('advisors')
        .update({
          name,
          bio,
          specialty,
          email,
          phone,
          photo_url: photoUrl,
          google_account_email: googleAccountEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', advisor.id);
      
      if (error) throw error;
      
      setSuccess('Perfil actualizado correctamente.');
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al actualizar perfil:', err);
      setError('Error al actualizar el perfil. Por favor, inténtalo de nuevo.');
    } finally {
      setSaving(false);
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
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error || 'No se encontró tu perfil de asesor.'}</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Mi Perfil de Asesor</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{success}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Nombre completo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 p-2 border rounded"
              placeholder="Tu nombre completo"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Biografía profesional
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
            placeholder="Describe tu experiencia y especialidad..."
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Especialidad
          </label>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Ej: Estrategia de negocio, Marketing digital, etc."
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Correo electrónico de contacto
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 p-2 border rounded"
                placeholder="tu@email.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Teléfono de contacto
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone size={18} className="text-gray-400" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 p-2 border rounded"
                placeholder="+1 (123) 456-7890"
              />
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            URL de foto de perfil
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Image size={18} className="text-gray-400" />
            </div>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full pl-10 p-2 border rounded"
              placeholder="https://ejemplo.com/tu-foto.jpg"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Google Calendar
          </label>
          
          {calendarConnected ? (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex-shrink-0 mr-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check size={20} className="text-green-600" />
                </div>
              </div>
              <div className="flex-grow">
                <p className="font-medium text-green-800">
                  Conectado con Google Calendar
                </p>
                <p className="text-sm text-green-600">
                  {googleAccountEmail || 'Cuenta conectada'}
                </p>
              </div>
              <button
                type="button"
                className="ml-2 px-3 py-1 bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center"
                onClick={() => setShowGoogleAuthModal(true)}
              >
                <X size={16} className="mr-1" />
                Desconectar
              </button>
            </div>
          ) : (
            <div className="flex items-center p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="flex-shrink-0 mr-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Calendar size={20} className="text-gray-600" />
                </div>
              </div>
              <div className="flex-grow">
                <p className="font-medium text-gray-800">
                  No conectado con Google Calendar
                </p>
                <p className="text-sm text-gray-600">
                  Conecta tu cuenta para sincronizar las sesiones de asesoría
                </p>
              </div>
              <button
                type="button"
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                onClick={() => setShowGoogleAuthModal(true)}
              >
                <Link size={16} className="mr-1" />
                Conectar
              </button>
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Modal para la conexión con Google Calendar */}
      {showGoogleAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <GoogleCalendarAuth 
              onSuccess={() => {
                setShowGoogleAuthModal(false);
                setCalendarConnected(true);
                setSuccess('Cuenta de Google Calendar conectada exitosamente.');
                
                // Recargar datos del asesor para obtener el token actualizado
                if (advisor && user) {
                  advisoryService.getAdvisorByUserId(user.id).then(updatedAdvisor => {
                    if (updatedAdvisor) {
                      setAdvisor(updatedAdvisor);
                      setGoogleAccountEmail(updatedAdvisor.google_account_email || '');
                    }
                  });
                }
              }}
              onCancel={() => setShowGoogleAuthModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorProfileForm;
