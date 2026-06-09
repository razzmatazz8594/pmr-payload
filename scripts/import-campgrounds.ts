/**
 * WordPress → Payload CMS: Campgrounds Import Script
 *
 * Usage:
 *   npx tsx scripts/import-Campgrounds.ts
 *
 * Prerequisites:
 *   - Place this file at the root of your Payload project (or in scripts/)
 *   - Set env vars (or create a .env.local) before running:
 *       WP_BASE_URL      https://patrickmichaelregan.com
 *       WP_USERNAME      your-wp-username
 *       WP_PASSWORD      your-wp-application-password
 *       PAYLOAD_API_URL  http://localhost:3000
 *       PAYLOAD_EMAIL    your-payload-admin@email.com
 *       PAYLOAD_PASSWORD your-payload-admin-password
 *       DRY_RUN          true   (optional — preview without writing anything)
 *
 * Dry run:
 *   DRY_RUN=true npx tsx scripts/import-Campgrounds.ts
 *
 * Notes:
 *   - Elevation is NOT sent to Payload; the elevationBeforeChangeHook on the
 *     Campgrounds collection fetches it automatically from lat/lng.
 *   - Re-running is safe: existing Campgrounds (matched by _wp_id) are skipped.
 *   - Requires the updated Campgrounds.ts that includes _wp_id and _wp_slug fields.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WP_BASE_URL = process.env.WP_BASE_URL ?? 'https://patrickmichaelregan.com'
const WP_USERNAME = process.env.WP_USERNAME ?? ''
const WP_PASSWORD = process.env.WP_PASSWORD ?? ''
const PAYLOAD_URL = process.env.PAYLOAD_API_URL ?? 'http://localhost:3000'
const PAYLOAD_EMAIL = process.env.PAYLOAD_EMAIL ?? ''
const PAYLOAD_PASS = process.env.PAYLOAD_PASSWORD ?? ''

const DRY_RUN = process.env.DRY_RUN === 'true'
const WP_PER_PAGE = 100

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WpCampground {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  slug: string
  status: string
  acf: {
    latitude?: number
    longitude?: number
  }
}

interface PayloadCampground {
  campground: string
  latitude?: number
  longitude?: number
  description?: object
  _wp_id: number
  _wp_slug: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags and decode common entities */
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

/** Wrap plain text in a Lexical editor JSON structure */
function toLexical(text: string): object | undefined {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!cleaned) return undefined

  const paragraphs = cleaned.split(/\n+/).filter((p) => p.trim())

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: paragraphs.map((para) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: [
          {
            type: 'text',
            format: 0,
            style: '',
            mode: 'normal',
            detail: 0,
            text: para.trim(),
            version: 1,
          },
        ],
        direction: 'ltr',
        textFormat: 0,
        textStyle: '',
      })),
      direction: 'ltr',
    },
  }
}

/** Basic auth header for WordPress */
function wpAuthHeader(): HeadersInit {
  const encoded = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString('base64')
  return { Authorization: `Basic ${encoded}` }
}

// ---------------------------------------------------------------------------
// Step 1: Fetch all Campgrounds from WordPress
// ---------------------------------------------------------------------------

async function fetchAllWpCampgrounds(): Promise<WpCampground[]> {
  const all: WpCampground[] = []
  let page = 1

  console.log('📥  Fetching Campgrounds from WordPress…')

  while (true) {
    const url = `${WP_BASE_URL}/wp-json/wp/v2/campground?per_page=${WP_PER_PAGE}&page=${page}&_fields=id,title,content,slug,status,acf`

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

    const batch: WpCampground[] = await res.json()
    if (batch.length === 0) break

    all.push(...batch)
    console.log(`  Page ${page}: fetched ${batch.length} Campgrounds (total so far: ${all.length})`)

    if (batch.length < WP_PER_PAGE) break
    page++
  }

  console.log(`✅  Total WordPress Campgrounds fetched: ${all.length}\n`)
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
  console.log('✅  Payload authenticated\n')
  return data.token
}

