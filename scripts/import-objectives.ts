/**
 * WordPress → Payload CMS: Objectives Import Script
 *
 * Usage:
 *   npx tsx import-objectives.ts
 *
 * Prerequisites:
 *   - Place this file at the root of your Payload project
 *   - Set env vars (or create a .env.local) before running:
 *       WP_BASE_URL      https://patrickmichaelregan.com
 *       WP_USERNAME      your-wp-username
 *       WP_PASSWORD      your-wp-application-password   (WP Settings → Users → Application Passwords)
 *       PAYLOAD_API_URL  http://localhost:3000            (your running Payload dev server)
 *       PAYLOAD_EMAIL    your-payload-admin@email.com
 *       PAYLOAD_PASSWORD your-payload-admin-password
 *       DRY_RUN          true   (optional — preview without writing anything)
 *
 * Dry run:
 *   DRY_RUN=true npx tsx scripts/import-objectives.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WP_BASE_URL = process.env.WP_BASE_URL ?? 'https://patrickmichaelregan.com'
const WP_USERNAME = process.env.WP_USERNAME ?? ''
const WP_PASSWORD = process.env.WP_PASSWORD ?? '' // WP Application Password
const PAYLOAD_URL = process.env.PAYLOAD_API_URL ?? 'http://localhost:3000'
const PAYLOAD_EMAIL = process.env.PAYLOAD_EMAIL ?? ''
const PAYLOAD_PASS = process.env.PAYLOAD_PASSWORD ?? ''

const DRY_RUN = process.env.DRY_RUN === 'true'
const WP_PER_PAGE = 100 // max WordPress allows

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WpObjective {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  slug: string
  status: string
  acf: {
    latitude?: number
    longitude?: number
    prominence_ft?: number
    isolation_mi?: number
  }
  achievement: number[]
}

interface PayloadObjective {
  objective: string
  latitude?: number
  longitude?: number
  prominence_ft?: number
  isolation_mi?: number
  description?: string
  _wp_id?: number // stored as metadata so you can re-run safely
  _wp_slug?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and decode basic entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Basic auth header for WordPress */
function wpAuthHeader(): HeadersInit {
  const encoded = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString('base64')
  return { Authorization: `Basic ${encoded}` }
}

// ---------------------------------------------------------------------------
// Step 1: Fetch all objectives from WordPress
// ---------------------------------------------------------------------------

async function fetchAllWpObjectives(): Promise<WpObjective[]> {
  const all: WpObjective[] = []
  let page = 1

  console.log('📥  Fetching objectives from WordPress…')

  while (true) {
    const url = `${WP_BASE_URL}/wp-json/wp/v2/objective?per_page=${WP_PER_PAGE}&page=${page}&_fields=id,title,content,slug,status,acf,achievement`

    const res = await fetch(url, {
      headers: {
        ...wpAuthHeader(),
        'Content-Type': 'application/json',
      },
    })

    if (res.status === 400) break // WP returns 400 when page exceeds total
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`WordPress API error (${res.status}): ${text}`)
    }

    const batch: WpObjective[] = await res.json()
    if (batch.length === 0) break

    all.push(...batch)
    console.log(`  Page ${page}: fetched ${batch.length} objectives (total so far: ${all.length})`)

    if (batch.length < WP_PER_PAGE) break
    page++
  }

  console.log(`✅  Total WordPress objectives fetched: ${all.length}\n`)
  return all
}

// ---------------------------------------------------------------------------
// Step 2: Authenticate with Payload
// ---------------------------------------------------------------------------

async function getPayloadToken(): Promise<string> {
  console.log('🔑  Authenticating with Payload…')

  const res = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: PAYLOAD_EMAIL, password: PAYLOAD_PASS }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Payload login failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  const token: string = data.token
  console.log('✅  Payload authenticated\n')
  return token
}

// ---------------------------------------------------------------------------
// Step 3: Check which objectives already exist (by _wp_id) to avoid dupes
// ---------------------------------------------------------------------------

