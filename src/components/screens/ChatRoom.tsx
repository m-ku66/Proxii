import { useState } from 'react';
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
import { ChevronDown, Star, Edit, Download, AlertCircle, Brain, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

// Thinking bubble component
const ThinkingBubble = ({ thinkingTokens }: { thinkingTokens: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-3 border border-neutral-500/30 bg-neutral-500/5 rounded-lg overflow-hidden mb-4 w-full">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 p-3 hover:bg-neutral-500/10 transition-colors"
            >
                <Brain className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-400">
                    Thinking Process
                </span>
                <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-auto"
                >
                    <ChevronRight className="h-4 w-4 text-neutral-500" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 pt-0 border-t border-neutral-500/20">
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground">
                                <ReactMarkdown
                                    components={{
                                        code: ({ node, inline, className, children, ...props }: { inline: boolean } & any) => (
                                            inline ? (
                                                <code className="bg-background/50 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                                                    {children}
                                                </code>
                                            ) : (
                                                <code className="block bg-background/50 p-2 rounded font-mono text-sm overflow-x-auto" {...props}>
                                                    {children}
                                                </code>
                                            )
                                        ),
                                        p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                                    }}
                                >
                                    {thinkingTokens}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Streaming cursor component
const StreamingCursor = () => (
    <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-2 h-4 bg-primary ml-1 rounded-sm"
    />
);

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
            await sendMessage(activeConversationId, message, model, thinkingEnabled, options);
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
                                        } ${message.isStreaming ? 'animate-pulse' : ''}`}
                                >
                                    {/* Thinking bubble (only show if thinking tokens exist) - BEFORE the response! */}
                                    {message.thinkingTokens && message.thinkingTokens.trim() && (
                                        <ThinkingBubble thinkingTokens={message.thinkingTokens} />
                                    )}

                                    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                        <ReactMarkdown
                                            components={{
                                                // Inline code
                                                code: ({ node, inline, className, children, ...props }: { inline: boolean } & any) => (
                                                    inline ? (
                                                        <code className="bg-background/50 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <code className="block bg-background/50 p-2 rounded font-mono text-sm overflow-x-auto" {...props}>
                                                            {children}
                                                        </code>
                                                    )
                                                ),
                                                // Preserve line breaks and spacing
                                                p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
                                            }}
                                        >
                                            {message.content || ' '}
                                        </ReactMarkdown>

                                        {/* Streaming cursor */}
                                        {message.isStreaming && <StreamingCursor />}
                                    </div>

                                    {message.model && (
                                        <div className="text-xs opacity-70 mt-2">
                                            {message.model}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Loading indicator (only show if no messages are streaming) */}
                        {isLoading && !activeConversation.messages.some(msg => msg.isStreaming) && (
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
                                    {(() => {
                                        const cost = getTotalCost();
                                        if (cost === 0) return '$0.00';
                                        if (cost < 0.0001) return `< $0.0001`;
                                        if (cost < 0.01) return `$${cost.toFixed(6)}`;
                                        return `$${cost.toFixed(4)}`;
                                    })()}
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