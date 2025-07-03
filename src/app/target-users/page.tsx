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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Target Users</h2>
          <p className="text-muted-foreground text-sm">
            {targets.length} target user{targets.length !== 1 ? 's' : ''} • {targets.filter(t => t.isActive).length} active
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg hover:scale-105 transition-all duration-200">
              <Plus className="h-4 w-4" />
              Add Target User
            </Button>
          </DialogTrigger>
          <DialogContent className="border-border glass">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingTarget ? 'Edit Target User' : 'Add Target User'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editingTarget 
                  ? 'Update the target user details below.'
                  : 'Add a new X user to monitor for engagement opportunities.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="targetUsername" className="text-foreground font-medium">X Username</Label>
                <Input
                  id="targetUsername"
                  placeholder="e.g. elonmusk"
                  className="focus-ring"
                  {...register('targetUsername')}
                />
                {errors.targetUsername && (
                  <p className="text-destructive text-sm">{errors.targetUsername.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground font-medium">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Why are you targeting this user? What type of content do they post?"
                  className="focus-ring min-h-[100px]"
                  {...register('notes')}
                />
                {errors.notes && (
                  <p className="text-destructive text-sm">{errors.notes.message}</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addTargetMutation.isPending || updateTargetMutation.isPending}
                  className="shadow-lg"
                >
                  {editingTarget ? 'Update' : 'Add'} Target
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {targets.length === 0 ? (
        <Card className="border-border bg-card glass">
          <CardContent className="text-center py-16">
            <div className="p-4 bg-muted/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">No target users yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Add your first target user to start monitoring their posts for engagement opportunities.
            </p>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg hover:scale-105 transition-all duration-200">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Target User
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {targets.map((target) => (
            <Card key={target.id} className="border-border bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-chart-2/20 rounded-xl flex items-center justify-center ring-2 ring-border">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground text-lg">@{target.targetUsername}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${target.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`}></div>
                        <span className="text-xs text-muted-foreground">
                          {target.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-border glass">
                      <DropdownMenuItem onClick={() => handleEdit(target)} className="focus-ring">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(target.id, target.targetUsername)}
                        className="text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                {target.notes && (
                  <p className="text-muted-foreground text-sm line-clamp-2 bg-muted/30 p-3 rounded-lg">{target.notes}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-chart-1/10">
                    <div className="flex items-center text-muted-foreground mb-2">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      <span className="text-xs">Tweets</span>
                    </div>
                    <p className="font-semibold text-foreground text-lg">{target._count?.tweets || 0}</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-chart-2/10">
                    <div className="flex items-center text-muted-foreground mb-2">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      <span className="text-xs">Score</span>
                    </div>
                    <p className="font-semibold text-foreground text-lg">{target.engagementScore?.toFixed(1) || '0.0'}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>Added {new Date(target.createdAt).toLocaleDateString()}</span>
                    </div>
                    {target.lastScraped && (
                      <span>Checked {new Date(target.lastScraped).toLocaleDateString()}</span>
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