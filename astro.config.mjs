// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import compress from '@playform/compress';

// https://astro.build/config
export default defineConfig({
  site: 'https://finolaina.github.io',
  base: '/mimsistemas',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/v1') && !page.includes('/404'),
    }),
    compress(),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
    },
  },
});
