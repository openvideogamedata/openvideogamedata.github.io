import { api } from './client'
import type { HomeResponse, HomeList, HomeActivity, Pager } from '../types'

export interface GetListsParams {
  page?: number
  pageSize?: number
  tags?: string
  search?: string
}

export function getHome(params: GetListsParams = {}): Promise<HomeResponse> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.tags) qs.set('tags', params.tags)
  if (params.search) qs.set('search', params.search)
  return api.get<HomeResponse>(`/api/home?${qs}`)
}

export function getLists(params: GetListsParams = {}): Promise<{ lists: HomeList[]; pager: Pager }> {
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
