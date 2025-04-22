import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProgramStore } from '../store/programStore';
import { supabase } from '../lib/supabase';
import { Menu, X, User, LogOut, ChevronRight, Building2, BookOpen, Calendar } from 'lucide-react';

const StrategyProgram = React.lazy(() => import('../components/programs/strategy/StrategyProgram'));
const CompanySetup = React.lazy(() => import('../components/CompanySetup'));
const CompanyProfile = React.lazy(() => import('./CompanyProfile'));
const AdminDashboard = React.lazy(() => import('./admin/AdminDashboard'));
const AdvisorPanel = React.lazy(() => import('../components/advisory/AdvisorPanel'));
const AdvisorManager = React.lazy(() => import('../components/admin/AdvisorManager'));

export default function Dashboard() {
  const { signOut, user, isAdmin } = useAuthStore();
  const { userPrograms, loadUserPrograms } = useProgramStore();
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [isAdvisor, setIsAdvisor] = useState(false);
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

  // Verificar si el usuario es asesor
  useEffect(() => {
    const checkAdvisorStatus = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('advisors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setIsAdvisor(!!data);
      } catch (err) {
        console.error('Error al verificar si el usuario es asesor:', err);
        setIsAdvisor(false);
      }
    };

    checkAdvisorStatus();
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
              
              {/* Panel de Asesor (solo visible para asesores) */}
              {isAdvisor && (
                <li>
                  <Link
                    to="/dashboard/advisor"
                    className={`flex items-center px-4 py-3 text-sm ${
                      location.pathname.includes('/dashboard/advisor') 
                        ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="ml-1">Panel de Asesor</span>
                    {location.pathname.includes('/dashboard/advisor') && (
                      <ChevronRight className="ml-auto h-5 w-5 text-blue-600" />
                    )}
                  </Link>
                </li>
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
                className="flex items-center w-full text-left space-x-3"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isAdmin ? 'Administrador' : 'Usuario'}
                    {isAdvisor && ' • Asesor'}
                  </p>
                </div>
              </button>

              {/* Menú desplegable de perfil */}
              {showProfileMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={() => {
                      signOut();
                      setShowProfileMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-2 text-gray-500" />
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
        {/* Barra superior para móvil */}
        <header className="bg-white shadow-sm z-10 md:hidden">
          <div className="px-4 py-2 flex items-center justify-between">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-lg font-bold text-blue-600">Flowe</h1>
            </div>
            <div className="w-6"></div> {/* Espacio para equilibrar el diseño */}
          </div>
        </header>

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-blue-500" />
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
              {/* Rutas para el panel de asesor */}
              {isAdvisor && (
                <Route 
                  path="/advisor/*" 
                  element={<AdvisorPanel />} 
                />
              )}
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
                  {/* Ruta para la gestión de asesores */}
                  <Route 
                    path="/admin/advisors/:id" 
                    element={<AdvisorManager />} 
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