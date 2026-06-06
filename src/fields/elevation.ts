// fields/elevation.ts
import type { Field, CollectionBeforeChangeHook } from 'payload'

export const elevationBeforeChangeHook: CollectionBeforeChangeHook = async ({ data }) => {
  const lat = data.latitude
  const lon = data.longitude

  if (lat != null && lon != null) {
    try {
      const url = `https://epqs.nationalmap.gov/v1/json?x=${lon}&y=${lat}&wkid=4326&units=feet&includeDate=false`
      const response = await fetch(url)
      const json = await response.json()
      const elevation = json?.value

      if (elevation != null && elevation !== -1000000) {
        data.elevation = Math.round(elevation)
      }
    } catch (err) {
      console.error('EPQS elevation lookup failed:', err)
    }
  }
  return data
}

export const elevationField = (): Field => ({
  name: 'elevation',
  label: 'Elevation (ft)',
  type: 'number',
  admin: {
    readOnly: true,
    description: 'Auto-populated from USGS EPQS using lat/lon.',
  },
})