// ---------------------------------------------------------------------------
// Step 3: Check which Campgrounds already exist (by _wp_id) to avoid dupes
// ---------------------------------------------------------------------------

async function fetchExistingWpIds(token: string): Promise<Set<number>> {
  const existing = new Set<number>()
  let page = 1

  while (true) {
    const res = await fetch(`${PAYLOAD_URL}/api/campgrounds?limit=100&page=${page}&depth=0`, {
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

function mapCampground(wp: WpCampground): PayloadCampground {
  const raw = wp.content?.rendered ?? ''
  const description = stripHtml(raw)

  return {
    campground: wp.title.rendered
      .replace(/&amp;/g, '&')
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#038;/g, '&')
      .trim(),
    latitude: wp.acf?.latitude ?? undefined,
    longitude: wp.acf?.longitude ?? undefined,
    description: description ? toLexical(description) : undefined,
    _wp_id: wp.id,
    _wp_slug: wp.slug,
  }
}

// ---------------------------------------------------------------------------
// Step 5: POST each campground to Payload
// ---------------------------------------------------------------------------

async function createPayloadCampground(token: string, payload: PayloadCampground): Promise<void> {
  const res = await fetch(`${PAYLOAD_URL}/api/campgrounds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create "${payload.campground}" (${res.status}): ${text}`)
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

  const wpCampgrounds = await fetchAllWpCampgrounds()

  let token = ''
  const existingIds = new Set<number>()

  if (!DRY_RUN) {
    token = await getPayloadToken()
    console.log('🔍  Checking for already-imported Campgrounds…')
    const ids = await fetchExistingWpIds(token)
    ids.forEach((id) => existingIds.add(id))
    console.log(`    ${existingIds.size} already imported — will skip duplicates\n`)
  }

  const toImport = wpCampgrounds.filter((t) => !existingIds.has(t.id))

  if (DRY_RUN) {
    console.log(`🔍  DRY RUN — nothing will be written to Payload\n`)
  }

  console.log(`📤  ${DRY_RUN ? 'Would import' : 'Importing'} ${toImport.length} new Campgrounds…\n`)

  let success = 0
  const failures: Array<{ name: string; wpId: number; reason: string }> = []

  for (const wp of toImport) {
    const mapped = mapCampground(wp)

    if (DRY_RUN) {
      console.log(`  🔍  [DRY RUN] ${mapped.campground} (WP id: ${wp.id})`)
      console.log(`      lat: ${mapped.latitude ?? 'n/a'}, lng: ${mapped.longitude ?? 'n/a'}`)
      success++
      continue
    }

    try {
      await createPayloadCampground(token, mapped)
      console.log(`  ✅  ${mapped.campground} (WP id: ${wp.id})`)
      success++
    } catch (err) {
      console.log(`  ❌  ${mapped.campground} (WP id: ${wp.id}) — see failures summary below`)
      failures.push({ name: mapped.campground, wpId: wp.id, reason: (err as Error).message })
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${DRY_RUN ? 'Dry run complete (no data written)' : 'Import complete'}
  ${DRY_RUN ? '🔍' : '✅'}  ${DRY_RUN ? 'Would import' : 'Imported'} : ${success}
  ⏭️  Skipped          : ${existingIds.size}
  ❌  Failed           : ${failures.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)

  if (failures.length > 0) {
    console.log('❌  FAILURES SUMMARY:')
    for (const f of failures) {
      console.log(`\n  • ${f.name} (WP id: ${f.wpId})`)
      console.log(`    ${f.reason}`)
    }
    console.log('')
  }

  if (wpCampgrounds.some((t) => !t.acf?.latitude || !t.acf?.longitude)) {
    const missing = wpCampgrounds.filter((t) => !t.acf?.latitude || !t.acf?.longitude)
    console.log(`⚠️  NOTE: ${missing.length} campground(s) are missing lat/lng in WordPress:`)
    for (const t of missing) {
      console.log(`    • ${t.title.rendered} (WP id: ${t.id})`)
    }
    console.log(
      `    These were imported without coordinates. Elevation will not be auto-fetched for them.\n`,
    )
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
