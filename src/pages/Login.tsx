import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Building2, Loader2 } from 'lucide-react';
import CompanyProfileForm from '../components/auth/CompanyProfileForm';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [showCompanyProfile, setShowCompanyProfile] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuthStore();

  // Verificar si el usuario recién registrado necesita completar su perfil
  useEffect(() => {
    if (user && isSignUp && !registrationComplete) {
      const checkCompanyProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('company_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error) throw error;
          
          // Si no tiene perfil de empresa, mostrar el formulario
          if (!data) {
            setShowCompanyProfile(true);
          }
        } catch (err) {
          console.error('Error al verificar el perfil de empresa:', err);
        }
      };
      
      checkCompanyProfile();
    }
  }, [user, isSignUp, registrationComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        await signUp(email, password);
        // No redirigimos automáticamente para dar tiempo a completar el perfil
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleProfileComplete = () => {
    setRegistrationComplete(true);
    setShowCompanyProfile(false);
  };

  // Si estamos mostrando el formulario de perfil de empresa
  if (showCompanyProfile && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900">
              ¡Registro exitoso!
            </h2>
            <p className="mt-2 text-gray-600">
              Por favor, completa la información de tu empresa para continuar.
            </p>
          </div>
          
          <CompanyProfileForm onComplete={handleProfileComplete} />
        </div>
      </div>
    );
  }
  
  // Si el registro está completo, mostrar mensaje de éxito
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Registro completado!</h2>
            <p className="text-gray-600 mb-6">
              Tu información ha sido guardada exitosamente. Un administrador revisará tu solicitud y te asignará a un programa.
            </p>
            <p className="text-sm text-gray-500">
              Puedes cerrar esta ventana o iniciar sesión cuando tu cuenta haya sido activada.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" />
                  {isSignUp ? 'Registrando...' : 'Iniciando sesión...'}
                </>
              ) : (
                isSignUp ? 'Registrarse' : 'Iniciar sesión'
              )}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <button
              type="button"
              className="font-medium text-blue-600 hover:text-blue-500"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}