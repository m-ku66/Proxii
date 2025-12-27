import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Item,
    ItemContent,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MoreVertical, Edit, Trash2, Star } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export const Chats = () => {
    const { conversations, setActiveConversation, renameConversation, deleteConversation, toggleStar } = useChatStore();
    const { setActiveScreen, theme } = useUIStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

    // Filter conversations based on tab and search, then sort by most recently updated
    // IMPORTANT: Only show global conversations (exclude project conversations)
    const filteredConversations = conversations
        .filter((conv) => !conv.projectId) // Exclude conversations that belong to projects
        .filter((conv) => {
            const matchesSearch = conv.title
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
            const matchesTab = activeTab === 'all' || conv.starred;
            return matchesSearch && matchesTab;
        })
        .sort((a, b) => {
            // Sort by updatedAt descending (most recent first)
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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

    const handleSelectAll = () => {
        if (selectedIds.size === filteredConversations.length) {
            // Deselect all
            setSelectedIds(new Set());
        } else {
            // Select all
            setSelectedIds(new Set(filteredConversations.map(conv => conv.id)));
        }
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;

        const count = selectedIds.size;
        if (confirm(`Are you sure you want to delete ${count} ${count === 1 ? 'chat' : 'chats'}?`)) {
            for (const id of selectedIds) {
                await deleteConversation(id);
            }
            setSelectedIds(new Set());
            toast.success(`Deleted ${count} ${count === 1 ? 'chat' : 'chats'}`);
        }
    };

    // const formatDate = (date: Date) => {
    //     const now = new Date();
    //     const diffMs = now.getTime() - date.getTime();
    //     const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    //     const diffWeeks = Math.floor(diffDays / 7);
    //     const diffMonths = Math.floor(diffDays / 30);
    //     const diffYears = Math.floor(diffDays / 365);

    //     if (diffDays === 0) return 'Today';
    //     if (diffDays === 1) return 'Yesterday';
    //     if (diffDays < 7) return `${diffDays} days ago`;
    //     if (diffWeeks === 1) return '1 week ago';
    //     if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    //     if (diffMonths === 1) return '1 month ago';
    //     if (diffMonths < 12) return `${diffMonths} months ago`;
    //     if (diffYears === 1) return '1 year ago';
    //     if (diffYears < 2) return `${diffYears} years ago`;

    //     // For very old dates, show the actual date
    //     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    // };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        // Very recent
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes === 1) return '1 minute ago';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

        // Hours
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;

        // Days
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        // Weeks
        if (diffWeeks === 1) return '1 week ago';
        if (diffWeeks < 4) return `${diffWeeks} weeks ago`;

        // Months
        if (diffMonths === 1) return '1 month ago';
        if (diffMonths < 12) return `${diffMonths} months ago`;

        // Years
        if (diffYears === 1) return '1 year ago';

        // For very old dates, show the actual date and time
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
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
                    setSelectedIds(new Set()); // Clear selections on search
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
                        setSelectedIds(new Set()); // Clear selections on tab change
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="starred">Starred</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-4">
                    {selectedIds.size > 0 ? (
                        <>
                            <Label className="text-sm text-muted-foreground">
                                {selectedIds.size} selected
                            </Label>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteSelected}
                            >
                                Delete selected
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Deselect all
                            </Button>
                        </>
                    ) : (
                        <>
                            <Label className="text-sm text-muted-foreground">
                                {filteredConversations.length}{' '}
                                {filteredConversations.length === 1 ? 'chat' : 'chats'}
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSelectAll}
                            >
                                Select all
                            </Button>
                        </>
                    )}
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
                            className={`"cursor-pointer ${theme === 'dark' ? "hover:bg-foreground/5" : "hover:bg-accent"} transition-colors"`}
                            onClick={() => handleChatClick(conv.id)}
                        >
                            <ItemContent className="w-full">
                                <div className="flex items-center justify-between gap-4 w-full">
                                    <Checkbox
                                        checked={selectedIds.has(conv.id)}
                                        onCheckedChange={() => handleToggleSelect(conv.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <ItemTitle className="line-clamp-1 mb-1">
                                                {conv.title}
                                            </ItemTitle>
                                            {conv.starred && (
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {/* <span>Created {formatDate(conv.createdAt)}</span>
                                            <span>•</span> */}
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
                                                    toggleStar(conv.id);
                                                    toast.success(conv.starred ? 'Chat unstarred' : 'Chat starred');
                                                }}
                                            >
                                                <Star
                                                    className={`h-4 w-4 mr-2 ${conv.starred
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : ''
                                                        }`}
                                                />
                                                {conv.starred ? 'Unstar' : 'Star'}
                                            </DropdownMenuItem>
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