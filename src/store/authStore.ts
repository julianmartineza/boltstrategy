import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  checkAdminStatus: () => Promise<void>;
  setAdminStatus: (userId: string, isAdmin: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAdmin: false,
  loading: true,
  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },
  signUp: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
  },
  setUser: (user) => {
    set({ user, loading: false });
    if (user) {
      get().checkAdminStatus();
    } else {
      set({ isAdmin: false });
    }
  },
  
  checkAdminStatus: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      // Verificar si el perfil de usuario existe
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error al verificar el estado de administrador:', profileError);
        return;
      }
      
      // Si el perfil no existe, crear uno nuevo
      if (!profile) {
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            is_admin: false
          });
        
        if (insertError) {
          console.error('Error al crear perfil de usuario:', insertError);
        }
        
        set({ isAdmin: false });
        return;
      }
      
      set({ isAdmin: profile.is_admin });
    } catch (error) {
      console.error('Error al verificar el estado de administrador:', error);
    }
  },
  
  setAdminStatus: async (userId: string, isAdmin: boolean) => {
    const { user } = get();
    if (!user) return;
    
    // Verificar si el usuario actual es administrador
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!currentUserProfile?.is_admin) {
      throw new Error('Solo los administradores pueden cambiar el estado de administrador');
    }
    
    // Actualizar el estado de administrador del usuario objetivo
    const { error } = await supabase.rpc('set_user_admin', {
      user_id: userId,
      admin_status: isAdmin
    });
    
    if (error) {
      console.error('Error al cambiar el estado de administrador:', error);
      throw error;
    }
    
    // Si el usuario objetivo es el usuario actual, actualizar el estado local
    if (userId === user.id) {
      set({ isAdmin });
    }
  },
}));