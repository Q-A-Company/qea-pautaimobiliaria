/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Preto/neutro, alinhado à identidade visual da Q&A Company
        // (fundo preto no site institucional), com leve variação de
        // cinza entre as camadas para dar profundidade aos cards.
        ink: {
          950: '#000000',
          900: '#0D0D0D',
          800: '#161616',
          700: '#212121',
          600: '#2E2E2E',
        },
        // Vermelho principal da marca (#8f0403) com tons derivados para
        // hover, texto e fundos suaves.
        brass: {
          50: '#F7E2E0',
          200: '#E2A29C',
          400: '#8F0403',
          500: '#7A0302',
          600: '#5C0201',
        },
        signal: {
          go: '#3FBF8F',
          wait: '#E8A23A',
          stop: '#C23B2E',
        },
        paper: '#F6F0EC',
      },
      fontFamily: {
        // Inter em peso pesado no lugar de uma fonte "poster" — mais
        // próximo da tipografia limpa usada no site institucional.
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 20px 60px -20px rgba(10, 15, 28, 0.55)',
      },
      keyframes: {
        'flap-in': {
          '0%': { transform: 'rotateX(90deg)', opacity: '0' },
          '60%': { transform: 'rotateX(-8deg)', opacity: '1' },
          '100%': { transform: 'rotateX(0deg)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(143, 4, 3, 0.55)' },
          '100%': { boxShadow: '0 0 0 24px rgba(143, 4, 3, 0)' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'flap-in': 'flap-in 0.5s cubic-bezier(.2,.8,.2,1)',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
        'slide-up-fade': 'slide-up-fade 0.35s ease-out',
      },
    },
  },
  plugins: [],
}
