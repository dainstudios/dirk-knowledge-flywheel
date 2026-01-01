import { Header, LoadingState } from '@/components/common';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageSquare, Quote, BarChart3 } from 'lucide-react';
import { SearchTab, AskAITab, FindQuoteTab, ImagesTab } from '@/components/knowledge';

export default function Knowledge() {
  const { items, isLoading, filterOptions } = useKnowledgeBase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 pb-20 md:pb-8">
          <LoadingState message="Loading knowledge base..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="heading-section text-foreground">Knowledge Base</h1>
            <Badge variant="secondary">
              {items.length} items
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ask" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 p-1 bg-grey-100 rounded-xl">
            <TabsTrigger value="ask" className="gap-2">
              <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              Ask
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" strokeWidth={1.5} />
              Search
            </TabsTrigger>
            <TabsTrigger value="quote" className="gap-2">
              <Quote className="h-4 w-4" strokeWidth={1.5} />
              Find Quote
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-1 text-muted-foreground border-muted-foreground/30">
                Alpha
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <BarChart3 className="h-4 w-4" strokeWidth={1.5} />
              Find Graphs
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-1 text-muted-foreground border-muted-foreground/30">
                Alpha
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ask">
            <AskAITab />
          </TabsContent>

          <TabsContent value="search">
            <SearchTab items={items} filterOptions={filterOptions} />
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