import { Header } from '@/components/common';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, PlusCircle, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Your knowledge management hub
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link to="/capture">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Capture</CardTitle>
                <CardDescription>
                  Quickly capture new knowledge items
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/pool">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Pool</CardTitle>
                <CardDescription>
                  Curate and manage your knowledge pool
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Card className="h-full">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-2">
                <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-lg">Stats</CardTitle>
              <CardDescription>
                Coming soon: Analytics and insights
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
