import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { RichTextField } from 'payload'

export const descriptionField: RichTextField = {
  name: 'description',
  type: 'richText',
  label: 'Description',
  editor: lexicalEditor(),
}
