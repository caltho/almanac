import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Almanac',
				short_name: 'Almanac',
				description: 'Personal life-tracking PWA',
				theme_color: '#09090b',
				background_color: '#09090b',
				display: 'standalone',
				start_url: '/',
				icons: [
					{ src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/pwa-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}']
			},
			devOptions: {
				enabled: false
			}
		})
	]
});
