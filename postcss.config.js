export default {
  plugins: {
    tailwindcss: {},
    // Converte sintaxe moderna de CSS (cor com variáveis + rgb() com barra
    // de opacidade, ex: rgb(143 4 3 / var(--tw-text-opacity))) em um
    // formato que TVs antigas também entendem, mantendo fallback estático
    // ao lado do valor moderno — essencial para o navegador de Smart TVs
    // Samsung antigas, que não suportam CSS custom properties/rgb() novo.
    'postcss-preset-env': {
      stage: 3,
      features: {
        'custom-properties': { preserve: true },
        'color-functional-notation': true,
      },
    },
    autoprefixer: {},
  },
}
