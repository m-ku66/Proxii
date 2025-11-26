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
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export const Chats = () => {
    const { conversations, setActiveConversation, renameConversation, deleteConversation } = useChatStore();
    const { setActiveScreen } = useUIStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const chatsPerPage = 10;

    // Rename dialog state
    const [renameDialog, setRenameDialog] = useState<{
        isOpen: boolean;
        conversationId: string;
        currentTitle: string;
    }>({
        isOpen: false,
        conversationId: '',
        currentTitle: '',
    });

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
                                <div className="flex items-center justify-between gap-4 w-full">
                                    <div className="flex-1 min-w-0">
                                        <ItemTitle className="line-clamp-1 mb-1">
                                            {conv.title}
                                        </ItemTitle>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>Created {formatDate(conv.createdAt)}</span>
                                            <span>•</span>
                                            <span>Last message {formatTime(conv.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            asChild
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:bg-accent-foreground/10"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRenameDialog({
                                                        isOpen: true,
                                                        conversationId: conv.id,
                                                        currentTitle: conv.title
                                                    });
                                                }}
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Are you sure you want to delete this chat?')) {
                                                        deleteConversation(conv.id);
                                                        toast.success('Chat deleted');
                                                    }
                                                }}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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

            {/* Rename Dialog */}
            {renameDialog.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 w-96">
                        <h3 className="font-semibold mb-4">Rename Chat</h3>
                        <Input
                            type="text"
                            value={renameDialog.currentTitle}
                            onChange={(e) => setRenameDialog(prev => ({
                                ...prev,
                                currentTitle: e.target.value
                            }))}
                            placeholder="Chat title..."
                            autoFocus
                            className="mb-4"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setRenameDialog({
                                    isOpen: false,
                                    conversationId: '',
                                    currentTitle: ''
                                })}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (renameDialog.currentTitle.trim()) {
                                        renameConversation(renameDialog.conversationId, renameDialog.currentTitle);
                                        setRenameDialog({
                                            isOpen: false,
                                            conversationId: '',
                                            currentTitle: ''
                                        });
                                        toast.success('Chat renamed!');
                                    }
                                }}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};