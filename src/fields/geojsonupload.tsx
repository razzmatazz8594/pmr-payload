'use client'

import { UploadField, useField } from '@payloadcms/ui'

// Re-export a wrapper that injects the disableCreateNew prop
export function GeoJSONUploadField(props: any) {
  return <UploadField {...props} disableCreateNew={true} />
}
