'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Bug, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Globe, 
  Search,
  Filter,
  Trash2,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useErrorLogs, useErrorLog, useResolveError, useDeleteError } from '@/hooks/use-error-logs';
import { formatDistanceToNow } from 'date-fns';

export default function ErrorLogsPage() {
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    errorType: 'all',
    severity: 'all',
    resolved: 'all',
    timeRange: 'day',
    search: '',
  });

  const { data: errorLogsData, isLoading, refetch } = useErrorLogs(filters);
  const { data: selectedErrorData } = useErrorLog(selectedError || '');
  const resolveErrorMutation = useResolveError();
  const deleteErrorMutation = useDeleteError();

  const errorLogs = errorLogsData?.data || [];
  const stats = errorLogsData?.stats || {};

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <XCircle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <Bug className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getErrorTypeIcon = (errorType: string) => {
    switch (errorType) {
      case 'API_ERROR': return <Globe className="h-4 w-4" />;
      case 'CLIENT_ERROR': return <Bug className="h-4 w-4" />;
      case 'AUTH_ERROR': return <User className="h-4 w-4" />;
      case 'SYSTEM_ERROR': return <Zap className="h-4 w-4" />;
      case 'DATABASE_ERROR': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const handleResolveError = async (id: string, resolved: boolean) => {
    await resolveErrorMutation.mutateAsync({ id, resolved });
    if (selectedError === id) {
      setSelectedError(null);
    }
  };

  const handleDeleteError = async (id: string) => {
    if (confirm('Are you sure you want to delete this error log?')) {
      await deleteErrorMutation.mutateAsync(id);
      if (selectedError === id) {
        setSelectedError(null);
      }
    }
  };

  const filteredErrors = errorLogs.filter(error => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return error.errorMessage.toLowerCase().includes(searchLower) ||
             error.endpoint?.toLowerCase().includes(searchLower) ||
             error.userEmail?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Error Logs</h2>
          <p className="text-muted-foreground">Monitor and debug application errors</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last {filters.timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.unresolved || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.bySeverity?.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.resolved || 0} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search errors..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <Select 
              value={filters.errorType} 
              onValueChange={(value) => setFilters({ ...filters, errorType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Error Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="API_ERROR">API Error</SelectItem>
                <SelectItem value="CLIENT_ERROR">Client Error</SelectItem>
                <SelectItem value="AUTH_ERROR">Auth Error</SelectItem>
                <SelectItem value="SYSTEM_ERROR">System Error</SelectItem>
                <SelectItem value="DATABASE_ERROR">Database Error</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.severity} 
              onValueChange={(value) => setFilters({ ...filters, severity: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.resolved} 
              onValueChange={(value) => setFilters({ ...filters, resolved: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="false">Unresolved</SelectItem>
                <SelectItem value="true">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.timeRange} 
              onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Last Hour</SelectItem>
                <SelectItem value="day">Last Day</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ errorType: 'all', severity: 'all', resolved: 'all', timeRange: 'day', search: '' })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Error Logs ({filteredErrors.length})</CardTitle>
          <CardDescription>
            Click on an error to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredErrors.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No errors found</h3>
              <p className="text-muted-foreground">
                {Object.values(filters).some(v => v && v !== 'all' && v !== 'day') 
                  ? 'Try adjusting your filters to see more results'
                  : 'Great! No errors in the selected time range'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredErrors.map((error) => (
                <div
                  key={error.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
                    error.resolved ? 'opacity-60' : ''
                  }`}
                  onClick={() => setSelectedError(error.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        {getSeverityIcon(error.severity)}
                        {getErrorTypeIcon(error.errorType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={getSeverityColor(error.severity) as any}>
                            {error.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {error.errorType.replace('_', ' ')}
                          </Badge>
                          {error.resolved && (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        
                        <h4 className="font-medium text-foreground mb-1 truncate">
                          {error.errorMessage}
                        </h4>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          {error.endpoint && (
                            <div>Endpoint: {error.method} {error.endpoint}</div>
                          )}
                          {error.userEmail && (
                            <div>User: {error.userEmail}</div>
                          )}
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true })}
                            </span>
                            {error.ipAddress && (
                              <span>IP: {error.ipAddress}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      {error.resolved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveError(error.id, false)}
                        >
                          Mark Unresolved
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleResolveError(error.id, true)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteError(error.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Modal */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected error
            </DialogDescription>
          </DialogHeader>
          
          {selectedErrorData && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stack">Stack Trace</TabsTrigger>
                <TabsTrigger value="context">Context</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Error Type</label>
                    <p className="text-sm text-muted-foreground">{selectedErrorData.errorType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Severity</label>
                    <p className="text-sm text-muted-foreground">{selectedErrorData.severity}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Timestamp</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedErrorData.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedErrorData.resolved ? 'Resolved' : 'Unresolved'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Error Message</label>
                  <Alert className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {selectedErrorData.errorMessage}
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
              
              <TabsContent value="stack">
                {selectedErrorData.errorStack ? (
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                      {selectedErrorData.errorStack}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No stack trace available</p>
                )}
              </TabsContent>
              
              <TabsContent value="context" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedErrorData.endpoint && (
                    <div>
                      <label className="text-sm font-medium">Endpoint</label>
                      <p className="text-sm text-muted-foreground">{selectedErrorData.endpoint}</p>
                    </div>
                  )}
                  {selectedErrorData.method && (
                    <div>
                      <label className="text-sm font-medium">Method</label>
                      <p className="text-sm text-muted-foreground">{selectedErrorData.method}</p>
                    </div>
                  )}
                  {selectedErrorData.userEmail && (
                    <div>
                      <label className="text-sm font-medium">User</label>
                      <p className="text-sm text-muted-foreground">{selectedErrorData.userEmail}</p>
                    </div>
                  )}
                  {selectedErrorData.ipAddress && (
                    <div>
                      <label className="text-sm font-medium">IP Address</label>
                      <p className="text-sm text-muted-foreground">{selectedErrorData.ipAddress}</p>
                    </div>
                  )}
                  {selectedErrorData.responseStatus && (
                    <div>
                      <label className="text-sm font-medium">Response Status</label>
                      <p className="text-sm text-muted-foreground">{selectedErrorData.responseStatus}</p>
                    </div>
                  )}
                </div>
                
                {selectedErrorData.requestBody && (
                  <div>
                    <label className="text-sm font-medium">Request Body</label>
                    <div className="bg-muted p-4 rounded-lg mt-2">
                      <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(JSON.parse(selectedErrorData.requestBody), null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {selectedErrorData.userAgent && (
                  <div>
                    <label className="text-sm font-medium">User Agent</label>
                    <p className="text-sm text-muted-foreground break-all">{selectedErrorData.userAgent}</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="metadata">
                {selectedErrorData.metadata && Object.keys(selectedErrorData.metadata).length > 0 ? (
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedErrorData.metadata, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No metadata available</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}