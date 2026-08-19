import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
    host: true
  },
  
  // Build configuration for production
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging in production
    sourcemap: false,
    
    // Minify the code
    minify: 'terser',
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Optimize chunk sizes
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg|webp)$/.test(name ?? '')) {
            return 'images/[name]-[hash][extname]';
          } else if (/\.css$/.test(name ?? '')) {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },

  // Environment variable configuration
  define: {
    'process.env': process.env
  }
})
