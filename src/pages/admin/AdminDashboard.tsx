import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import ProgramsManager from './ProgramsManager';
import ContentManager from './ContentManager';
import { Layers, FileText, Settings } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { isAdmin, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Extraer la pestaña activa de la URL
  const getTabFromUrl = (): 'programs' | 'content' | 'settings' => {
    const path = location.pathname;
    if (path.includes('/dashboard/admin/content')) return 'content';
    if (path.includes('/dashboard/admin/settings')) return 'settings';
    return 'programs'; // Por defecto
  };
  
  const [currentTab, setCurrentTab] = useState<'programs' | 'content' | 'settings'>(getTabFromUrl());

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
  const handleTabChange = (tab: 'programs' | 'content' | 'settings') => {
    setCurrentTab(tab);
    navigate(`/dashboard/admin/${tab}`);
  };

  // Renderizar los componentes basados en la pestaña seleccionada
  const renderContent = () => {
    switch (currentTab) {
      case 'programs':
        return <ProgramsManager />;
      case 'content':
        return <ContentManager />;
      case 'settings':
        return (
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Configuración Administrativa</h2>
            <p className="text-gray-600 mb-4">Esta sección está en desarrollo.</p>
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-700">Usuario actual: {user?.email}</p>
              <p className="text-sm text-blue-700 mt-1">Rol: {isAdmin ? 'Administrador' : 'Usuario'}</p>
            </div>
          </div>
        );
      default:
        return <ProgramsManager />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Barra lateral */}
      <div className="w-64 bg-white shadow-md p-4 hidden md:block">
        <h1 className="text-xl font-bold mb-6 text-blue-700">Admin Panel</h1>
        
        <nav className="space-y-2">
          <button
            className={`w-full flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${currentTab === 'programs' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => handleTabChange('programs')}
          >
            <Layers size={18} />
            <span>Programas</span>
          </button>
          
          <button
            className={`w-full flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${currentTab === 'content' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => handleTabChange('content')}
          >
            <FileText size={18} />
            <span>Contenido</span>
          </button>
          
          <button
            className={`w-full flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${currentTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => handleTabChange('settings')}
          >
            <Settings size={18} />
            <span>Configuración</span>
          </button>
        </nav>
      </div>
      
      {/* Contenido principal */}
      <div className="flex-1 p-6">
        <div className="md:hidden flex justify-between items-center mb-6 bg-white p-3 rounded-lg shadow-sm">
          <h1 className="text-lg font-bold text-blue-700">Admin Panel</h1>
          
          <div className="flex space-x-2">
            <button
              className={`p-2 rounded-md ${currentTab === 'programs' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
              onClick={() => handleTabChange('programs')}
            >
              <Layers size={20} />
            </button>
            
            <button
              className={`p-2 rounded-md ${currentTab === 'content' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
              onClick={() => handleTabChange('content')}
            >
              <FileText size={20} />
            </button>
            
            <button
              className={`p-2 rounded-md ${currentTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}
              onClick={() => handleTabChange('settings')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-1 bg-gray-50 border-b hidden md:flex">
            <h2 className="text-lg font-semibold p-3">
              {currentTab === 'programs' && 'Gestión de Programas'}
              {currentTab === 'content' && 'Gestión de Contenido'}
              {currentTab === 'settings' && 'Configuración'}
            </h2>
          </div>
          
          <div className="p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
