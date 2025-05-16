import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, XCircle, UserPlus, Save, X, UserCog, Users, UserX, Briefcase, Building } from 'lucide-react';
import { cn } from '../../lib/utils';
import CompanyProfileModal from './CompanyProfileModal';

interface UserProfile {
  id: string;
  email: string;
  is_admin: boolean;
  is_advisor?: boolean;
  created_at: string;
  company_name?: string;
  industry?: string;
  size?: string;
  programs?: {
    id: string;
    name: string;
  }[];
}

interface Program {
  id: string;
  name: string;
}

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newUserIsAdvisor, setNewUserIsAdvisor] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unassigned'>('all');
  const [editingCompanyProfile, setEditingCompanyProfile] = useState<string | null>(null);

  // Cargar usuarios y programas
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar usuarios con sus emails
        const { data: usersData, error: usersError } = await supabase
          .rpc('get_users_with_emails');

        if (usersError) throw usersError;
        
        // Cargar programas
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('id, name')
          .order('name');

        if (programsError) throw programsError;

        // Formatear datos de usuarios
        const formattedUsers = (usersData || []).map((user: { id: string; email: string; is_admin: boolean; created_at: string }) => ({
          id: user.id,
          email: user.email || 'Sin correo',
          is_admin: user.is_admin,
          created_at: user.created_at,
          programs: []
        }));

        // Cargar inscripciones a programas para cada usuario
        for (const user of formattedUsers) {
          try {
            const { data: enrollments, error: enrollmentsError } = await supabase
              .rpc('get_user_programs', { p_user_id: user.id });
            
            if (!enrollmentsError && enrollments) {
              user.programs = enrollments.map((enrollment: { program_id: string; program_name: string }) => ({
                id: enrollment.program_id,
                name: enrollment.program_name
              }));
            }
          } catch (err) {
            console.error(`Error al cargar programas para usuario ${user.id}:`, err);
            // Continuamos con el siguiente usuario
          }
        }

        // Verificar qué usuarios son asesores
        for (const user of formattedUsers) {
          try {
            const { data: advisor, error: advisorError } = await supabase
              .from('advisors')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!advisorError) {
              user.is_advisor = !!advisor;
            }
          } catch (err) {
            console.error(`Error al verificar si el usuario ${user.id} es asesor:`, err);
          }
        }
        
        // Cargar información adicional de los usuarios desde la tabla companies
        for (const user of formattedUsers) {
          try {
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .select('name, industry, size')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (!companyError && company) {
              user.company_name = company.name;
              user.industry = company.industry;
              user.size = company.size;
            }
          } catch (err) {
            console.error(`Error al cargar información de empresa para usuario ${user.id}:`, err);
          }
        }

        setUsers(formattedUsers);
        setPrograms(programsData || []);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Cambiar rol de administrador
  const handleUpdateUserRole = async (userId: string, isAdmin: boolean) => {
    try {
      setProcessingAction(true);
      
      // Verificar que no sea el último administrador
      if (!isAdmin) {
        const adminUsers = users.filter(u => u.is_admin && u.id !== userId);
        if (adminUsers.length === 0) {
          setError('No se puede quitar el rol de administrador al último administrador del sistema.');
          return;
        }
      }
      
      // Actualizar rol de administrador
      const { error } = await supabase.rpc('set_user_admin', {
        user_id: userId,
        admin_status: isAdmin
      });

      if (error) throw error;

      // Actualizar lista de usuarios
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_admin: isAdmin } : u
      ));
      
      setSuccess(`Rol de usuario actualizado exitosamente.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al cambiar rol de administrador:', err);
      setError('Error al cambiar el rol de administrador. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Cambiar rol de asesor
  const handleUpdateAdvisorRole = async (userId: string, isAdvisor: boolean) => {
    try {
      setProcessingAction(true);
      
      if (isAdvisor) {
        // Crear perfil de asesor si no existe
        const user = users.find(u => u.id === userId);
        if (user) {
          const { error } = await supabase.rpc('create_advisor', {
            p_user_id: userId,
            p_name: user.email.split('@')[0], // Nombre temporal basado en el email
            p_bio: null,
            p_specialty: null,
            p_email: user.email,
            p_phone: null,
            p_photo_url: null,
            p_google_account_email: null
          });
          
          if (error) throw error;
        }
      } else {
        // Eliminar perfil de asesor
        const { error } = await supabase
          .from('advisors')
          .delete()
          .eq('user_id', userId);
        
        if (error) throw error;
      }

      // Actualizar lista de usuarios
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_advisor: isAdvisor } : u
      ));
      
      setSuccess(`Rol de asesor ${isAdvisor ? 'asignado' : 'removido'} exitosamente.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al cambiar rol de asesor:', err);
      setError('Error al cambiar el rol de asesor. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId: string) => {
    // Verificar que no sea el último administrador
    const adminUsers = users.filter(u => u.is_admin);
    const isLastAdmin = adminUsers.length === 1 && adminUsers[0].id === userId;
    
    if (isLastAdmin) {
      setError('No puedes eliminar el último administrador del sistema.');
      return;
    }
    
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      try {
        setProcessingAction(true);
        
        const { error } = await supabase.rpc('delete_user_with_enrollments', {
          target_user_id: userId
        });
        
        if (error) throw error;
        
        setUsers(users.filter(u => u.id !== userId));
        setSuccess('Usuario eliminado exitosamente.');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error('Error al eliminar usuario:', err);
        setError('Error al eliminar el usuario. Por favor, inténtalo de nuevo.');
      } finally {
        setProcessingAction(false);
      }
    }
  };

  // Añadir nuevo usuario
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      setError('El correo y la contraseña son obligatorios.');
      return;
    }

    try {
      setProcessingAction(true);
      
      // Crear nuevo usuario
      const { data: userData, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true
      });

      if (error) throw error;
      
      if (userData.user) {
        // Asignar rol de administrador si es necesario
        if (newUserIsAdmin) {
          await supabase.rpc('set_user_admin', {
            user_id: userData.user.id,
            admin_status: true
          });
        }
        
        // Crear perfil de asesor si es necesario
        if (newUserIsAdvisor) {
          await supabase.rpc('create_advisor', {
            p_user_id: userData.user.id,
            p_name: newUserEmail.split('@')[0], // Nombre temporal basado en el email
            p_bio: null,
            p_specialty: null,
            p_email: newUserEmail,
            p_phone: null,
            p_photo_url: null,
            p_google_account_email: null
          });
        }
        
        // Añadir a la lista de usuarios
        const newUser: UserProfile = {
          id: userData.user.id,
          email: userData.user.email || newUserEmail,
          is_admin: newUserIsAdmin,
          is_advisor: newUserIsAdvisor,
          created_at: new Date().toISOString(),
          programs: []
        };
        
        setUsers([newUser, ...users]);
        setShowAddUserModal(false);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserIsAdmin(false);
        setNewUserIsAdvisor(false);
        setSuccess('Usuario creado exitosamente.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error al crear usuario:', err);
      setError('Error al crear el usuario. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Asignar programas a un usuario
  const handleAssignPrograms = async () => {
    if (!editingUser) return;
    
    try {
      setProcessingAction(true);
      
      // Obtener programas actuales del usuario
      const currentProgramIds = editingUser.programs?.map(p => p.id) || [];
      
      // Programas a añadir (están en selectedPrograms pero no en currentProgramIds)
      const programsToAdd = selectedPrograms.filter(id => !currentProgramIds.includes(id));
      
      // Programas a eliminar (están en currentProgramIds pero no en selectedPrograms)
      const programsToRemove = currentProgramIds.filter(id => !selectedPrograms.includes(id));
      
      // Añadir nuevos programas
      for (const programId of programsToAdd) {
        const { error } = await supabase.rpc('enroll_user_in_program', {
          p_user_id: editingUser.id,
          p_program_id: programId
        });
        
        if (error) throw error;
      }
      
      // Eliminar programas
      for (const programId of programsToRemove) {
        const { error } = await supabase.rpc('unenroll_user_from_program', {
          p_user_id: editingUser.id,
          p_program_id: programId
        });
        
        if (error) throw error;
      }
      
      // Actualizar la lista de usuarios con los nuevos programas
      const updatedUsers = users.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            programs: programs
              .filter(p => selectedPrograms.includes(p.id))
              .map(p => ({ id: p.id, name: p.name }))
          };
        }
        return u;
      });
      
      setUsers(updatedUsers);
      setEditingUser(null);
      setSelectedPrograms([]);
      setSuccess('Programas asignados exitosamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al asignar programas:', err);
      setError('Error al asignar programas. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Iniciar edición de usuario
  const startEditingUser = (user: UserProfile) => {
    setEditingUser(user);
    setSelectedPrograms(user.programs?.map(p => p.id) || []);
  };

  // Cancelar edición
  const cancelEditing = () => {
    setEditingUser(null);
    setSelectedPrograms([]);
  };

  // Manejar selección de programas
  const handleProgramSelection = (programId: string) => {
    if (selectedPrograms.includes(programId)) {
      setSelectedPrograms(selectedPrograms.filter(id => id !== programId));
    } else {
      setSelectedPrograms([...selectedPrograms, programId]);
    }
  };

  // Filtrar usuarios sin asignar (sin programas)
  const unassignedUsers = users.filter(user => !user.programs || user.programs.length === 0);
  
  // Usuarios a mostrar según la pestaña activa
  const displayedUsers = activeTab === 'all' ? users : unassignedUsers;
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>
      
      {/* Pestañas de navegación */}
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 font-medium flex items-center ${activeTab === 'all' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('all')}
        >
          <Users size={18} className="mr-2" />
          Todos los usuarios
        </button>
        <button
          className={`py-2 px-4 font-medium flex items-center ${activeTab === 'unassigned' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('unassigned')}
        >
          <UserX size={18} className="mr-2" />
          Usuarios sin asignar {unassignedUsers.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">{unassignedUsers.length}</span>
          )}
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
      
      {/* Botón para añadir usuario */}
      <div className="mb-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
          onClick={() => setShowAddUserModal(true)}
        >
          <UserPlus size={20} className="mr-2" />
          Añadir Usuario
        </button>
      </div>
      
      {/* Modal para añadir usuario */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Añadir Nuevo Usuario</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Correo Electrónico</label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                className="w-full p-2 border rounded"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Contraseña"
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={newUserIsAdmin}
                  onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                />
                <span>Administrador</span>
              </label>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={newUserIsAdvisor}
                  onChange={(e) => setNewUserIsAdvisor(e.target.checked)}
                />
                <span>Asesor</span>
              </label>
            </div>
            
            <div className="flex justify-end">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded mr-2"
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserEmail('');
                  setNewUserPassword('');
                  setNewUserIsAdmin(false);
                  setNewUserIsAdvisor(false);
                }}
              >
                Cancelar
              </button>
              
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
                onClick={handleAddUser}
                disabled={processingAction}
              >
                {processingAction ? (
                  <Loader2 size={20} className="mr-2 animate-spin" />
                ) : (
                  <Save size={20} className="mr-2" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lista de usuarios */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 size={40} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">Correo</th>
                <th className="py-2 px-4 border-b text-left">Empresa</th>
                <th className="py-2 px-4 border-b text-left">Industria</th>
                <th className="py-2 px-4 border-b text-left">Tamaño</th>
                <th className="py-2 px-4 border-b text-left">Fecha de Registro</th>
                <th className="py-2 px-4 border-b text-left">Programas</th>
                <th className="py-2 px-4 border-b text-left">Administrador</th>
                <th className="py-2 px-4 border-b text-left">Asesor</th>
                <th className="py-2 px-4 border-b text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-gray-500">
                    {activeTab === 'unassigned' ? 'No hay usuarios sin asignar' : 'No hay usuarios registrados'}
                  </td>
                </tr>
              ) : displayedUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${activeTab === 'unassigned' ? 'bg-yellow-50' : ''}`}>
                  <td className="py-2 px-4 border-b">{user.email}</td>
                  <td className="py-2 px-4 border-b">
                    {user.company_name || <span className="text-gray-400 italic">No disponible</span>}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {user.industry || <span className="text-gray-400 italic">No disponible</span>}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {user.size || <span className="text-gray-400 italic">No disponible</span>}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {user.programs && user.programs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.programs.map((program) => (
                          <span
                            key={program.id}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {program.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">Sin programas</span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <button
                      className={cn(
                        "flex items-center",
                        user.is_admin ? "text-green-500" : "text-red-500"
                      )}
                      onClick={() => handleUpdateUserRole(user.id, !user.is_admin)}
                      disabled={processingAction}
                    >
                      {user.is_admin ? (
                        <CheckCircle size={20} className="mr-1" />
                      ) : (
                        <XCircle size={20} className="mr-1" />
                      )}
                      {user.is_admin ? "Sí" : "No"}
                    </button>
                  </td>
                  <td className="py-2 px-4 border-b">
                    <button
                      className={cn(
                        "flex items-center",
                        user.is_advisor ? "text-green-500" : "text-red-500"
                      )}
                      onClick={() => handleUpdateAdvisorRole(user.id, !user.is_advisor)}
                      disabled={processingAction}
                    >
                      {user.is_advisor ? (
                        <CheckCircle size={20} className="mr-1" />
                      ) : (
                        <XCircle size={20} className="mr-1" />
                      )}
                      {user.is_advisor ? "Sí" : "No"}
                    </button>
                  </td>
                  <td className="py-2 px-4 border-b">
                    <div className="flex space-x-2">
                      <button
                        className={`${!user.programs || user.programs.length === 0 ? 'bg-green-500 hover:bg-green-700' : 'bg-blue-500 hover:bg-blue-700'} text-white font-bold py-1 px-2 rounded text-sm flex items-center`}
                        onClick={() => startEditingUser(user)}
                      >
                        <Briefcase size={16} className="mr-1" />
                        {!user.programs || user.programs.length === 0 ? 'Asignar' : 'Programas'}
                      </button>
                      
                      <button
                        className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-1 px-2 rounded text-sm flex items-center"
                        onClick={() => setEditingCompanyProfile(user.id)}
                      >
                        <Building size={16} className="mr-1" />
                        Empresa
                      </button>
                      
                      {user.is_advisor && (
                        <button
                          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-2 rounded text-sm flex items-center"
                          onClick={() => window.location.href = `/admin/advisors/${user.id}`}
                        >
                          <UserCog size={16} className="mr-1" />
                          Perfil Asesor
                        </button>
                      )}
                      
                      <button
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal para asignar programas */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Asignar Programas a {editingUser.email}
            </h2>
            
            <div className="mb-4 max-h-60 overflow-y-auto">
              {programs.length > 0 ? (
                programs.map((program) => (
                  <div key={program.id} className="mb-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={selectedPrograms.includes(program.id)}
                        onChange={() => handleProgramSelection(program.id)}
                      />
                      <span>{program.name}</span>
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No hay programas disponibles</p>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded mr-2"
                onClick={cancelEditing}
              >
                Cancelar
              </button>
              
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
                onClick={handleAssignPrograms}
                disabled={processingAction}
              >
                {processingAction ? (
                  <Loader2 size={20} className="mr-2 animate-spin" />
                ) : (
                  <Save size={20} className="mr-2" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para editar perfil de empresa */}
      {editingCompanyProfile && (
        <CompanyProfileModal
          userId={editingCompanyProfile}
          onClose={() => setEditingCompanyProfile(null)}
        />
      )}
    </div>
  );
};

export default UserManager;
