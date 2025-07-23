'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface ReplyDump {
  id: string;
  content: string;
  tags: string[];
  tone: string;
  isActive: boolean;
  usageCount: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

export function ReplyDumpList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTone, setSelectedTone] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDump, setEditingDump] = useState<ReplyDump | null>(null);

  const queryClient = useQueryClient();

  // Fetch reply dumps
  const { data: replyDumps = [], isLoading } = useQuery({
    queryKey: ['reply-dumps'],
    queryFn: async () => {
      const response = await fetch('/api/reply-dumps');
      if (!response.ok) throw new Error('Failed to fetch reply dumps');
      return response.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/reply-dumps/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete reply dump');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-dumps'] });
      toast.success('Reply dump deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete reply dump');
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/reply-dumps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Failed to update reply dump');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-dumps'] });
    },
    onError: () => {
      toast.error('Failed to update reply dump');
    },
  });

  // Filter dumps
  const filteredDumps = replyDumps.filter((dump: ReplyDump) => {
    const matchesSearch = searchTerm === '' || 
      dump.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dump.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTone = selectedTone === 'all' || dump.tone === selectedTone;
    
    return matchesSearch && matchesTone;
  });

  const tones = ['professional', 'casual', 'witty', 'supportive', 'neutral'];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reply Dump</h2>
          <p className="text-gray-600">Manage your reply templates and AI will match them to relevant tweets</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Reply
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Reply</DialogTitle>
            </DialogHeader>
            <ReplyDumpForm
              onClose={() => setIsCreateOpen(false)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['reply-dumps'] });
                setIsCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search replies and tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedTone} onValueChange={setSelectedTone}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by tone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tones</SelectItem>
            {tones.map(tone => (
              <SelectItem key={tone} value={tone}>
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reply Dumps List */}
      <div className="grid gap-4">
        {filteredDumps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reply dumps found</h3>
              <p className="text-gray-600 text-center mb-4">
                {searchTerm || selectedTone !== 'all' 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Start by adding your first reply template. AI will match them to relevant tweets automatically.'
                }
              </p>
              {!searchTerm && selectedTone === 'all' && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Reply
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDumps.map((dump: ReplyDump) => (
            <Card key={dump.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Badge variant={dump.isActive ? 'default' : 'secondary'}>
                      {dump.tone.charAt(0).toUpperCase() + dump.tone.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Used {dump.usageCount} times
                    </span>
                    {dump.successRate > 0 && (
                      <span className="text-sm text-green-600">
                        {(dump.successRate * 100).toFixed(1)}% success
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={dump.isActive}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: dump.id, isActive: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDump(dump)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(dump.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 leading-relaxed">{dump.content}</p>
                {dump.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dump.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingDump} onOpenChange={() => setEditingDump(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Reply</DialogTitle>
          </DialogHeader>
          {editingDump && (
            <ReplyDumpForm
              dump={editingDump}
              onClose={() => setEditingDump(null)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['reply-dumps'] });
                setEditingDump(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Form component for creating/editing reply dumps
function ReplyDumpForm({ dump, onClose, onSuccess }: {
  dump?: ReplyDump;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [content, setContent] = useState(dump?.content || '');
  const [tags, setTags] = useState<string[]>(dump?.tags || []);
  const [tone, setTone] = useState(dump?.tone || 'neutral');
  const [tagInput, setTagInput] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = dump ? `/api/reply-dumps/${dump.id}` : '/api/reply-dumps';
      const method = dump ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to save reply dump');
      return response.json();
    },
    onSuccess: () => {
      toast.success(dump ? 'Reply updated successfully' : 'Reply created successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to save reply dump');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    mutation.mutate({
      content: content.trim(),
      tags,
      tone,
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="content">Reply Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your reply template..."
          className="min-h-32"
          maxLength={1000}
        />
        <div className="text-sm text-gray-500 mt-1">
          {content.length}/1000 characters
        </div>
      </div>

      <div>
        <Label htmlFor="tone">Tone</Label>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['professional', 'casual', 'witty', 'supportive', 'neutral'].map(t => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="tags">Tags/Keywords</Label>
        <div className="flex gap-2 mb-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tags (e.g., crypto, defi, motivation)"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" onClick={addTag} variant="outline">
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Tags help AI match this reply to relevant tweets
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!content.trim() || mutation.isPending}>
          {mutation.isPending ? 'Saving...' : (dump ? 'Update' : 'Create')}
        </Button>
      </div>
    </form>
  );
}