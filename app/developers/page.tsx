import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  alternates: { canonical: 'https://scaniha.com/developers' },
  title: 'API Scaniha — Documentation développeurs | Scaniha',
  description:
    'Documentation de l’API publique de fidélité Scaniha (v1). Créditez des points depuis votre caisse, validez les codes, consultez les soldes et l’historique par téléphone. Authentification par clé API, exemples curl, format des erreurs et limites d’usage.',
  openGraph: {
    images: [{ url: '/og-scaniha.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'Scaniha — Créateur de menu QR pour restaurants et cafés' }],
    title: 'API Scaniha — Documentation développeurs | Scaniha',
    description:
      'L’API publique de fidélité Scaniha : créditez des points, validez les codes et consultez les soldes par téléphone depuis votre caisse ou votre POS.',
    url: 'https://scaniha.com/developers',
    siteName: 'Scaniha',
    type: 'website',
  },
  twitter: {
    images: ['/og-scaniha.jpg'],
    card: 'summary_large_image',
    title: 'API Scaniha — Documentation développeurs | Scaniha',
    description: 'L’API publique de fidélité Scaniha — points, codes et soldes par téléphone.',
  },
}

// ── Small presentational helpers (server components, no client JS) ──────────

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-100 ring-1 ring-zinc-800">
      <code className="font-mono whitespace-pre">{children}</code>
    </pre>
  )
}

