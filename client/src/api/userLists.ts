import { api } from './client'
import type { GameListCollectionResponse } from './gameLists'

export function getListsByUser(
  nickname: string,
  page = 1,
  pageSize = 9,
): Promise<GameListCollectionResponse> {
  return api.get<GameListCollectionResponse>(
    `/api/users/${encodeURIComponent(nickname)}/lists?page=${page}&pageSize=${pageSize}`,
  )
}
