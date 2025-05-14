import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import ProgramsManager from './ProgramsManager';
import ContentManager from './ContentManager';
import ActivityEvaluation from './ActivityEvaluation';
import { Layers, FileText, Settings, ClipboardCheck, Sliders } from 'lucide-react';
import { cn } from '../../lib/utils';
import UserManager from '../../components/admin/UserManager';
import ActivityContextManager from '../../components/admin/content-manager/ActivityContextManager';

const AdminDashboard: React.FC = () => {
  const { isAdmin, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extraer la pestaña activa de la URL
  const getTabFromUrl = (): 'programs' | 'content' | 'evaluation' | 'settings' | 'context' => {
    const path = location.pathname;
    if (path.includes('/dashboard/admin/content')) return 'content';
    if (path.includes('/dashboard/admin/evaluation')) return 'evaluation';
    if (path.includes('/dashboard/admin/settings')) return 'settings';
    if (path.includes('/dashboard/admin/context')) return 'context';
    return 'programs'; // Por defecto
  };
  
  const [currentTab, setCurrentTab] = useState<'programs' | 'content' | 'evaluation' | 'settings' | 'context'>(getTabFromUrl());
  const [settingsTab, setSettingsTab] = useState<'users' | 'system'>('users');

  // Redirigir si el usuario no es administrador
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  // Efecto para sincronizar la URL con la pestaña activa
  useEffect(() => {
    const newTab = getTabFromUrl();
    if (newTab !== currentTab) {
      setCurrentTab(newTab);
    }
  }, [location.pathname, currentTab]);

  // Cambiar de pestaña y actualizar la URL
  const handleTabChange = (tab: 'programs' | 'content' | 'evaluation' | 'settings' | 'context') => {
    setCurrentTab(tab);
    navigate(`/dashboard/admin/${tab}`);
  };

  // Cambiar de sección en la pestaña de configuración
  const handleSettingsTabChange = (tab: 'users' | 'system') => {
    setSettingsTab(tab);
  };

  // Renderizar los componentes basados en la pestaña seleccionada
  const renderContent = () => {
    switch (currentTab) {
      case 'programs':
        return <ProgramsManager />;
      case 'content':
        return <ContentManager />;
      case 'evaluation':
        return <ActivityEvaluation />;
      case 'context':
        return <ActivityContextManager />;
      case 'settings':
        return (
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Configuración Administrativa</h2>
            
            {/* Tabs para diferentes secciones de configuración */}
            <div className="border-b border-gray-200 mb-6">
              <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                <li className="mr-2">
                  <button 
                    className={cn(
                      "inline-block p-4 border-b-2 rounded-t-lg",
                      settingsTab === 'users' 
                        ? "border-blue-500 text-blue-600" 
                        : "border-transparent hover:border-gray-300 hover:text-gray-600 text-gray-500"
                    )}
                    onClick={() => handleSettingsTabChange('users')}
                  >
                    Gestión de Usuarios
                  </button>
                </li>
                <li className="mr-2">
                  <button 
                    className={cn(
                      "inline-block p-4 border-b-2 rounded-t-lg",
                      settingsTab === 'system' 
                        ? "border-blue-500 text-blue-600" 
                        : "border-transparent hover:border-gray-300 hover:text-gray-600 text-gray-500"
                    )}
                    onClick={() => handleSettingsTabChange('system')}
                  >
                    Configuración del Sistema
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Contenido de la sección de usuarios */}
            {settingsTab === 'users' && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded border border-blue-200 mb-6">
                  <p className="text-sm text-blue-700">Usuario actual: {user?.email}</p>
                  <p className="text-sm text-blue-700 mt-1">Rol: {isAdmin ? 'Administrador' : 'Usuario'}</p>
                </div>
                
                <UserManager />
              </div>
            )}
            
            {/* Contenido de la sección de sistema */}
            {settingsTab === 'system' && (
              <div className="space-y-6">
                <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-700">
                    Esta sección está en desarrollo. Pronto podrás configurar parámetros globales del sistema.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return <ProgramsManager />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">Panel de Administración</h1>
        
        {/* Botones tipo thumbnails */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => handleTabChange('programs')}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-lg shadow-sm transition-all duration-200 border-2",
              currentTab === 'programs' 
                ? "bg-blue-50 border-blue-500 text-blue-700" 
                : "bg-white border-transparent hover:border-blue-200 hover:bg-blue-50/50 text-gray-600"
            )}
          >
            <Layers size={32} className="mb-2" />
            <span className="font-medium">Programas</span>
            <p className="text-xs mt-1 text-gray-500">Gestionar programas y etapas</p>
          </button>
          
          <button
            onClick={() => handleTabChange('content')}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-lg shadow-sm transition-all duration-200 border-2",
              currentTab === 'content' 
                ? "bg-blue-50 border-blue-500 text-blue-700" 
                : "bg-white border-transparent hover:border-blue-200 hover:bg-blue-50/50 text-gray-600"
            )}
          >
            <FileText size={32} className="mb-2" />
            <span className="font-medium">Contenido</span>
            <p className="text-xs mt-1 text-gray-500">Administrar contenido de etapas</p>
          </button>
          
          <button
            onClick={() => handleTabChange('evaluation')}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-lg shadow-sm transition-all duration-200 border-2",
              currentTab === 'evaluation' 
                ? "bg-blue-50 border-blue-500 text-blue-700" 
                : "bg-white border-transparent hover:border-blue-200 hover:bg-blue-50/50 text-gray-600"
            )}
          >
            <ClipboardCheck size={32} className="mb-2" />
            <span className="font-medium">Evaluación</span>
            <p className="text-xs mt-1 text-gray-500">Configurar evaluación de actividades</p>
          </button>
          
          <button
            onClick={() => handleTabChange('context')}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-lg shadow-sm transition-all duration-200 border-2",
              currentTab === 'context' 
                ? "bg-blue-50 border-blue-500 text-blue-700" 
                : "bg-white border-transparent hover:border-blue-200 hover:bg-blue-50/50 text-gray-600"
            )}
          >
            <Sliders size={32} className="mb-2" />
            <span className="font-medium">Contexto</span>
            <p className="text-xs mt-1 text-gray-500">Configurar contexto de actividades</p>
          </button>
          
          <button
            onClick={() => handleTabChange('settings')}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-lg shadow-sm transition-all duration-200 border-2",
              currentTab === 'settings' 
                ? "bg-blue-50 border-blue-500 text-blue-700" 
                : "bg-white border-transparent hover:border-blue-200 hover:bg-blue-50/50 text-gray-600"
            )}
          >
            <Settings size={32} className="mb-2" />
            <span className="font-medium">Configuración</span>
            <p className="text-xs mt-1 text-gray-500">Ajustes del sistema</p>
          </button>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-3 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold">
            {currentTab === 'programs' && 'Gestión de Programas'}
            {currentTab === 'content' && 'Gestión de Contenido'}
            {currentTab === 'context' && 'Configuración de Contexto de Actividades'}
            {currentTab === 'evaluation' && 'Evaluación de Actividades'}
            {currentTab === 'settings' && 'Configuración'}
          </h2>
        </div>
        
        <div className="p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
