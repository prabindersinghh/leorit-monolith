import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Search, Filter, Activity, User, ShoppingCart, CreditCard, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SystemLog {
  id: string;
  created_at: string;
  actor_role: string;
  actor_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any> | null;
}

const SystemLogs = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");

  useEffect(() => {
    fetchLogs();

    // Real-time subscription
    const channel = supabase
      .channel('system-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_logs',
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      // Cast metadata to expected type
      const typedData = (data || []).map(log => ({
        ...log,
        metadata: (log.metadata as Record<string, any>) || null,
      }));
      setLogs(typedData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      buyer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      manufacturer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      system: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return <Badge className={colors[role] || colors.system}>{role}</Badge>;
  };

  const getEntityIcon = (entityType: string) => {
    const icons: Record<string, React.ReactNode> = {
      order: <ShoppingCart className="h-4 w-4" />,
      payment: <CreditCard className="h-4 w-4" />,
      qc: <CheckCircle className="h-4 w-4" />,
      user: <User className="h-4 w-4" />,
      dispute: <AlertTriangle className="h-4 w-4" />,
      auth: <User className="h-4 w-4" />,
      system: <Activity className="h-4 w-4" />,
    };
    return icons[entityType] || icons.system;
  };

  const getEventBadgeColor = (eventType: string) => {
    if (eventType.includes('error') || eventType.includes('rejected') || eventType.includes('blocked')) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
    if (eventType.includes('approved') || eventType.includes('completed') || eventType.includes('success')) {
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    }
    if (eventType.includes('pending') || eventType.includes('requested')) {
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = filterRole === 'all' || log.actor_role === filterRole;
    const matchesEntity = filterEntity === 'all' || log.entity_type === filterEntity;
    
    return matchesSearch && matchesRole && matchesEntity;
  });

  // Stats
  const stats = {
    total: logs.length,
    today: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    errors: logs.filter(l => l.event_type.includes('error') || l.event_type.includes('blocked')).length,
    orders: logs.filter(l => l.entity_type === 'order').length,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />
      
      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">System Logs</h1>
              <p className="text-muted-foreground">Monitor all platform activity</p>
            </div>
            <Button onClick={fetchLogs} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Logs</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold">{stats.today}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                    <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Events</p>
                    <p className="text-2xl font-bold">{stats.orders}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events, entities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="qc">QC</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="dispute">Dispute</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Event Log ({filteredLogs.length} entries)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading logs...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No logs found</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Timestamp</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.slice(0, 100).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            {getRoleBadge(log.actor_role)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getEventBadgeColor(log.event_type)}>
                              {log.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEntityIcon(log.entity_type)}
                              <span className="text-sm">{log.entity_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.entity_id ? log.entity_id.slice(0, 8) + '...' : '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                            {log.metadata && Object.keys(log.metadata).length > 0 
                              ? JSON.stringify(log.metadata).slice(0, 50) + '...'
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SystemLogs;
