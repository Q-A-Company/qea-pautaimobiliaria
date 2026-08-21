import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    // Gera um bundle adicional "traduzido" para navegadores antigos —
    // essencial para Smart TVs (Samsung/Tizen, LG/webOS), que costumam
    // rodar motores JS bem mais antigos que os de computador/celular e
    // não interpretam a build moderna padrão do Vite (o que causa tela
    // em branco sem nenhum erro visível).
    legacy({
      targets: ['defaults', 'not IE 11', 'Chrome >= 47', 'Safari >= 10'],
    }),
  ],
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
  },
})
