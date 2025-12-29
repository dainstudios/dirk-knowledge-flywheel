import { Link } from 'react-router-dom';
import { Layers, Clock, Database, PlusCircle, ArrowRight } from 'lucide-react';
import { Header, MobileNav } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureIcon } from '@/components/ui/feature-icon';
import { useAuth } from '@/hooks/useAuth';
import { useKnowledgeStats } from '@/hooks/useKnowledge';

function StatsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
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
      
      <main className="container py-8 md:py-12">
        {/* Welcome Section */}
        <div className="mb-10 md:mb-14">
          <h1 className="heading-section text-foreground mb-2">
            Welcome Back
          </h1>
          <p className="text-muted-foreground text-lg">
            {user?.email}
          </p>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid gap-6 md:grid-cols-3 mb-10 md:mb-14">
            <Link to="/pool" className="group">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <FeatureIcon icon={Layers} size="lg" />
                    <div className="flex-1">
                      <CardTitle className="heading-card text-muted-foreground group-hover:text-primary transition-colors">
                        Pool
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-3xl font-bold text-foreground">{stats?.pool_count ?? 0}</span>
                        {(stats?.pool_count ?? 0) > 0 && (
                          <Badge className="bg-primary text-primary-foreground">
                            to review
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Items awaiting review
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <FeatureIcon icon={Clock} size="lg" />
                  <div className="flex-1">
                    <CardTitle className="heading-card text-muted-foreground">
                      Pending
                    </CardTitle>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-3xl font-bold text-foreground">{stats?.pending_count ?? 0}</span>
                      {(stats?.pending_count ?? 0) > 0 && (
                        <Badge variant="secondary">
                          processing
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Items being processed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <FeatureIcon icon={Database} size="lg" />
                  <div className="flex-1">
                    <CardTitle className="heading-card text-muted-foreground">
                      Knowledge Base
                    </CardTitle>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-foreground">{stats?.knowledge_count ?? 0}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Total items stored
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="heading-card text-foreground">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="pill" size="lg">
              <Link to="/capture" className="flex items-center">
                <PlusCircle className="h-5 w-5 mr-2" />
                Capture Content
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="accent" size="lg">
              <Link to="/pool" className="flex items-center">
                <Layers className="h-5 w-5 mr-2" />
                Review Pool
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
