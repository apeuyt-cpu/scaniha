type BlogPostingJsonLdProps = {
  title: string
  description: string
  slug: string
  datePublished: string
  dateModified?: string
}

/** Machine-readable representation of the visible editorial article. */
export default function BlogPostingJsonLd({
  title,
  description,
  slug,
  datePublished,
  dateModified = datePublished,
}: BlogPostingJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `https://scaniha.com/blog/${slug}#article`,
    mainEntityOfPage: `https://scaniha.com/blog/${slug}`,
    headline: title,
    description,
    image: 'https://scaniha.com/og-scaniha.jpg',
    datePublished: `${datePublished}T00:00:00+00:00`,
    dateModified: `${dateModified}T00:00:00+00:00`,
    inLanguage: 'fr-TN',
    author: { '@id': 'https://scaniha.com/#organization' },
    publisher: { '@id': 'https://scaniha.com/#organization' },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
