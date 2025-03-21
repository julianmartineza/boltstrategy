import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProgramStore } from '../store/programStore';
import { supabase } from '../lib/supabase';
import { Menu, X, User, LogOut, ChevronRight, Building2, BookOpen } from 'lucide-react';

const StrategyProgram = React.lazy(() => import('../components/programs/strategy/StrategyProgram'));
const CompanySetup = React.lazy(() => import('../components/CompanySetup'));
const CompanyProfile = React.lazy(() => import('./CompanyProfile'));
const AdminDashboard = React.lazy(() => import('./admin/AdminDashboard'));

export default function Dashboard() {
  const { signOut, user, isAdmin } = useAuthStore();
  const { userPrograms, loadUserPrograms } = useProgramStore();
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Verificar si es un dispositivo móvil
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const checkCompany = async () => {
      if (!user) return;

      const { data: companies, error } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error checking company:', error);
        return;
      }

      setHasCompany(companies && companies.length > 0);
    };

    checkCompany();
  }, [user]);

  // Cargar los programas asignados al usuario
  useEffect(() => {
    if (user) {
      loadUserPrograms(user.id);
    }
  }, [user, loadUserPrograms]);

  // Cerrar el sidebar cuando cambia la ruta en dispositivos móviles
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  if (hasCompany === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-24 w-24 sm:h-32 sm:w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Overlay para móvil cuando el sidebar está abierto */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 w-64 flex-shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo y título */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-blue-600">Flowe</h1>
            </div>
            {isMobile && (
              <button onClick={toggleSidebar} className="md:hidden">
                <X className="h-6 w-6 text-gray-500" />
              </button>
            )}
          </div>
          
          {/* Enlaces de navegación */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1">
              <li>
                <Link
                  to="/dashboard"
                  className={`flex items-center px-4 py-3 text-sm ${
                    location.pathname === '/dashboard' 
                      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="ml-3">Dashboard</span>
                  {location.pathname === '/dashboard' && (
                    <ChevronRight className="ml-auto h-5 w-5 text-blue-600" />
                  )}
                </Link>
              </li>
              
              {/* Programas asignados al usuario */}
              {userPrograms.length > 0 && (
                <>
                  <li className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Mis Programas
                  </li>
                  {userPrograms.map(program => (
                    <li key={program.program_id}>
                      <Link
                        to={`/dashboard/program/${program.program_id}`}
                        className={`flex items-center px-4 py-3 text-sm ${
                          location.pathname.includes(`/dashboard/program/${program.program_id}`) 
                            ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <BookOpen className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="ml-1 truncate">{program.program_name}</span>
                        {location.pathname.includes(`/dashboard/program/${program.program_id}`) && (
                          <ChevronRight className="ml-auto h-5 w-5 text-blue-600" />
                        )}
                      </Link>
                    </li>
                  ))}
                </>
              )}
              
              <li>
                <Link
                  to="/dashboard/company-profile"
                  className={`flex items-center px-4 py-3 text-sm ${
                    location.pathname.includes('/dashboard/company-profile') 
                      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="ml-3">Perfil de Empresa</span>
                  {location.pathname.includes('/dashboard/company-profile') && (
                    <ChevronRight className="ml-auto h-5 w-5 text-blue-600" />
                  )}
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link
                    to="/dashboard/admin"
                    className={`flex items-center px-4 py-3 text-sm ${
                      location.pathname.includes('/dashboard/admin') 
                        ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="ml-3">Panel de Administración</span>
                    {location.pathname.includes('/dashboard/admin') && (
                      <ChevronRight className="ml-auto h-5 w-5 text-blue-600" />
                    )}
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          
          {/* Perfil de usuario y logout */}
          <div className="border-t border-gray-200 p-4">
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center w-full px-3 py-2 text-sm text-left text-gray-700 rounded-md hover:bg-gray-100"
              >
                <User className="h-5 w-5 mr-2 text-gray-500" />
                <span className="flex-1 truncate">{user?.email}</span>
              </button>
              
              {showProfileMenu && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-md shadow-lg border border-gray-200">
                  <button 
                    onClick={() => signOut()}
                    className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header para móvil */}
        <header className="bg-white shadow-sm p-4 md:hidden flex items-center">
          <button onClick={toggleSidebar} className="mr-4">
            <Menu className="h-6 w-6 text-gray-500" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {location.pathname === '/dashboard' && 'Dashboard'}
            {location.pathname.includes('/dashboard/program') && 'Programa Estratégico'}
            {location.pathname.includes('/dashboard/company-profile') && 'Perfil de Empresa'}
            {location.pathname.includes('/dashboard/admin') && 'Panel de Administración'}
          </h1>
        </header>
        
        {/* Área de contenido principal */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-0 md:p-6">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-[calc(100vh-4rem)] md:h-full">
                <div className="animate-spin rounded-full h-24 w-24 sm:h-32 sm:w-32 border-b-2 border-blue-500" />
              </div>
            }
          >
            <Routes>
              <Route 
                path="/" 
                element={
                  hasCompany ? (
                    <Navigate to="/dashboard/program" />
                  ) : (
                    <Navigate to="/dashboard/profile" />
                  )
                } 
              />
              <Route 
                path="/profile" 
                element={<CompanySetup />} 
              />
              <Route 
                path="/company-profile" 
                element={<CompanyProfile />} 
              />
              <Route 
                path="/program" 
                element={
                  !hasCompany ? (
                    <Navigate to="/dashboard/profile" />
                  ) : (
                    <StrategyProgram />
                  )
                } 
              />
              <Route 
                path="/program/:programId" 
                element={
                  !hasCompany ? (
                    <Navigate to="/dashboard/profile" />
                  ) : (
                    <StrategyProgram />
                  )
                } 
              />
              {isAdmin && (
                <>
                  <Route 
                    path="/admin" 
                    element={<Navigate to="/dashboard/admin/programs" />} 
                  />
                  <Route 
                    path="/admin/programs" 
                    element={<AdminDashboard />} 
                  />
                  <Route 
                    path="/admin/content" 
                    element={<AdminDashboard />} 
                  />
                  <Route 
                    path="/admin/settings" 
                    element={<AdminDashboard />} 
                  />
                </>
              )}
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </div>
  );
}