function Pill({ method }: { method: 'GET' | 'POST' | 'DELETE' }) {
  const tone =
    method === 'GET'
      ? 'bg-emerald-100 text-emerald-700'
      : method === 'DELETE'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-orange-100 text-orange-700'
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold tracking-wide ${tone}`}>{method}</span>
  )
}

function Scope({ children }: { children: string }) {
  return (
    <span className="inline-block rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
      {children}
    </span>
  )
}

function EndpointHeader({ method, path, scope }: { method: 'GET' | 'POST' | 'DELETE'; path: string; scope: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Pill method={method} />
      <code className="font-mono text-base font-semibold text-zinc-900 break-all">{path}</code>
      <span className="text-sm text-zinc-500">
        Scope&nbsp;: <Scope>{scope}</Scope>
      </span>
    </div>
  )
}

// ── Error code table data (mirrors lib/api/respond.ts + spec §4) ────────────

const ERROR_CODES: { code: string; status: number; when: string }[] = [
  { code: 'unauthorized', status: 401, when: 'En-tête Bearer absent ou mal formé.' },
  { code: 'invalid_key', status: 401, when: 'Clé inconnue (hash introuvable).' },
  { code: 'key_revoked', status: 401, when: 'Clé révoquée.' },
  { code: 'business_inactive', status: 403, when: 'Établissement suspendu, expiré ou introuvable.' },
  { code: 'insufficient_scope', status: 403, when: 'La clé ne possède pas le scope requis.' },
  { code: 'validation_error', status: 400, when: 'Téléphone, montant, reward_id ou code invalide / manquant.' },
  { code: 'not_found', status: 404, when: 'Récompense, code ou programme introuvable.' },
  { code: 'program_inactive', status: 409, when: 'Le programme de fidélité est désactivé.' },
  { code: 'insufficient_points', status: 409, when: 'Solde insuffisant (error.missing = points manquants).' },
  { code: 'rate_limited', status: 429, when: 'Limite d’usage dépassée (en-tête Retry-After en secondes).' },
  { code: 'method_not_allowed', status: 405, when: 'Verbe HTTP non supporté pour cette route.' },
  { code: 'server_error', status: 500, when: 'Erreur inattendue / service momentanément indisponible.' },
]

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#FEFEFE]" dir="ltr">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/" className="mb-8 inline-block font-medium text-orange-600 hover:text-orange-700">
          &larr; Retour à l&apos;accueil
        </Link>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <h1 className="mb-6 text-4xl font-extrabold text-zinc-900 sm:text-5xl">API Scaniha</h1>
        <p className="mb-4 text-xl text-zinc-600">
          Branchez votre caisse, votre POS ou vos outils internes sur le programme de fidélité de votre établissement.
          L&apos;API publique vous permet de créditer des points à l&apos;achat, de valider les codes gagnants et de
          consulter le solde et l&apos;historique d&apos;un client par numéro de téléphone.
        </p>
        <p className="mb-12 text-base text-zinc-500">
          Base URL&nbsp;: <code className="font-mono text-zinc-700">https://scaniha.com/api/v1</code>
        </p>

        {/* ── Sommaire ─────────────────────────────────────────────────── */}
        <nav className="mb-14 rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">Sommaire</h2>
          <ol className="grid gap-1 text-zinc-700 sm:grid-cols-2">
            <li><a href="#introduction" className="hover:text-orange-600">1. Introduction</a></li>
            <li><a href="#authentification" className="hover:text-orange-600">2. Authentification</a></li>
            <li><a href="#erreurs" className="hover:text-orange-600">3. Format des erreurs</a></li>
            <li><a href="#endpoints" className="hover:text-orange-600">4. Endpoints</a></li>
            <li><a href="#limites" className="hover:text-orange-600">5. Limites &amp; usage équitable</a></li>
            <li><a href="#versionnement" className="hover:text-orange-600">6. Versionnement</a></li>
            <li><a href="#tarifs" className="hover:text-orange-600">7. Tarifs &amp; renouvellement</a></li>
          </ol>
        </nav>

        {/* ── 1. Introduction ──────────────────────────────────────────── */}
        <section id="introduction" className="mb-14 scroll-mt-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">1. Introduction</h2>
          <div className="space-y-4 text-zinc-600">
            <p>
              L&apos;API Scaniha lit et écrit les données de fidélité de <strong>votre</strong> établissement, et de lui
              seul. Chaque clé est rattachée à un café&nbsp;: une requête ne peut jamais lire ou modifier les données
              d&apos;un autre établissement.
            </p>
            <p>Concrètement, vous pouvez&nbsp;:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-orange-600">•</span>
                <span><strong>Créditer des points</strong> lors d&apos;un achat, directement depuis votre caisse (le bonus de bienvenue est attribué automatiquement à la première visite).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-orange-600">•</span>
                <span><strong>Valider les codes</strong> gagnants (roue) et les codes de récompense présentés par vos clients.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-orange-600">•</span>
                <span><strong>Consulter le solde et l&apos;historique</strong> d&apos;un client à partir de son numéro de téléphone.</span>
              </li>
            </ul>
            <p>
              Base URL&nbsp;: <code className="font-mono text-zinc-800">https://scaniha.com/api/v1</code>
            </p>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-900">
              <strong>HTTPS obligatoire.</strong> Toutes les requêtes doivent passer par HTTPS. Le trafic HTTP est
              redirigé vers HTTPS en périphérie&nbsp;; n&apos;envoyez jamais une clé API sur une connexion non chiffrée.
            </div>
          </div>
        </section>

        {/* ── 2. Authentification ──────────────────────────────────────── */}
        <section id="authentification" className="mb-14 scroll-mt-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">2. Authentification</h2>
          <div className="space-y-4 text-zinc-600">
            <p>
              L&apos;API s&apos;authentifie par <strong>clé API</strong>, passée dans l&apos;en-tête
              <code className="mx-1 font-mono text-zinc-800">Authorization</code> au format Bearer&nbsp;:
            </p>
            <CodeBlock>{`Authorization: Bearer sk_live_VOTRE_CLE_API`}</CodeBlock>
            <p>
              Générez et gérez vos clés depuis votre tableau de bord&nbsp;:{' '}
              <Link href="/admin/api" className="font-medium text-orange-600 hover:text-orange-700">/admin/api</Link>.
            </p>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
              <strong>La clé n&apos;est affichée qu&apos;une seule fois</strong>, à sa création. Copiez-la
              immédiatement&nbsp;: elle ne pourra plus être récupérée ensuite (seul son préfixe reste visible). En cas de
              perte ou de fuite, révoquez-la et créez-en une nouvelle.
            </div>
            <p>
              <strong>Gardez la clé côté serveur.</strong> Une clé donne accès en lecture et en écriture aux données de
              fidélité de votre établissement&nbsp;: ne l&apos;exposez jamais dans un navigateur, une application mobile
              ou un dépôt de code public. Utilisez-la uniquement depuis votre caisse / vos serveurs.
            </p>
            <p>
              Chaque clé porte des <strong>scopes</strong> qui déterminent ce qu&apos;elle peut faire&nbsp;:
              <Scope>loyalty:read</Scope> (lecture) et <Scope>loyalty:write</Scope> (écriture). Une requête sans le scope
              requis renvoie <code className="font-mono">insufficient_scope</code> (403).
            </p>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="mb-2 font-bold">Numéros de téléphone — une seule forme canonique</p>
              <p>
                Envoyez toujours le numéro sous une <strong>seule et même forme</strong>. Forme recommandée&nbsp;: le
                format international complet, par exemple <code className="font-mono">+216XXXXXXXX</code>. Attention&nbsp;:
                <code className="mx-1 font-mono">&quot;+216…&quot;</code> et <code className="mx-1 font-mono">&quot;216…&quot;</code>
                sont traités comme <strong>deux clients distincts</strong> (le solde de points est indexé sur la chaîne
                exacte du téléphone). Normalisez vos numéros avant chaque appel pour éviter de scinder un même client.
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. Format des erreurs ────────────────────────────────────── */}
        <section id="erreurs" className="mb-14 scroll-mt-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">3. Format des erreurs</h2>
          <div className="space-y-4 text-zinc-600">
            <p>Toutes les erreurs renvoient le même enveloppe JSON, avec le statut HTTP correspondant&nbsp;:</p>
            <CodeBlock>{`{
  "error": {
    "code": "snake_case_code",
    "message": "Message en français."
  }
}`}</CodeBlock>
            <p>
              Lorsqu&apos;un détail est disponible, il est <strong>fusionné dans l&apos;objet</strong>{' '}
              <code className="font-mono">error</code>. Par exemple, un solde insuffisant précise le nombre de points
              manquants&nbsp;:
            </p>
            <CodeBlock>{`{
  "error": {
    "code": "insufficient_points",
    "message": "Solde de points insuffisant.",
    "missing": 12
  }
}`}</CodeBlock>
            <p>
              Toutes les réponses (succès comme erreur) portent l&apos;en-tête{' '}
              <code className="font-mono text-zinc-800">Scaniha-API-Version: 1</code>. Les réponses en succès sont des
              objets JSON simples (pas d&apos;enveloppe <code className="font-mono">success: true</code>).
            </p>

            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">code</th>
                    <th className="px-4 py-3 font-semibold">statut</th>
                    <th className="px-4 py-3 font-semibold">quand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-600">
                  {ERROR_CODES.map((e) => (
                    <tr key={e.code}>
                      <td className="px-4 py-3"><code className="font-mono text-zinc-800">{e.code}</code></td>
                      <td className="px-4 py-3 font-mono">{e.status}</td>
                      <td className="px-4 py-3">{e.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-zinc-500">
              Cette enveloppe structurée s&apos;applique <strong>uniquement</strong> aux routes{' '}
              <code className="font-mono">/api/v1/*</code>. Les routes internes du tableau de bord utilisent un format
              différent.
            </p>
          </div>
        </section>

        {/* ── 4. Endpoints ─────────────────────────────────────────────── */}
        <section id="endpoints" className="mb-14 scroll-mt-8">
          <h2 className="mb-6 text-2xl font-bold text-zinc-900">4. Endpoints</h2>

          {/* 4.1 GET /program */}
          <article className="mb-12">
            <h3 className="mb-3 text-xl font-bold text-zinc-900">Programme de fidélité</h3>
            <EndpointHeader method="GET" path="/api/v1/program" scope="loyalty:read" />
            <p className="mb-4 text-zinc-600">
              Configuration publique du programme de fidélité de l&apos;établissement lié à la clé. Si le programme est
              désactivé, la réponse reste <code className="font-mono">200</code> avec{' '}
              <code className="font-mono">&quot;active&quot;: false</code> (c&apos;est une lecture de configuration, pas
              une erreur).
            </p>
            <p className="mb-2 text-sm font-semibold text-zinc-700">Réponse 200</p>
            <CodeBlock>{`{
  "active": true,
  "businessName": "Café Central",
  "pointsPerTnd": 1,
  "rewardsCount": 4
}`}</CodeBlock>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Exemple</p>
            <CodeBlock>{`curl https://scaniha.com/api/v1/program \\
  -H "Authorization: Bearer sk_live_xxx"`}</CodeBlock>
            <p className="mt-3 text-sm text-zinc-500">
              Erreurs possibles&nbsp;: <code className="font-mono">unauthorized</code>,{' '}
              <code className="font-mono">invalid_key</code>, <code className="font-mono">key_revoked</code>,{' '}
              <code className="font-mono">business_inactive</code>, <code className="font-mono">insufficient_scope</code>,{' '}
              <code className="font-mono">rate_limited</code>, <code className="font-mono">server_error</code>.
            </p>
          </article>

          {/* 4.2 GET /rewards */}
          <article className="mb-12">
            <h3 className="mb-3 text-xl font-bold text-zinc-900">Liste des récompenses</h3>
            <EndpointHeader method="GET" path="/api/v1/rewards" scope="loyalty:read" />
            <p className="mb-4 text-zinc-600">
              Liste les récompenses actives du programme. Si le programme est désactivé&nbsp;:{' '}
              <code className="font-mono">program_inactive</code> (409).
            </p>
            <p className="mb-2 text-sm font-semibold text-zinc-700">Réponse 200</p>
            <CodeBlock>{`{
  "rewards": [
    { "id": "uuid", "label": "Café offert", "points_cost": 50 }
  ]
}`}</CodeBlock>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Exemple</p>
            <CodeBlock>{`curl https://scaniha.com/api/v1/rewards \\
  -H "Authorization: Bearer sk_live_xxx"`}</CodeBlock>
            <p className="mt-3 text-sm text-zinc-500">
              Erreurs possibles&nbsp;: erreurs d&apos;authentification ci-dessus,{' '}
              <code className="font-mono">program_inactive</code>.
            </p>
          </article>

          {/* 4.3 GET /customers/[phone] */}
          <article className="mb-12">
            <h3 className="mb-3 text-xl font-bold text-zinc-900">Solde &amp; historique d&apos;un client</h3>
            <EndpointHeader method="GET" path="/api/v1/customers/{phone}" scope="loyalty:read" />
            <p className="mb-4 text-zinc-600">
              Solde, historique récent et codes actifs pour un numéro de téléphone. Le <code className="font-mono">{'{phone}'}</code>{' '}
              doit être encodé pour l&apos;URL (le <code className="font-mono">+</code> devient{' '}
              <code className="font-mono">%2B</code>). Un numéro inconnu renvoie{' '}
              <code className="font-mono">balance: 0</code> avec des tableaux vides — ce n&apos;est{' '}
              <strong>pas</strong> une erreur 404.
            </p>
            <p className="mb-2 text-sm font-semibold text-zinc-700">Réponse 200</p>
            <CodeBlock>{`{
  "phone": "+21655555555",
  "balance": 85,
  "recent": [
    { "delta": 75, "reason": "purchase", "note": "Achat de 75 TND", "created_at": "2026-06-17T10:00:00Z" },
    { "delta": 10, "reason": "welcome",  "note": "Bienvenue",       "created_at": "2026-06-17T09:59:00Z" }
  ],
  "activeWins": [
    { "code": "K7F-3QZ", "label": "Café offert", "expires_at": "2026-06-18T...", "created_at": "..." }
  ],
  "activeRedemptions": [
    { "code": "A2B-CDE", "label": "Dessert", "expires_at": "2026-06-19T...", "created_at": "..." }
  ]
}`}</CodeBlock>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Exemple</p>
            <CodeBlock>{`curl https://scaniha.com/api/v1/customers/%2B21655555555 \\
  -H "Authorization: Bearer sk_live_xxx"`}</CodeBlock>
            <p className="mt-3 text-sm text-zinc-500">
              Erreurs possibles&nbsp;: erreurs d&apos;authentification,{' '}
              <code className="font-mono">validation_error</code> (téléphone invalide).
            </p>
          </article>

          {/* 4.4 POST /points/award */}
          <article className="mb-12">
            <h3 className="mb-3 text-xl font-bold text-zinc-900">Créditer des points (achat)</h3>
            <EndpointHeader method="POST" path="/api/v1/points/award" scope="loyalty:write" />
            <p className="mb-4 text-zinc-600">
              Crédite un achat. <code className="font-mono">amount</code> est le montant dépensé en TND&nbsp;; les points
              ajoutés valent <code className="font-mono">round(amount × pointsPerTnd)</code>. Le bonus de bienvenue est
              ajouté automatiquement lors de la première écriture au grand-livre du client.
            </p>
            <p className="mb-2 text-sm font-semibold text-zinc-700">Corps de la requête</p>
            <CodeBlock>{`{
  "phone": "+21655555555",
  "amount": 75,
  "note": "Optionnel, ≤ 120 caractères"
}`}</CodeBlock>
            <p className="mt-3 text-zinc-600">
              <code className="font-mono">amount</code> doit être un nombre fini strictement supérieur à 0. Si{' '}
              <code className="font-mono">note</code> est omis, une note lisible est générée automatiquement
              (ex.&nbsp;: <code className="font-mono">&quot;Achat de 75 TND&quot;</code>).
            </p>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Réponse 200</p>
            <CodeBlock>{`{
  "phone": "+21655555555",
  "pointsAdded": 75,
  "welcomeAdded": 10,
  "balance": 85
}`}</CodeBlock>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Exemple</p>
            <CodeBlock>{`curl -X POST https://scaniha.com/api/v1/points/award \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+21655555555","amount":75,"note":"Table 4"}'`}</CodeBlock>
            <p className="mt-3 text-sm text-zinc-500">
              Erreurs possibles&nbsp;: erreurs d&apos;authentification,{' '}
              <code className="font-mono">insufficient_scope</code>, <code className="font-mono">validation_error</code>{' '}
              (téléphone ou montant invalide), <code className="font-mono">program_inactive</code>.
            </p>
          </article>

          {/* 4.5 POST /rewards/redeem */}
          <article className="mb-12">
            <h3 className="mb-3 text-xl font-bold text-zinc-900">Échanger une récompense</h3>
            <EndpointHeader method="POST" path="/api/v1/rewards/redeem" scope="loyalty:write" />
            <p className="mb-4 text-zinc-600">
              Débite les points et émet un code de récompense à présenter en caisse. Si le solde est insuffisant&nbsp;:{' '}
              <code className="font-mono">insufficient_points</code> (409) avec <code className="font-mono">error.missing</code>{' '}
              = points manquants.
            </p>
            <p className="mb-2 text-sm font-semibold text-zinc-700">Corps de la requête</p>
            <CodeBlock>{`{
  "phone": "+21655555555",
  "reward_id": "uuid"
}`}</CodeBlock>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Réponse 200</p>
            <CodeBlock>{`{
  "code": "A2B-CDE",
  "rewardLabel": "Café offert",
  "expiresAt": "2026-06-19T...",
  "balance": 35
}`}</CodeBlock>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Exemple</p>
            <CodeBlock>{`curl -X POST https://scaniha.com/api/v1/rewards/redeem \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+21655555555","reward_id":"<uuid>"}'`}</CodeBlock>
            <p className="mt-3 text-sm text-zinc-500">
              Erreurs possibles&nbsp;: erreurs d&apos;authentification,{' '}
              <code className="font-mono">insufficient_scope</code>, <code className="font-mono">validation_error</code>,{' '}
              <code className="font-mono">not_found</code> (récompense introuvable),{' '}
              <code className="font-mono">insufficient_points</code>, <code className="font-mono">program_inactive</code>.
            </p>
          </article>

          {/* 4.6 POST /codes/validate */}
          <article className="mb-2">
            <h3 className="mb-3 text-xl font-bold text-zinc-900">Valider un code</h3>
            <EndpointHeader method="POST" path="/api/v1/codes/validate" scope="loyalty:write" />
            <p className="mb-4 text-zinc-600">
              Valide un code gagnant (roue) <strong>ou</strong> un code de récompense.{' '}
              <code className="font-mono">redeem</code> vaut <strong>false par défaut</strong> sur l&apos;API&nbsp;: par
              défaut, le code est seulement consulté (« peek ») sans être consommé. Passez{' '}
              <code className="font-mono">&quot;redeem&quot;: true</code> pour le consommer (un code ne peut être consommé
              qu&apos;une seule fois).
            </p>
            <p className="mb-2 text-sm font-semibold text-zinc-700">Corps de la requête</p>
            <CodeBlock>{`{
  "code": "A2B-CDE",
  "redeem": false
}`}</CodeBlock>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Réponse 200 — code introuvable</p>
            <CodeBlock>{`{ "found": false }`}</CodeBlock>
            <p className="mt-2 text-sm text-zinc-500">
              Un code appartenant à un autre établissement renvoie également{' '}
              <code className="font-mono">{'{ "found": false }'}</code> — chaque clé ne voit que ses propres codes.
            </p>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Réponse 200 — code trouvé</p>
            <CodeBlock>{`{
  "found": true,
  "kind": "win",
  "status": "valid",
  "label": "Café offert",
  "customerPhone": "+21655555555",
  "expiresAt": "2026-06-18T...",
  "redeemedAt": null,
  "pointsCost": null
}`}</CodeBlock>
            <div className="mt-4 space-y-2 text-zinc-600">
              <p className="font-semibold text-zinc-700">Sémantique des champs</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span><code className="font-mono">kind</code> ∈ <code className="font-mono">win | reward</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span>
                    <code className="font-mono">status</code> ∈{' '}
                    <code className="font-mono">valid | redeemed | expired | already | cancelled</code>.{' '}
                    <code className="font-mono">valid</code> n&apos;apparaît qu&apos;en mode peek (redeem = false).{' '}
                    <code className="font-mono">cancelled</code> ne concerne que les codes de récompense.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span>
                    <code className="font-mono">customerPhone</code> peut être <strong>null</strong> (ex.&nbsp;: un gain
                    de la roue obtenu sans téléphone). Votre intégration doit tolérer la valeur null.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span><code className="font-mono">redeemedAt</code> n&apos;est présent que pour{' '}
                    <code className="font-mono">status: &quot;already&quot;</code> (code déjà collecté).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span><code className="font-mono">pointsCost</code> n&apos;est présent que pour{' '}
                    <code className="font-mono">kind: &quot;reward&quot;</code> (null/absent pour les gains).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span><code className="font-mono">expiresAt</code> n&apos;est présent que pour{' '}
                    <code className="font-mono">status: &quot;valid&quot;</code> (mode peek).</span>
                </li>
              </ul>
            </div>
            <p className="mb-2 mt-4 text-sm font-semibold text-zinc-700">Exemple</p>
            <CodeBlock>{`curl -X POST https://scaniha.com/api/v1/codes/validate \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"A2B-CDE","redeem":true}'`}</CodeBlock>
            <p className="mt-3 text-sm text-zinc-500">
              Erreurs possibles&nbsp;: erreurs d&apos;authentification,{' '}
              <code className="font-mono">insufficient_scope</code>, <code className="font-mono">validation_error</code>{' '}
              (code trop court ou manquant).
            </p>
          </article>
        </section>

        {/* ── 5. Limites & usage équitable ─────────────────────────────── */}
        <section id="limites" className="mb-14 scroll-mt-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">5. Limites &amp; usage équitable</h2>
          <div className="space-y-4 text-zinc-600">
            <p>
              L&apos;API applique une politique d&apos;usage équitable&nbsp;: <strong>60 requêtes par minute</strong> et{' '}
              <strong>5 000 requêtes par jour</strong> par clé. Au-delà, les requêtes renvoient{' '}
              <code className="font-mono">rate_limited</code> (429) avec un en-tête{' '}
              <code className="font-mono">Retry-After</code> indiquant le nombre de secondes à attendre.
            </p>
            <p>
              Cette limite est <strong>best-effort</strong>&nbsp;: elle protège contre un emballement accidentel (une
              boucle de caisse mal configurée, par exemple) mais n&apos;est pas un quota strict et distribué. Concevez
              votre intégration pour respecter <code className="font-mono">Retry-After</code> et éviter les rafales.
            </p>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-1 font-bold text-zinc-800">Révocation &amp; suspension — cohérence éventuelle</p>
              <p>
                Une clé révoquée, ou un établissement suspendu, prend effet à la{' '}
                <strong>prochaine requête</strong> — la validation est refaite à chaque appel, mais n&apos;est pas
                appliquée en cours de requête. Au pire, une requête déjà en vol au moment exact de la révocation peut
                aboutir.
              </p>
            </div>
            <p>
              En cas d&apos;usage abusif et persistant, révoquez la clé concernée depuis{' '}
              <Link href="/admin/api" className="font-medium text-orange-600 hover:text-orange-700">/admin/api</Link>{' '}
              (la dernière utilisation de chaque clé y est visible).
            </p>
          </div>
        </section>

        {/* ── 6. Versionnement ─────────────────────────────────────────── */}
        <section id="versionnement" className="mb-14 scroll-mt-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">6. Versionnement</h2>
          <div className="space-y-4 text-zinc-600">
            <p>
              L&apos;API est versionnée dans l&apos;URL, sous <code className="font-mono">/api/v1/</code>. Les
              changements cassants seront publiés sous <code className="font-mono">/api/v2/</code>&nbsp;; la v1 reste
              stable.
            </p>
            <p>
              Chaque réponse porte l&apos;en-tête <code className="font-mono">Scaniha-API-Version: 1</code> (succès comme
              erreur).
            </p>
            <p>
              L&apos;ajout de nouveaux champs <strong>optionnels</strong> dans les réponses n&apos;est pas considéré
              comme cassant&nbsp;: votre client doit tolérer les champs inconnus.
            </p>
          </div>
        </section>

        {/* ── 7. Tarifs & renouvellement ───────────────────────────────── */}
        <section id="tarifs" className="mb-6 scroll-mt-8">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900">7. Tarifs &amp; renouvellement</h2>
          <div className="space-y-4 text-zinc-600">
            <p>
              L&apos;accès à l&apos;API est inclus avec le programme de fidélité de votre établissement. Trois formules
              sont proposées, en dinars tunisiens&nbsp;:
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Menu QR — 1 an</p>
                <p className="mt-1 text-2xl font-extrabold text-zinc-900">150 TND<span className="text-base font-medium text-zinc-400"> /an</span></p>
                <p className="mt-2 text-sm text-zinc-500">Menu numérique + QR, renouvelable annuellement.</p>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Menu QR — À vie</p>
                <p className="mt-1 text-2xl font-extrabold text-zinc-900">250 TND<span className="text-base font-medium text-zinc-400"> /unique</span></p>
                <p className="mt-2 text-sm text-zinc-500">Paiement unique — ne se renouvelle pas.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Fidélité + API — 1 an</p>
                <p className="mt-1 text-2xl font-extrabold text-zinc-900">50 TND<span className="text-base font-medium text-zinc-400"> /an</span></p>
                <p className="mt-2 text-sm text-zinc-500">Programme de fidélité &amp; accès API, abonnement annuel.</p>
              </div>
            </div>
            <p>
              Le paiement se fait <strong>manuellement</strong> (D17, virement RIB ou Flouci), avec envoi du reçu depuis
              votre tableau de bord.
            </p>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-1 font-bold text-zinc-800">Renouvellement</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span>Le renouvellement annuel est <strong>manuel</strong> — il n&apos;y a aucun prélèvement automatique.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span>Une facture / un rappel est envoyé avant l&apos;échéance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span>
                    Une <strong>période de grâce de 30 jours</strong> suit l&apos;échéance&nbsp;: la clé continue de
                    fonctionner. Passé ce délai, l&apos;API renvoie <code className="font-mono">business_inactive</code>{' '}
                    jusqu&apos;au paiement.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-orange-600">•</span>
                  <span>L&apos;option <strong>À vie</strong> ne se renouvelle pas.</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/pricing"
                className="inline-block rounded-xl border border-zinc-300 px-6 py-3 font-semibold text-zinc-800 transition-colors hover:border-zinc-400"
              >
                Voir les tarifs
              </Link>
              <Link
                href="/signup?plan=api_year"
                className="inline-block rounded-xl bg-gradient-to-r from-[#F47B20] to-[#F5B82E] px-6 py-3 font-extrabold text-white shadow-lg"
              >
                Activer l&apos;API
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-14 border-t border-zinc-200 pt-8 text-center">
          <p className="mb-4 text-zinc-600">Une question sur l&apos;intégration ?</p>
          <Link href="/contact" className="font-medium text-orange-600 hover:text-orange-700">
            Contactez-nous &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
