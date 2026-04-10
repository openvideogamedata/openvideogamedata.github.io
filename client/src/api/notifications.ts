import { api } from './client'

export interface NotificationDto {
  id: number
  message: string
  read: boolean
  dateAdded: string
}

export function getNotifications(markAsRead = false): Promise<NotificationDto[]> {
  return api.get<NotificationDto[]>(`/api/notifications?markAsRead=${markAsRead}`)
}
