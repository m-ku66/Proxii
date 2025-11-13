import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { InputComponent } from '@/components/InputComponent';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Star, Edit, Download, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ChatRoom = () => {
    const {
        conversations,
        activeConversationId,
        toggleStar,
        sendMessage,
        isLoading,
        error,
        clearError,
    } = useChatStore();

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

    const getTotalCost = () => {
        if (!activeConversation) return 0;
        return activeConversation.messages.reduce(
            (sum, msg) => sum + (msg.cost || 0),
            0
        );
    };

    const handleSubmit = async (
        message: string,
        model: string,
        thinkingEnabled?: boolean,
        options?: {
            temperature: number;
            max_tokens: number;
        }
    ) => {
        if (!activeConversationId) return;

        try {
            await sendMessage(activeConversationId, message, model, options);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
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
            <div className="flex items-center border-b px-6 py-4">
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
                            {activeConversation.starred ? 'Unstar' : 'Star'} Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                            <Edit className="h-4 w-4" />
                            Rename Chat
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Main content area - 70/30 split */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Messages (70%) */}
                <div className="flex flex-col w-[70%] border-r">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {activeConversation.messages.map((message, index) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-4 ${message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                        }`}
                                >
                                    <div className="whitespace-pre-wrap break-words">
                                        {message.content}
                                    </div>
                                    {message.model && (
                                        <div className="text-xs opacity-70 mt-2">
                                            {message.model}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-start"
                            >
                                <div className="bg-muted rounded-lg p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="animate-pulse">Thinking...</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Error display */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-center"
                            >
                                <div className="bg-destructive/10 border border-destructive rounded-lg p-4 flex items-start gap-2 max-w-[80%]">
                                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                                    <div>
                                        <p className="font-medium text-destructive">Error sending message</p>
                                        <p className="text-sm text-muted-foreground mt-1">{error}</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={clearError}
                                            className="mt-2"
                                        >
                                            Dismiss
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="border-t p-4">
                        <InputComponent
                            onSubmit={handleSubmit}
                        />
                    </div>
                </div>

                {/* Right: Stats (30%) */}
                <div className="w-[30%] p-6 space-y-6 overflow-y-auto">
                    <div>
                        <h2 className="font-semibold mb-4">Statistics</h2>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-muted rounded">
                                <span className="text-sm text-muted-foreground">Tokens</span>
                                <span className="font-mono font-medium">
                                    {getTotalTokens().toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-muted rounded">
                                <span className="text-sm text-muted-foreground">Characters</span>
                                <span className="font-mono font-medium">
                                    {getTotalCharacters().toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-muted rounded">
                                <span className="text-sm text-muted-foreground">Total Cost</span>
                                <span className="font-mono font-medium">
                                    ${getTotalCost().toFixed(4)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="font-semibold mb-4">Export</h2>
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

                    <div className="text-xs text-muted-foreground">
                        <p className="mb-1">💾 Auto-save: Enabled</p>
                        <p>Last saved: Just now</p>
                    </div>
                </div>
            </div>
        </div>
    );
};