import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Item,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemTitle,
} from '@/components/ui/item';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';

export const Chats = () => {
    const { conversations, setActiveConversation } = useChatStore();
    const { setActiveScreen } = useUIStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const chatsPerPage = 10;

    // Filter conversations based on tab and search
    const filteredConversations = conversations.filter((conv) => {
        const matchesSearch = conv.title
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || conv.starred;
        return matchesSearch && matchesTab;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredConversations.length / chatsPerPage);
    const startIndex = (currentPage - 1) * chatsPerPage;
    const endIndex = startIndex + chatsPerPage;
    const currentChats = filteredConversations.slice(startIndex, endIndex);

    const handleChatClick = (id: string) => {
        setActiveConversation(id);
        setActiveScreen('chatRoom');
    };

    const handleNewChat = () => {
        setActiveScreen('chatRoom');
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <div className="flex h-full flex-col p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Chats</h1>
                <Button onClick={handleNewChat} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Start a new chat
                </Button>
            </div>

            {/* Search bar */}
            <Input
                type="search"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                }}
                className="mb-6"
            />

            {/* Tabs and Filter section */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
                        setActiveTab(value as 'all' | 'starred');
                        setCurrentPage(1); // Reset to first page on tab change
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="starred">Starred</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-4">
                    <Label className="text-sm text-muted-foreground">
                        {filteredConversations.length}{' '}
                        {filteredConversations.length === 1 ? 'chat' : 'chats'}
                    </Label>
                    <Button variant="ghost" size="sm">
                        Select all
                    </Button>
                </div>
            </div>

            {/* Chat list */}
            <ItemGroup className="flex-1 gap-2 overflow-auto">
                {currentChats.length > 0 ? (
                    currentChats.map((conv) => (
                        <Item
                            key={conv.id}
                            variant="outline"
                            role="listitem"
                            className="cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => handleChatClick(conv.id)}
                        >
                            <ItemContent className="w-full">
                                <div className="flex items-start justify-between gap-4 w-full">
                                    <div className="flex-1 min-w-0">
                                        <ItemTitle className="line-clamp-1 mb-1">
                                            {conv.title}
                                        </ItemTitle>
                                        <ItemDescription className="text-xs">
                                            Created {formatDate(conv.createdAt)}
                                        </ItemDescription>
                                    </div>
                                    <ItemDescription className="shrink-0 text-xs text-right">
                                        {formatTime(conv.updatedAt)}
                                    </ItemDescription>
                                </div>
                            </ItemContent>
                        </Item>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-muted-foreground mb-2">
                            {activeTab === 'starred'
                                ? 'No starred conversations'
                                : 'No conversations found'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? 'Try a different search term'
                                : activeTab === 'starred'
                                    ? 'Star conversations to see them here'
                                    : 'Start a new chat to get going!'}
                        </p>
                    </div>
                )}
            </ItemGroup>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination className="mt-6">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                className={
                                    currentPage === 1
                                        ? 'pointer-events-none opacity-50'
                                        : 'cursor-pointer'
                                }
                            />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    isActive={currentPage === page}
                                    className="cursor-pointer"
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() =>
                                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                                }
                                className={
                                    currentPage === totalPages
                                        ? 'pointer-events-none opacity-50'
                                        : 'cursor-pointer'
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
};