async function fetchExistingWpIds(token: string): Promise<Set<number>> {
  const existing = new Set<number>()
  let page = 1

  while (true) {
    const res = await fetch(`${PAYLOAD_URL}/api/objectives?limit=100&page=${page}&depth=0`, {
      headers: { Authorization: `JWT ${token}` },
    })

    if (!res.ok) break

    const data = await res.json()
    const docs: Array<{ _wp_id?: number }> = data.docs ?? []
    if (docs.length === 0) break

    for (const doc of docs) {
      if (doc._wp_id) existing.add(doc._wp_id)
    }

    if (!data.hasNextPage) break
    page++
  }

  return existing
}

// ---------------------------------------------------------------------------
// Step 4: Map WP → Payload shape
// ---------------------------------------------------------------------------

function mapObjective(wp: WpObjective): PayloadObjective {
  const raw = wp.content?.rendered ?? ''
  const description = stripHtml(raw)

  return {
    objective: wp.title.rendered,
    latitude: wp.acf?.latitude ?? undefined,
    longitude: wp.acf?.longitude ?? undefined,
    prominence_ft: wp.acf?.prominence_ft ?? undefined,
    isolation_mi: wp.acf?.isolation_mi ?? undefined,
    description: description || undefined,
    _wp_id: wp.id,
    _wp_slug: wp.slug,
  }
}

// ---------------------------------------------------------------------------
// Step 5: POST each objective to Payload
// ---------------------------------------------------------------------------

async function createPayloadObjective(token: string, payload: PayloadObjective): Promise<void> {
  const res = await fetch(`${PAYLOAD_URL}/api/objectives`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create "${payload.objective}" (${res.status}): ${text}`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!WP_USERNAME || !WP_PASSWORD) {
    console.error('❌  WP_USERNAME and WP_PASSWORD env vars are required.')
    console.error(
      '    Create an Application Password in WordPress under Users → Profile → Application Passwords.',
    )
    process.exit(1)
  }
  if (!DRY_RUN && (!PAYLOAD_EMAIL || !PAYLOAD_PASS)) {
    console.error('❌  PAYLOAD_EMAIL and PAYLOAD_PASSWORD env vars are required.')
    process.exit(1)
  }

  const wpObjectives = await fetchAllWpObjectives()

  // In dry run mode we skip Payload auth and dupe-checking entirely
  let token = ''
  const existingIds = new Set<number>()

  if (!DRY_RUN) {
    token = await getPayloadToken()
    console.log('🔍  Checking for already-imported objectives…')
    const ids = await fetchExistingWpIds(token)
    ids.forEach((id) => existingIds.add(id))
    console.log(`    ${existingIds.size} already imported — will skip duplicates\n`)
  }

  const toImport = wpObjectives.filter((o) => !existingIds.has(o.id))

  if (DRY_RUN) {
    console.log(`🔍  DRY RUN — nothing will be written to Payload\n`)
  }

  console.log(`📤  ${DRY_RUN ? 'Would import' : 'Importing'} ${toImport.length} new objectives…\n`)

  let success = 0
  let skipped = 0
  let failed = 0

  for (const wp of toImport) {
    const mapped = mapObjective(wp)
    if (DRY_RUN) {
      console.log(`  🔍  [DRY RUN] ${mapped.objective} (WP id: ${wp.id})`)
      console.log(`      ${JSON.stringify(mapped, null, 6).split('\n').join('\n      ')}`)
      success++
      continue
    }
    try {
      await createPayloadObjective(token, mapped)
      console.log(`  ✅  ${mapped.objective} (WP id: ${wp.id})`)
      success++
    } catch (err) {
      console.error(`  ❌  ${mapped.objective} (WP id: ${wp.id}):`, (err as Error).message)
      failed++
    }
  }

  skipped = existingIds.size

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${DRY_RUN ? 'Dry run complete (no data written)' : 'Import complete'}
  ${DRY_RUN ? '🔍' : '✅'}  ${DRY_RUN ? 'Would import' : 'Imported'} : ${success}
  ⏭️  Skipped          : ${skipped}
  ❌  Failed           : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

  if (toImport.some((o) => o.achievement?.length)) {
    console.log(`⚠️  NOTE: achievement taxonomy IDs were found on some WordPress objectives.`)
    console.log(`    The "achievements" field in Payload is a join type — it's managed from`)
    console.log(`    the Achievements collection side, not set directly on Objectives.`)
    console.log(`    You'll need a separate script to import Achievements and link them.\n`)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
