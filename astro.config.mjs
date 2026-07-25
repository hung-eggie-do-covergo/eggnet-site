// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://eggnet.dev',
	integrations: [
		starlight({
			title: 'eggnet',
			description:
				'A self-hosted homelab running on a single mini PC — and a field guide to building your own.',
			logo: { src: './src/assets/egg.svg', alt: 'eggnet' },
			customCss: ['./src/styles/custom.css'],
			social: [
				{ icon: 'rss', label: 'Status', href: 'https://status.eggnet.dev' },
			],
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'What is eggnet?', slug: 'guides/overview' },
						{ label: 'The philosophy', slug: 'guides/philosophy' },
					],
				},
				{
					label: 'Build guides',
					items: [
						{ label: 'Hardware & Proxmox base', slug: 'guides/hardware' },
						{ label: 'LXC vs Docker: where things run', slug: 'guides/services' },
						{ label: 'Networking: proxy & split-horizon DNS', slug: 'guides/networking' },
						{ label: 'Single sign-on with OIDC', slug: 'guides/auth' },
						{ label: 'Secrets management', slug: 'guides/secrets' },
						{ label: 'Storage & backups', slug: 'guides/backups' },
						{ label: 'Media automation', slug: 'guides/media' },
						{ label: 'Monitoring', slug: 'guides/monitoring' },
					],
				},
			],
			lastUpdated: true,
		}),
	],
});
