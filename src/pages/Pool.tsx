import { Header } from '@/components/common';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';

export default function Pool() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Pool</h1>
          <p className="text-muted-foreground mt-2">
            Curate and manage your knowledge items
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>iCurate Pool</CardTitle>
            <CardDescription>
              This page will contain the triage interface for curating knowledge items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon: Swipe-style curation, quick actions, and batch processing.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
