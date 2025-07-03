'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  Filter,
  Search
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface ScheduledContent {
  id: string
  type: 'tweet' | 'thread'
  content: string
  previewText: string
  scheduledFor: string
  status: 'scheduled' | 'published' | 'failed'
  tweetCount: number
  images: string[]
  createdAt: string
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  content: ScheduledContent[]
}

export default function CalendarPage() {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'published' | 'failed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedItem, setDraggedItem] = useState<ScheduledContent | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingContent, setEditingContent] = useState<ScheduledContent | null>(null)
  const dragOverRef = useRef<HTMLDivElement>(null)

  // Fetch scheduled content from API
  useEffect(() => {
    fetchScheduledContent()
  }, [])

  const fetchScheduledContent = async () => {
    try {
      const response = await fetch('/api/scheduled-content')
      if (response.ok) {
        const data = await response.json()
        setScheduledContent(data)
      } else {
        console.error('Failed to fetch scheduled content')
      }
    } catch (error) {
      console.error('Error fetching scheduled content:', error)
    }
  }

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    const days: CalendarDay[] = []

    // Add previous month's days
    const prevMonth = new Date(year, month - 1, 0)
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i)
      days.push({
        date,
        isCurrentMonth: false,
        content: getContentForDate(date)
      })
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({
        date,
        isCurrentMonth: true,
        content: getContentForDate(date)
      })
    }

    // Add next month's days to fill the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        date,
        isCurrentMonth: false,
        content: getContentForDate(date)
      })
    }

    return days
  }

  const getContentForDate = (date: Date): ScheduledContent[] => {
    const dateStr = date.toDateString()
    return scheduledContent.filter(content => {
      const contentDate = new Date(content.scheduledFor).toDateString()
      return contentDate === dateStr
    })
  }

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDragStart = (e: React.DragEvent, content: ScheduledContent) => {
    setDraggedItem(content)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    if (!draggedItem) return

    const newScheduledFor = new Date(targetDate)
    newScheduledFor.setHours(new Date(draggedItem.scheduledFor).getHours())
    newScheduledFor.setMinutes(new Date(draggedItem.scheduledFor).getMinutes())

    try {
      const response = await fetch(`/api/scheduled-content/${draggedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: draggedItem.content,
          scheduledFor: newScheduledFor.toISOString()
        })
      })

      if (response.ok) {
        setScheduledContent(prev => 
          prev.map(content => 
            content.id === draggedItem.id 
              ? { ...content, scheduledFor: newScheduledFor.toISOString() }
              : content
          )
        )
        
        toast({
          title: "Content moved",
          description: `Content has been rescheduled to ${targetDate.toLocaleDateString()}`
        })
      } else {
        throw new Error('Failed to update schedule')
      }
    } catch (error) {
      console.error('Error updating schedule:', error)
      toast({
        title: "Move failed",
        description: "Failed to reschedule content. Please try again.",
        variant: "destructive"
      })
    }

    setDraggedItem(null)
  }

  const handleEditContent = (content: ScheduledContent) => {
    setEditingContent(content)
    setShowEditDialog(true)
  }

  const handleDeleteContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/scheduled-content/${contentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete content')

      setScheduledContent(prev => prev.filter(content => content.id !== contentId))
      toast({
        title: "Content deleted",
        description: "Scheduled content has been removed"
      })
    } catch (error) {
      console.error('Error deleting content:', error)
      toast({
        title: "Delete failed",
        description: "Failed to delete content. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!editingContent) return

    try {
      const response = await fetch(`/api/scheduled-content/${editingContent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingContent)
      })

      if (!response.ok) throw new Error('Failed to update content')

      setScheduledContent(prev => 
        prev.map(content => 
          content.id === editingContent.id ? editingContent : content
        )
      )

      setShowEditDialog(false)
      setEditingContent(null)
      toast({
        title: "Content updated",
        description: "Scheduled content has been updated"
      })
    } catch (error) {
      console.error('Error updating content:', error)
      toast({
        title: "Update failed",
        description: "Failed to update content. Please try again.",
        variant: "destructive"
      })
    }
  }

  const filteredContent = scheduledContent.filter(content => {
    const matchesFilter = filterStatus === 'all' || content.status === filterStatus
    const matchesSearch = searchTerm === '' || 
      content.content.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const calendarDays = getDaysInMonth(currentDate)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'published': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-black flex items-center">
            <CalendarIcon className="h-7 w-7 mr-2" />
            Content Calendar
          </h1>
          <p className="text-gray-500">
            Manage and schedule your content across time
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch('/api/scheduler/trigger', {
                  method: 'POST'
                })
                const result = await response.json()
                if (response.ok) {
                  toast({
                    title: "Scheduler triggered",
                    description: `Processed ${result.result?.processed || 0} scheduled tweets`
                  })
                } else {
                  throw new Error(result.error)
                }
              } catch (error) {
                toast({
                  title: "Trigger failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  variant: "destructive"
                })
              }
            }}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Clock className="h-4 w-4 mr-2" />
            Process Now
          </Button>
          <Link href="/compose">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Content
            </Button>
          </Link>
        </div>
      </div>

      {/* Scheduler Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-700 font-medium">
            Tweet Scheduler Active
          </span>
          <span className="text-xs text-green-600">
            Checks for scheduled tweets every minute
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Grid className="h-4 w-4 mr-1" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1 border border-gray-200 rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="space-y-4">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousMonth}
              className="border-gray-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-black">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button
              variant="outline"
              onClick={handleNextMonth}
              className="border-gray-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] border border-gray-200 p-2 ${
                  day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day.date)}
              >
                <div className={`text-sm font-medium mb-2 ${
                  day.isCurrentMonth ? 'text-black' : 'text-gray-400'
                }`}>
                  {day.date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {day.content.map(content => (
                    <div
                      key={content.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, content)}
                      className="p-2 bg-blue-50 border border-blue-200 rounded text-xs cursor-move hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getStatusColor(content.status)}`}
                        >
                          {content.status}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditContent(content)}
                            className="h-5 w-5 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContent(content.id)}
                            className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-black truncate">{content.previewText}</div>
                      <div className="flex items-center text-gray-500 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(content.scheduledFor).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {content.type === 'thread' && (
                          <span className="ml-2 text-xs">
                            {content.tweetCount} tweets
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredContent.map(content => (
            <Card key={content.id} className="border-gray-100">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getStatusColor(content.status)}>
                        {content.status}
                      </Badge>
                      <Badge variant="outline">
                        {content.type === 'thread' ? (
                          <>{content.tweetCount} tweets</>
                        ) : (
                          'Single tweet'
                        )}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(content.scheduledFor).toLocaleDateString()} at{' '}
                        {new Date(content.scheduledFor).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-black">{content.previewText}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditContent(content)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContent(content.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Content</DialogTitle>
          </DialogHeader>
          {editingContent && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <Textarea
                  value={editingContent.content}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    content: e.target.value,
                    previewText: e.target.value.substring(0, 50) + '...'
                  })}
                  className="min-h-[120px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={new Date(editingContent.scheduledFor).toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value)
                      const currentTime = new Date(editingContent.scheduledFor)
                      newDate.setHours(currentTime.getHours())
                      newDate.setMinutes(currentTime.getMinutes())
                      setEditingContent({
                        ...editingContent,
                        scheduledFor: newDate.toISOString()
                      })
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <Input
                    type="time"
                    value={new Date(editingContent.scheduledFor).toTimeString().substring(0, 5)}
                    onChange={(e) => {
                      const newDate = new Date(editingContent.scheduledFor)
                      const [hours, minutes] = e.target.value.split(':')
                      newDate.setHours(parseInt(hours))
                      newDate.setMinutes(parseInt(minutes))
                      setEditingContent({
                        ...editingContent,
                        scheduledFor: newDate.toISOString()
                      })
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}