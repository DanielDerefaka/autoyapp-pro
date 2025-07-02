'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, User, Calendar, MessageSquare, TrendingUp, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { useTargets, useAddTarget, useDeleteTarget, useUpdateTarget, type CreateTargetData } from '@/hooks/use-targets'
import { useXAccounts } from '@/hooks/use-x-accounts'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const targetSchema = z.object({
  targetUsername: z.string()
    .min(1, 'Username is required')
    .max(15, 'Username must be 15 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .transform(val => val.replace('@', '')), // Remove @ if user includes it
  notes: z.string().optional(),
})

type TargetFormData = z.infer<typeof targetSchema>

export default function TargetUsersPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<any>(null)

  const { data: targets = [], isLoading: targetsLoading } = useTargets()
  const { data: xAccounts = [], isLoading: xAccountsLoading } = useXAccounts()
  const addTargetMutation = useAddTarget()
  const deleteTargetMutation = useDeleteTarget()
  const updateTargetMutation = useUpdateTarget()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
  })

  const onSubmit = async (data: TargetFormData) => {
    if (xAccounts.length === 0) {
      toast.error('Please connect your X account first')
      return
    }

    const payload: CreateTargetData = {
      targetUsername: data.targetUsername,
      xAccountId: xAccounts[0].id, // Use first available X account
      notes: data.notes,
    }

    try {
      if (editingTarget) {
        await updateTargetMutation.mutateAsync({
          id: editingTarget.id,
          data: {
            targetUsername: data.targetUsername,
            notes: data.notes,
          }
        })
        toast.success('Target user updated successfully')
        setEditingTarget(null)
      } else {
        await addTargetMutation.mutateAsync(payload)
        toast.success('Target user added successfully')
      }
      
      setIsAddDialogOpen(false)
      reset()
    } catch (error) {
      toast.error(editingTarget ? 'Failed to update target user' : 'Failed to add target user')
    }
  }

  const handleEdit = (target: any) => {
    setEditingTarget(target)
    setValue('targetUsername', target.targetUsername)
    setValue('notes', target.notes || '')
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (targetId: string, username: string) => {
    if (confirm(`Are you sure you want to remove @${username} from your targets?`)) {
      try {
        await deleteTargetMutation.mutateAsync(targetId)
        toast.success('Target user removed successfully')
      } catch (error) {
        toast.error('Failed to remove target user')
      }
    }
  }

  const closeDialog = () => {
    setIsAddDialogOpen(false)
    setEditingTarget(null)
    reset()
  }

  if (targetsLoading || xAccountsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-gray-100">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-3"></div>
                  <div className="h-6 bg-gray-100 rounded w-1/2 mb-3"></div>
                  <div className="h-4 bg-gray-100 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-gray-500 text-sm">
            {targets.length} target user{targets.length !== 1 ? 's' : ''} • {targets.filter(t => t.isActive).length} active
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Target User
            </Button>
          </DialogTrigger>
          <DialogContent className="border-gray-100">
            <DialogHeader>
              <DialogTitle className="text-black">
                {editingTarget ? 'Edit Target User' : 'Add Target User'}
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                {editingTarget 
                  ? 'Update the target user details below.'
                  : 'Add a new X user to monitor for engagement opportunities.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="targetUsername" className="text-black">X Username</Label>
                <Input
                  id="targetUsername"
                  placeholder="e.g. elonmusk"
                  className="border-gray-200 focus:border-black"
                  {...register('targetUsername')}
                />
                {errors.targetUsername && (
                  <p className="text-red-500 text-sm mt-1">{errors.targetUsername.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="notes" className="text-black">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Why are you targeting this user? What type of content do they post?"
                  className="border-gray-200 focus:border-black"
                  {...register('notes')}
                />
                {errors.notes && (
                  <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={closeDialog} className="border-gray-200 text-black hover:bg-gray-50">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addTargetMutation.isPending || updateTargetMutation.isPending}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  {editingTarget ? 'Update' : 'Add'} Target
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {targets.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-black mb-2">No target users yet</h3>
            <p className="text-gray-500 mb-6">
              Add your first target user to start monitoring their posts for engagement opportunities.
            </p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-black text-white hover:bg-gray-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Target User
                </Button>
              </DialogTrigger>
              {/* Dialog content is the same as above */}
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {targets.map((target) => (
            <Card key={target.id} className="border-gray-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-black text-lg">@{target.targetUsername}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${target.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-xs text-gray-500">
                          {target.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-gray-100">
                      <DropdownMenuItem onClick={() => handleEdit(target)} className="text-black hover:bg-gray-50">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(target.id, target.targetUsername)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {target.notes && (
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{target.notes}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center text-gray-500 mb-1">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      <span>Tweets</span>
                    </div>
                    <p className="font-medium text-black">{target._count.tweets}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center text-gray-500 mb-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span>Engagement</span>
                    </div>
                    <p className="font-medium text-black">{target.engagementScore.toFixed(1)}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>Added {new Date(target.createdAt).toLocaleDateString()}</span>
                    </div>
                    {target.lastScraped && (
                      <span>Last check: {new Date(target.lastScraped).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}