import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/onboarding'], // Mencegah crawler mengindeks halaman flow internal
    },
    sitemap: 'https://chroniq.yusrilastaghina.my.id/sitemap.xml',
  }
}
