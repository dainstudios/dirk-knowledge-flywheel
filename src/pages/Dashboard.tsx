import { Link } from 'react-router-dom';
import { Layers, Clock, Database, PlusCircle, ArrowRight } from 'lucide-react';
import { Header, MobileNav } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
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
            <Skeleton className="h-14 w-14 rounded-2xl" />
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
      
      <main className="container py-10 md:py-16">
        {/* Welcome Section */}
        <div className="mb-12 md:mb-16">
          <h1 className="heading-section text-foreground mb-2">
            Welcome Back
          </h1>
          <p className="text-muted-foreground">
            {user?.email}
          </p>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid gap-6 md:grid-cols-3 mb-12 md:mb-16">
            <Link to="/pool" className="group">
              <Card variant="sage" className="h-full hover:shadow-elevated transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <FeatureIcon icon={Layers} size="lg" variant="default" />
                    <div className="flex-1">
                      <p className="heading-card text-muted-foreground mb-2">
                        Pool
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-semibold text-foreground">{stats?.pool_count ?? 0}</span>
                        {(stats?.pool_count ?? 0) > 0 && (
                          <Badge variant="primary">
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

            <Card variant="stone">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <FeatureIcon icon={Clock} size="lg" variant="default" />
                  <div className="flex-1">
                    <p className="heading-card text-muted-foreground mb-2">
                      Pending
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-semibold text-foreground">{stats?.pending_count ?? 0}</span>
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

            <Card variant="slate">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <FeatureIcon icon={Database} size="lg" variant="default" />
                  <div className="flex-1">
                    <p className="heading-card text-muted-foreground mb-2">
                      Knowledge Base
                    </p>
                    <div>
                      <span className="text-3xl font-semibold text-foreground">{stats?.knowledge_count ?? 0}</span>
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="pill" size="lg">
              <Link to="/capture" className="flex items-center">
                <PlusCircle className="h-5 w-5 mr-2" />
                Capture Content
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