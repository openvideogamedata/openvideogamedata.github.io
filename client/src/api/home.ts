import { api } from './client'
import type { HomeList, HomeActivity, Pager } from '../types'
import { getListsFromCache, getTagsFromCache, warmUpApi } from './localCache'

export interface GetListsParams {
  page?: number
  pageSize?: number
  tags?: string
  search?: string
}

export function getPinnedLists(): Promise<HomeList[]> {
  return api.get<HomeList[]>('/api/home/pinned-lists')
}

export async function getTags(): Promise<string[]> {
  const cached = await getTagsFromCache()
  if (cached) return cached
  return api.get<string[]>('/api/home/tags')
}

export async function getLists(params: GetListsParams = {}): Promise<{ lists: HomeList[]; pager: Pager }> {
  const tags = params.tags ? params.tags.split(',').map(t => t.trim()) : ['all']
  const cached = await getListsFromCache({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 6,
    tags,
    search: params.search ?? '',
  })
  if (cached) {
    warmUpApi(import.meta.env.VITE_API_BASE_URL as string)
    return cached
  }

  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  qs.set('pageSize', String(params.pageSize ?? 6))
  if (params.tags) qs.set('tags', params.tags)
  if (params.search) qs.set('search', params.search)
  return api.get<{ lists: HomeList[]; pager: Pager }>(`/api/home/lists?${qs}`)
}

export function getUserActivity(): Promise<HomeActivity[]> {
  return api.get<HomeActivity[]>('/api/home/user-activity')
}
