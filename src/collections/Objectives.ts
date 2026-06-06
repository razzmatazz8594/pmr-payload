import type { CollectionConfig } from 'payload'
import { latitudeField } from '@/fields/latitude'
import { longitudeField } from '@/fields/longitude'

export const Objectives: CollectionConfig = {
  slug: 'objectives',
  access: {
    read: () => true,
  },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        const lat = data.latitude
        const lon = data.longitude

        if (lat != null && lon != null) {
          try {
            // units retunred in feet
            // wkid 4326 = WGS 84, the standard GPS coordinate system

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
      },
    ],
  },
  fields: [
    {
      name: 'objective',
      label: 'Objective',
      type: 'text',
      required: true,
    },
    latitudeField(),
    longitudeField(),
    {
      name: 'elevation',
      label: 'Elevation (ft)',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Auto-populated from USGS EPQS using lat/lon.',
      },
    },
    {
      name: 'prominence',
      label: 'Prominence (ft)',
      type: 'number',
      min: 0,
      max: 29029,
    },
    {
      name: 'isolation',
      label: 'Isolation (mi)',
      type: 'number',
      min: 0,
      max: 24901,
    },
  ],
}
