/**
 * WordPress → Payload CMS: Achievements Import Script
 *
 * Run AFTER import-objectives.ts — this script looks up objectives in Payload
 * by their _wp_id to resolve relationship IDs.
 *
 * Usage:
 *   npx tsx scripts/import-achievements.ts
 *
 * Dry run:
 *   DRY_RUN=true npx tsx scripts/import-achievements.ts
 *
 * Upsert mode (update existing records instead of skipping):
 *   UPSERT=true npx tsx scripts/import-achievements.ts
 *
 * Prerequisites:
 *   - Objectives must already be imported (import-objectives.ts)
 *   - Set in .env.local:
 *       WP_BASE_URL      https://patrickmichaelregan.com
 *       WP_USERNAME      your-wp-username
 *       WP_PASSWORD      your-wp-application-password
 *       PAYLOAD_API_URL  http://localhost:3000
 *       PAYLOAD_EMAIL    your-payload-admin@email.com
 *       PAYLOAD_PASSWORD your-payload-admin-password
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
const UPSERT = process.env.UPSERT === 'true'

const WP_PER_PAGE = 100

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WpAchievement {
  id: number
  name: string
  slug: string
  description: string
  parent: number
}

interface PayloadGroup {
  name: string
  description?: object
  objectives: string[] // Payload document IDs
}

interface PayloadAchievement {
  achievement: string
  description?: object
  groups: PayloadGroup[]
  _wp_id?: number
  _wp_slug?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap plain text in a Lexical editor JSON structure.
 *  Each newline-separated paragraph becomes its own Lexical paragraph node. */
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

/** Clean up plain-text descriptions — kept for compatibility */
function cleanDescription(text: string): object | undefined {
  return toLexical(text)
}

function wpAuthHeader(): HeadersInit {
  const encoded = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString('base64')
  return { Authorization: `Basic ${encoded}` }
}

async function wpGet<T>(path: string): Promise<T> {
  const res = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/${path}`, {
    headers: { ...wpAuthHeader(), 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WordPress API error (${res.status}) for /${path}: ${text}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Step 1: Fetch all WP achievements (parents + children)
// ---------------------------------------------------------------------------

async function fetchAllWpAchievements(): Promise<WpAchievement[]> {
  const all: WpAchievement[] = []
  let page = 1

  console.log('📥  Fetching achievements from WordPress…')

  while (true) {
    const batch = await wpGet<WpAchievement[]>(
      `achievement?per_page=${WP_PER_PAGE}&page=${page}&_fields=id,name,slug,description,parent`,
    )
    if (batch.length === 0) break
    all.push(...batch)
    console.log(`  Page ${page}: ${batch.length} achievements (total: ${all.length})`)
    if (batch.length < WP_PER_PAGE) break
    page++
  }

  console.log(`✅  Total WP achievements: ${all.length}\n`)
  return all
}

// ---------------------------------------------------------------------------
// Step 2: Fetch objective IDs linked to a WP achievement term
// Returns WP objective IDs (numbers)
// ---------------------------------------------------------------------------

async function fetchWpObjectiveIdsForTerm(termId: number): Promise<number[]> {
  const ids: number[] = []
  let page = 1

  while (true) {
    const url = `objective?achievement=${termId}&per_page=${WP_PER_PAGE}&page=${page}&_fields=id`
    const res = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/${url}`, {
      headers: { ...wpAuthHeader(), 'Content-Type': 'application/json' },
    })

    if (res.status === 400) break // WP returns 400 when page exceeds total — not a real error
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`WordPress API error (${res.status}) for /${url}: ${text}`)
    }

    const batch: Array<{ id: number }> = await res.json()
    if (batch.length === 0) break
    ids.push(...batch.map((o) => o.id))
    if (batch.length < WP_PER_PAGE) break
    page++
  }

  return ids
}

// ---------------------------------------------------------------------------
// Step 3: Authenticate with Payload
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
// Step 4: Build a map of WP objective ID → Payload document ID
// ---------------------------------------------------------------------------

