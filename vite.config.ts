import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno basadas en el modo (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Definir variables de entorno que estarán disponibles en el cliente
    define: {
      // Exponer OPENAI_API_KEY al código del cliente
      'import.meta.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
    },
  };
});
