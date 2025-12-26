import { Link } from 'react-router-dom';
import { Layers, Clock, Database, PlusCircle } from 'lucide-react';
import { Header, MobileNav } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useKnowledgeStats } from '@/hooks/useKnowledge';

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useKnowledgeStats();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.email}
          </p>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Link to="/pool">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pool</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{stats?.pool_count ?? 0}</span>
                    {(stats?.pool_count ?? 0) > 0 && (
                      <Badge className="bg-primary text-primary-foreground">
                        {stats?.pool_count} to review
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Items awaiting review
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats?.pending_count ?? 0}</span>
                  {(stats?.pending_count ?? 0) > 0 && (
                    <Badge variant="secondary">
                      {stats?.pending_count} processing
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Items being processed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Knowledge Base</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.knowledge_count ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total items stored
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="flex-1 sm:flex-none">
              <Link to="/capture">
                <PlusCircle className="h-5 w-5 mr-2" />
                Capture Content
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1 sm:flex-none">
              <Link to="/pool">
                <Layers className="h-5 w-5 mr-2" />
                Review Pool
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
