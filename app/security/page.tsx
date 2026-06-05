import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Security | Scaniha - QR Menu Builder',
  description: 'Learn about Scaniha security practices. Encryption, access controls, compliance, and data protection for your digital restaurant menu platform.',
  openGraph: {
    title: 'Security | Scaniha - QR Menu Builder',
    description: 'Enterprise-grade security for your digital menu platform.',
    url: 'https://scaniha.com/security',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Security | Scaniha - QR Menu Builder',
    description: 'Enterprise-grade security for your digital menu platform.',
  },
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white" dir="ltr">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="text-orange-600 hover:text-orange-700 font-medium mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 mb-6">Security at Scaniha</h1>
        <p className="text-xl text-zinc-600 mb-12">Your data security is our top priority. We implement enterprise-grade security measures across all layers of our platform.</p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Encryption</h2>
          <div className="space-y-4 text-zinc-600">
            <p><strong>In Transit:</strong> All data transmitted between your browser and our servers is encrypted using TLS 1.3 (preferred) or TLS 1.2 (minimum). We enforce HTTPS Strict Transport Security (HSTS).</p>
            <p><strong>At Rest:</strong> All stored data is encrypted using AES-256 encryption. This includes databases, backups, file storage, and configuration data.</p>
            <p><strong>Key Management:</strong> Encryption keys are managed through AWS KMS with automatic annual rotation.</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Access Control</h2>
          <ul className="space-y-3 text-zinc-600">
            <li><strong>Multi-Factor Authentication (MFA):</strong> Required for all administrative accounts</li>
            <li><strong>Role-Based Access Control (RBAC):</strong> Granular permissions for Owner, Manager, Editor, and Viewer roles</li>
            <li><strong>Single Sign-On (SSO):</strong> OAuth 2.0 support via Google and Apple</li>
            <li><strong>Session Management:</strong> Automatic timeout after inactivity</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Infrastructure</h2>
          <p className="text-zinc-600 mb-4">Our platform is hosted on Amazon Web Services (AWS), which maintains:</p>
          <ul className="space-y-3 text-zinc-600">
            <li>• SOC 1/2/3 certifications</li>
            <li>• ISO 27001, 27017, 27018 certifications</li>
            <li>• PCI DSS Level 1 compliance</li>
            <li>• 24/7 physical security with multi-factor access controls</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Compliance</h2>
          <ul className="space-y-3 text-zinc-600">
            <li>• <strong>ISO 27001:2022</strong> — Information Security Management</li>
            <li>• <strong>PCI DSS v4.0</strong> — Payment card data security</li>
            <li>• <strong>GDPR</strong> — European data protection compliance</li>
            <li>• <strong>CCPA/CPRA</strong> — California privacy rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">Vulnerability Management</h2>
          <ul className="space-y-3 text-zinc-600">
            <li>• Weekly automated vulnerability scanning</li>
            <li>• Annual penetration testing by independent third-party</li>
            <li>• SAST/SCA integrated into CI/CD pipeline</li>
            <li>• Responsible disclosure program for security researchers</li>
          </ul>
        </section>

        <div className="text-center mt-12">
          <Link href="/signup" className="inline-block px-10 py-5 bg-gradient-to-r from-[#F47B20] to-[#F5B82E] text-white rounded-xl font-extrabold text-xl shadow-xl">Start Your Free Trial</Link>
        </div>
      </div>
    </div>
  )
}
