import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Building2, LogOut, BookOpen, User, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

const StrategyProgram = React.lazy(() => import('../components/programs/strategy/StrategyProgram'));
const CompanySetup = React.lazy(() => import('../components/CompanySetup'));
const CompanyProfile = React.lazy(() => import('./CompanyProfile'));
const AdminDashboard = React.lazy(() => import('./admin/AdminDashboard'));

export default function Dashboard() {
  const { signOut, user, isAdmin } = useAuthStore();
  const [hasCompany, setHasCompany] = useState<boolean | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  if (hasCompany === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Now fixed height with scrollable nav */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed">
        <div className="h-16 flex items-center px-4 border-b border-gray-200 flex-shrink-0">
          <Building2 className="h-8 w-8 text-blue-600" />
          <span className="ml-2 font-semibold text-lg">Strategy AI</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link
            to="/dashboard/program"
            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <BookOpen className="h-5 w-5 mr-3" />
            Programa Estratégico
          </Link>
          
          {isAdmin && (
            <div className="mt-6">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administración
              </h3>
              <div className="mt-2 space-y-1">
                <Link
                  to="/dashboard/admin"
                  className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Panel de Administración
                </Link>
              </div>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 truncate max-w-[120px]">
                  {user?.email}
                </span>
              </div>
              <User className="h-4 w-4 text-gray-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute bottom-full mb-2 w-full bg-white rounded-md shadow-lg border border-gray-200">
                <div className="py-1">
                  <Link
                    to="/dashboard/company-profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Company Profile
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Added margin to account for fixed sidebar */}
      <div className="flex-1 ml-64">
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
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
              path="/program/*" 
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
                  path="admin" 
                  element={<Navigate to="/dashboard/admin/programs" />} 
                />
                <Route 
                  path="admin/programs" 
                  element={<AdminDashboard />} 
                />
                <Route 
                  path="admin/content" 
                  element={<AdminDashboard />} 
                />
                <Route 
                  path="admin/settings" 
                  element={<AdminDashboard />} 
                />
              </>
            )}
          </Routes>
        </React.Suspense>
      </div>
    </div>
  );
}