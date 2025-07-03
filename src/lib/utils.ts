import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format relative time for display
export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

// Format next run time
export function formatNextRun(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Starting soon'
  if (diffMins < 60) return `in ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  return `in ${diffHours}h ${diffMins % 60}m`
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Validate tweet content
export function validateTweetContent(content: string, maxLength: number = 280) {
  return {
    isValid: content.trim().length > 0 && content.length <= maxLength,
    characterCount: content.length,
    isEmpty: content.trim().length === 0,
    tooLong: content.length > maxLength
  }
}
