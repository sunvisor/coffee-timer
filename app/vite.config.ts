import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'about-directory-index',
      configureServer(server) {
        // Vite's public-file middleware matches files rather than directory indexes.
        server.middlewares.use((request, _response, next) => {
          request.url = request.url?.replace(
            /^\/about(?:\/(en))?\/?(?=\?|$)/,
            (_match, language: string | undefined) =>
              `/about/${language ? `${language}/` : ''}index.html`,
          )
          next()
        })
      },
    },
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons.svg'],
      manifest: {
        id: '/',
        name: 'coffee timer',
        short_name: 'coffee timer',
        description: 'Brew a better cup with your recipes and a step-by-step timer.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#71533e',
        background_color: '#f8f7f4',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        skipWaiting: false,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/about(?:\/|$)/],
      },
    }),
  ],
})