async function buildObjectiveIdMap(token: string): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  let page = 1

  console.log('🗺️   Building WP→Payload objective ID map…')

  while (true) {
    const res = await fetch(`${PAYLOAD_URL}/api/objectives?limit=100&page=${page}&depth=0`, {
      headers: { Authorization: `JWT ${token}` },
    })
    if (!res.ok) {
      console.warn(`  ⚠️  Payload objectives fetch failed on page ${page} (${res.status})`)
      break
    }

    const data = await res.json()
    const docs: Array<{ id: string; _wp_id?: number }> = data.docs ?? []
    console.log(
      `  Page ${page}: ${docs.length} objectives (totalDocs: ${data.totalDocs}, hasNextPage: ${data.hasNextPage})`,
    )

    if (docs.length === 0) break

    for (const doc of docs) {
      if (doc._wp_id) map.set(doc._wp_id, doc.id)
    }

    if (!data.hasNextPage) break
    page++
  }

  console.log(`✅  Mapped ${map.size} objectives\n`)
  return map
}

// ---------------------------------------------------------------------------
// Step 5: Fetch existing achievements — returns map of WP id -> Payload doc id
// ---------------------------------------------------------------------------

async function fetchExistingAchievements(token: string): Promise<Map<number, number>> {
  const existing = new Map<number, number>()
  let page = 1

  while (true) {
    const res = await fetch(`${PAYLOAD_URL}/api/achievements?limit=100&page=${page}&depth=0`, {
      headers: { Authorization: `JWT ${token}` },
    })
    if (!res.ok) break

    const data = await res.json()
    const docs: Array<{ id: number; _wp_id?: number }> = data.docs ?? []
    if (docs.length === 0) break

    for (const doc of docs) {
      if (doc._wp_id) existing.set(doc._wp_id, doc.id)
    }

    if (!data.hasNextPage) break
    page++
  }

  return existing
}

// ---------------------------------------------------------------------------
// Step 6: Build Payload achievement objects from WP data
// ---------------------------------------------------------------------------

async function buildPayloadAchievement(
  parent: WpAchievement,
  children: WpAchievement[],
  objectiveIdMap: Map<number, string>,
): Promise<PayloadAchievement> {
  const groups: PayloadGroup[] = []

  if (children.length === 0) {
    // Parent has no children — fetch its objectives directly and make one group
    console.log(`    "${parent.name}" has no children — fetching objectives directly…`)
    const wpObjIds = await fetchWpObjectiveIdsForTerm(parent.id)
    const payloadIds = wpObjIds
      .map((id) => objectiveIdMap.get(id))
      .filter((id): id is string => id !== undefined)

    if (wpObjIds.length !== payloadIds.length) {
      const missing = wpObjIds.filter((id) => !objectiveIdMap.has(id))
      console.warn(
        `    ⚠️  ${missing.length} objective(s) not found in Payload (WP ids: ${missing.join(', ')})`,
      )
    }

    groups.push({
      name: parent.name,
      description: cleanDescription(parent.description),
      objectives: payloadIds,
    })
  } else {
    // Each child becomes a group
    for (const child of children) {
      console.log(`    Group: "${child.name}" (WP id: ${child.id})`)
      const wpObjIds = await fetchWpObjectiveIdsForTerm(child.id)
      const payloadIds = wpObjIds
        .map((id) => objectiveIdMap.get(id))
        .filter((id): id is string => id !== undefined)

      if (wpObjIds.length !== payloadIds.length) {
        const missing = wpObjIds.filter((id) => !objectiveIdMap.has(id))
        console.warn(
          `    ⚠️  ${missing.length} objective(s) not found in Payload (WP ids: ${missing.join(', ')})`,
        )
      }

      groups.push({
        name: child.name,
        description: cleanDescription(child.description),
        objectives: payloadIds,
      })
    }
  }

  return {
    achievement: parent.name,
    description: cleanDescription(parent.description),
    groups,
    _wp_id: parent.id,
    _wp_slug: parent.slug,
  }
}

// ---------------------------------------------------------------------------
// Step 7: POST achievement to Payload
// ---------------------------------------------------------------------------

async function createPayloadAchievement(token: string, payload: PayloadAchievement): Promise<void> {
  const res = await fetch(`${PAYLOAD_URL}/api/achievements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to create "${payload.achievement}" (${res.status}): ${text}`)
  }
}

