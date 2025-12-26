import { Header } from '@/components/common';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function Capture() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Capture</h1>
          <p className="text-muted-foreground mt-2">
            Quickly capture new knowledge items
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <PlusCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Capture Form</CardTitle>
            <CardDescription>
              This page will contain the quick capture form for adding URLs and notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon: URL input, quick notes, and fast-track options.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
