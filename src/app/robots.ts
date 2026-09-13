import type { MetadataRoute } from 'next'

/**
 * A prototype carrying invented author names, reviews and decisions must never
 * be indexed. Remove this file when the real journal goes live — and not before.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