async function patchPayloadAchievement(
  token: string,
  payloadDocId: number,
  payload: PayloadAchievement,
): Promise<void> {
  const res = await fetch(`${PAYLOAD_URL}/api/achievements/${payloadDocId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update "${payload.achievement}" (${res.status}): ${text}`)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!WP_USERNAME || !WP_PASSWORD) {
    console.error('❌  WP_USERNAME and WP_PASSWORD env vars are required.')
    process.exit(1)
  }
  if (DRY_RUN) console.log('🔍  DRY RUN — nothing will be written to Payload\n')

  // Fetch everything from WordPress
  const allWp = await fetchAllWpAchievements()
  const parents = allWp.filter((a) => a.parent === 0)
  const children = allWp.filter((a) => a.parent !== 0)

  // Group children by parent id
  const childrenByParent = new Map<number, WpAchievement[]>()
  for (const child of children) {
    const list = childrenByParent.get(child.parent) ?? []
    list.push(child)
    childrenByParent.set(child.parent, list)
  }

  console.log(`📊  ${parents.length} parent achievements, ${children.length} child groups\n`)

  // Always authenticate with Payload — needed for the objective ID map even in dry run
  let token = ''
  let objectiveIdMap = new Map<number, string>()

  if (!PAYLOAD_EMAIL || !PAYLOAD_PASS) {
    console.error('❌  PAYLOAD_EMAIL and PAYLOAD_PASSWORD env vars are required.')
    process.exit(1)
  }

  token = await getPayloadToken()
  objectiveIdMap = await buildObjectiveIdMap(token)

  console.log('🔍  Checking for existing achievements in Payload…')
  const existingAchievements = await fetchExistingAchievements(token)
  console.log(`    ${existingAchievements.size} already imported\n`)

  if (UPSERT) console.log('🔄  UPSERT mode — existing records will be updated\n')

  const toCreate = parents.filter((p) => !existingAchievements.has(p.id))
  const toUpdate = UPSERT ? parents.filter((p) => existingAchievements.has(p.id)) : []
  const toSkip = !UPSERT ? parents.filter((p) => existingAchievements.has(p.id)) : []

  console.log(
    `📤  ${DRY_RUN ? 'Would create' : 'Creating'} ${toCreate.length}, ${DRY_RUN ? 'would update' : 'updating'} ${toUpdate.length}, skipping ${toSkip.length}…\n`,
  )

  let created = 0
  let updated = 0
  const failures: Array<{ name: string; wpId: number; reason: string }> = []

  for (const parent of [...toCreate, ...toUpdate]) {
    const isUpdate = existingAchievements.has(parent.id)
    const kids = childrenByParent.get(parent.id) ?? []
    const action = isUpdate ? 'update' : 'create'
    console.log(
      `\n▶  "${parent.name}" (WP id: ${parent.id}, ${kids.length} child group(s)) [${action}]`,
    )

    try {
      const mapped = await buildPayloadAchievement(parent, kids, objectiveIdMap)

      if (DRY_RUN) {
        console.log(`  🔍  [DRY RUN] Would ${action}:`)
        console.log('  ' + JSON.stringify(mapped, null, 4).split('\n').join('\n  '))
        isUpdate ? updated++ : created++
        continue
      }

      if (isUpdate) {
        const payloadDocId = existingAchievements.get(parent.id)!
        await patchPayloadAchievement(token, payloadDocId, mapped)
        console.log(`  ✅  Updated "${mapped.achievement}"`)
        updated++
      } else {
        await createPayloadAchievement(token, mapped)
        console.log(`  ✅  Created "${mapped.achievement}"`)
        created++
      }
    } catch (err) {
      console.log(`  ❌  "${parent.name}" (WP id: ${parent.id}) — see failures summary below`)
      failures.push({ name: parent.name, wpId: parent.id, reason: (err as Error).message })
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${DRY_RUN ? 'Dry run complete (no data written)' : 'Import complete'}
  ✅  ${DRY_RUN ? 'Would create' : 'Created'} : ${created}
  🔄  ${DRY_RUN ? 'Would update' : 'Updated'} : ${updated}
  ⏭️  Skipped         : ${toSkip.length}
  ❌  Failed          : ${failures.length}
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
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
