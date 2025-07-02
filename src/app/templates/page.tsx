'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, MoreHorizontal, Edit, Trash2, Copy, BarChart3 } from 'lucide-react'
import { useTemplates, useCreateTemplate, type CreateTemplateData } from '@/hooks/use-templates'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  templateContent: z.string().min(10, 'Template content must be at least 10 characters').max(500, 'Template content must be 500 characters or less'),
  category: z.string().optional(),
})

type TemplateFormData = z.infer<typeof templateSchema>

const defaultCategories = ['Professional', 'Casual', 'Technical', 'Support', 'Marketing', 'Social']

export default function TemplatesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const { data: templatesData, isLoading } = useTemplates(
    selectedCategory === 'all' ? {} : { category: selectedCategory }
  )
  const createTemplate = useCreateTemplate()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
  })

  const templateContent = watch('templateContent', '')

  const onSubmit = async (data: TemplateFormData) => {
    try {
      await createTemplate.mutateAsync(data)
      toast.success('Template created successfully')
      setIsCreateDialogOpen(false)
      reset()
    } catch (error) {
      toast.error('Failed to create template')
    }
  }

  const handleCopyTemplate = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Template copied to clipboard')
  }

  const templates = templatesData?.templates || []
  const categories = templatesData?.categories || defaultCategories

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-gray-100">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-3"></div>
                  <div className="h-6 bg-gray-100 rounded w-1/2 mb-3"></div>
                  <div className="h-16 bg-gray-100 rounded w-full mb-3"></div>
                  <div className="h-4 bg-gray-100 rounded w-2/3"></div>
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
            {templates.length} template{templates.length !== 1 ? 's' : ''} • {templates.filter(t => t.isActive).length} active
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40 border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-black text-white hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="border-gray-100 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-black">Create Reply Template</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Create a new template for AI-generated replies to use in your engagement automation.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-black">Template Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Professional Support"
                      className="border-gray-200 focus:border-black"
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="category" className="text-black">Category</Label>
                    <Select onValueChange={(value) => setValue('category', value)}>
                      <SelectTrigger className="border-gray-200">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {defaultCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="templateContent" className="text-black">Template Content</Label>
                  <Textarea
                    id="templateContent"
                    placeholder="Write your template content here. Use variables like {username}, {content}, {topic} for dynamic content..."
                    className="border-gray-200 focus:border-black min-h-32"
                    {...register('templateContent')}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {errors.templateContent && (
                      <p className="text-red-500 text-sm">{errors.templateContent.message}</p>
                    )}
                    <p className="text-xs text-gray-500 ml-auto">
                      {templateContent.length}/500 characters
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      reset()
                    }}
                    className="border-gray-200 text-black hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTemplate.isPending}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    Create Template
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="border-gray-100">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-black mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first reply template to start generating consistent, high-quality responses.
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-black text-white hover:bg-gray-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="border-gray-100 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <CardTitle className="text-black text-lg">{template.name}</CardTitle>
                        <div className={`w-2 h-2 rounded-full ${template.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      {template.category && (
                        <Badge variant="outline" className="text-xs text-gray-600 border-gray-200">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-gray-100">
                        <DropdownMenuItem 
                          onClick={() => handleCopyTemplate(template.templateContent)}
                          className="text-black hover:bg-gray-50"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Content
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-black hover:bg-gray-50">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="mb-4">
                    <p className="text-gray-500 text-sm line-clamp-3">
                      {template.templateContent}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center text-gray-500 mb-1">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        <span>Success Rate</span>
                      </div>
                      <p className="font-medium text-black">{template.successRate.toFixed(1)}%</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center text-gray-500 mb-1">
                        <FileText className="h-3 w-3 mr-1" />
                        <span>Usage Count</span>
                      </div>
                      <p className="font-medium text-black">{template.usageCount}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Created {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Template Performance Summary */}
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-black">Template Performance</CardTitle>
              <CardDescription className="text-gray-500">
                Overview of how your templates are performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-black mb-1">
                    {templates.length > 0 ? 
                      (templates.reduce((acc, t) => acc + t.successRate, 0) / templates.length).toFixed(1) : 0}%
                  </div>
                  <p className="text-sm text-gray-500">Average Success Rate</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-black mb-1">
                    {templates.reduce((acc, t) => acc + t.usageCount, 0)}
                  </div>
                  <p className="text-sm text-gray-500">Total Usage</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-black mb-1">
                    {templates.filter(t => t.isActive).length}
                  </div>
                  <p className="text-sm text-gray-500">Active Templates</p>
                </div>
              </div>
              
              {templates.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-black mb-3">Top Performing Templates</h4>
                  <div className="space-y-2">
                    {templates
                      .sort((a, b) => b.successRate - a.successRate)
                      .slice(0, 3)
                      .map((template, index) => (
                        <div key={template.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="font-medium text-black">{template.name}</span>
                          </div>
                          <span className="text-gray-500">{template.successRate.toFixed(1)}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}