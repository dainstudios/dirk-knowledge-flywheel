import { Header, LoadingState } from '@/components/common';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, MessageSquare, Quote, Image as ImageIcon } from 'lucide-react';
import { SearchTab, AskAITab, FindQuoteTab, ImagesTab } from '@/components/knowledge';

export default function Knowledge() {
  const { items, isLoading, filterOptions } = useKnowledgeBase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
          <LoadingState message="Loading knowledge base..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
            <Badge variant="secondary" className="text-sm">
              {items.length} items
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="w-full flex flex-wrap sm:inline-flex sm:w-auto">
            <TabsTrigger value="search" className="flex-1 sm:flex-none gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="ask" className="flex-1 sm:flex-none gap-2">
              <MessageSquare className="h-4 w-4" />
              Ask AI
            </TabsTrigger>
            <TabsTrigger value="quote" className="flex-1 sm:flex-none gap-2">
              <Quote className="h-4 w-4" />
              Find Quote
            </TabsTrigger>
            <TabsTrigger value="images" className="flex-1 sm:flex-none gap-2">
              <ImageIcon className="h-4 w-4" />
              Images
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <SearchTab items={items} filterOptions={filterOptions} />
          </TabsContent>

          <TabsContent value="ask">
            <AskAITab />
          </TabsContent>

          <TabsContent value="quote">
            <FindQuoteTab />
          </TabsContent>

          <TabsContent value="images">
            <ImagesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
