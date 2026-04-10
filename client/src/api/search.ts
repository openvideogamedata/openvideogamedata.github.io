import { api } from './client'
import type { SearchResponse } from '../types'

export interface SearchParams {
  input?: string
  page?: number
  pageSize?: number
}

export function search(params: SearchParams): Promise<SearchResponse> {
  const qs = new URLSearchParams()
  if (params.input) qs.set('input', params.input)
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 10))
  return api.get<SearchResponse>(`/api/search?${qs}`)
}
