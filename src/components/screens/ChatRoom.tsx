import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { InputComponent } from '@/components/InputComponent';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Star, Edit, Download } from 'lucide-react';
import { motion } from 'motion/react';

export const ChatRoom = () => {
    const { conversations, activeConversationId, toggleStar } = useChatStore();
    const activeConversation = conversations.find(
        (conv) => conv.id === activeConversationId
    );

    // Helper functions for stats
    const getTotalTokens = () => {
        if (!activeConversation) return 0;
        return activeConversation.messages.reduce(
            (sum, msg) => sum + (msg.tokens || 0),
            0
        );
    };

    const getTotalCharacters = () => {
        if (!activeConversation) return 0;
        return activeConversation.messages.reduce(
            (sum, msg) => sum + msg.content.length,
            0
        );
    };

    const handleExport = (format: 'txt' | 'md' | 'json') => {
        if (!activeConversation) return;
        // TODO: Implement export functionality
        console.log(`Exporting as ${format}`);
    };

    // If no active conversation, show empty state
    if (!activeConversation) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-muted-foreground mb-2">
                        No conversation selected
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Start a new chat or select one from your history
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <h1 className="text-xl font-semibold">{activeConversation.title}</h1>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <ChevronDown className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => toggleStar(activeConversation.id)}
                            className="gap-2"
                        >
                            <Star
                                className={`h-4 w-4 ${activeConversation.starred
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : ''
                                    }`}
                            />
                            {activeConversation.starred ? 'Unstar' : 'Star'} conversation
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                            <Edit className="h-4 w-4" />
                            Edit name
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Main content area - 70/30 split */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Messages area (70%) */}
                <div className="flex flex-1 flex-col overflow-hidden" style={{ flexBasis: '70%' }}>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                        {activeConversation.messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                        }`}
                                >
                                    {/* Model badge for assistant messages */}
                                    {message.role === 'assistant' && message.model && (
                                        <div className="mb-2 text-xs text-muted-foreground font-mono">
                                            {message.model}
                                        </div>
                                    )}

                                    {/* Message content */}
                                    <div className="whitespace-pre-wrap break-words">
                                        {message.content}
                                    </div>

                                    {/* Timestamp */}
                                    <div className="mt-2 text-xs opacity-70">
                                        {new Date(message.timestamp).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true,
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Input component */}
                    <div className="border-t px-6 py-4">
                        <InputComponent />
                    </div>
                </div>

                {/* Right: Stats panel (30%) */}
                <div
                    className="border-l bg-muted/20 p-6 space-y-6 overflow-y-auto"
                    style={{ flexBasis: '30%' }}
                >
                    <div>
                        <h3 className="text-sm font-semibold mb-4">Conversation Stats</h3>

                        {/* Token count */}
                        <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
                            <p className="text-2xl font-bold">{getTotalTokens().toLocaleString()}</p>
                        </div>

                        {/* Character count */}
                        <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-1">Total Characters</p>
                            <p className="text-2xl font-bold">
                                {getTotalCharacters().toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Export settings */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Export</h3>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2"
                                onClick={() => handleExport('txt')}
                            >
                                <Download className="h-4 w-4" />
                                Export as TXT
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2"
                                onClick={() => handleExport('md')}
                            >
                                <Download className="h-4 w-4" />
                                Export as Markdown
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2"
                                onClick={() => handleExport('json')}
                            >
                                <Download className="h-4 w-4" />
                                Export as JSON
                            </Button>
                        </div>
                    </div>

                    {/* Autosave indicator */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="h-4 w-4" />
                        <span>Autosaving...</span>
                    </div>
                </div>
            </div>
        </div>
    );
};