import { api } from './client'

export interface StaticPageDto {
  slug: string
  title: string
  content: string
}

export function getPrivacyPage(): Promise<StaticPageDto> {
  return api.get<StaticPageDto>('/api/pages/privacy')
}
