import { useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { InputComponent } from '@/components/InputComponent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Star, Edit, Download, AlertCircle, Brain, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { MessageActions } from '@/components/MessageActions';
import { EditMessageDialog } from '@/components/EditMessageDialog';
import { CodeBlock } from '@/components/message/CodeBlock';
import { toast } from 'sonner';
import { FileText, Music, Film } from 'lucide-react';
import { formatFileSize } from '@/utils/fileUtils';
import { useUIStore } from '@/stores/uiStore';


// Thinking bubble component - REFACTORED with theme variables
const ThinkingBubble = ({ thinkingTokens }: { thinkingTokens: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-3 border border-primary/[10%] bg-muted/10 rounded-lg overflow-hidden mb-4 w-full">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 p-3 hover:bg-muted/20 transition-colors"
            >
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                    Thinking Process
                </span>
                <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-auto"
                >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                        <div className="p-3 pt-0 border-t border-border/20">
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={{
                                        code: ({ inline, className, children, ...props }: any) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const language = match ? match[1] : undefined;
                                            const codeString = String(children).replace(/\n$/, '');
                                            return <CodeBlock inline={inline} language={language}>{codeString}</CodeBlock>;
                                        },
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
    const [editDialog, setEditDialog] = useState<{
        isOpen: boolean;
        messageId: string;
        content: string;
        role: 'user' | 'assistant';
    }>({
        isOpen: false,
        messageId: '',
        content: '',
        role: 'user'
    });

    const [renameDialog, setRenameDialog] = useState<{
        isOpen: boolean;
        currentTitle: string;
    }>({
        isOpen: false,
        currentTitle: '',
    });

    // Track current temperature/max_tokens for resend/regenerate/edit
    const [currentOptions, setCurrentOptions] = useState<{
        temperature: number;
        max_tokens: number;
    }>({
        temperature: 0.7,
        max_tokens: 4000
    });

    const {
        conversations,
        activeConversationId,
        toggleStar,
        sendMessage,
        isLoading,
        error,
        clearError,
        resendMessage,
        regenerateMessage,
        editMessage,
        deleteMessage,
        exportConversation,
        renameConversation,
        stopGeneration,
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
            (sum, msg) => {
                // Extract text from multimodal content
                const textContent = typeof msg.content === 'string'
                    ? msg.content
                    : msg.content.filter(block => block.type === 'text')
                        .map(block => (block as any).text)
                        .join('\n');
                return sum + textContent.length;
            },
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
        },
        files?: File[]
    ) => {
        if (!activeConversationId) return;

        // Capture current options for later use
        if (options) {
            setCurrentOptions(options);
        }

        // 🐛 DEBUG: Log what ChatRoom receives and passes to store
        console.log('📨 ChatRoom received:', {
            temperature: options?.temperature,
            maxTokens: options?.max_tokens,
            thinkingEnabled,
            model,
            filesCount: files?.length || 0
        });

        try {
            await sendMessage(
                activeConversationId,
                message,
                model,
                thinkingEnabled,
                options,
                files // pass files to sendMessage
            );
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleExport = async (format: 'txt' | 'markdown' | 'json') => {
        if (!activeConversation) {
            toast.error('No conversation to export');
            return;
        }

        try {
            // Show loading toast
            toast.loading(`Exporting as ${format.toUpperCase()}...`);

            const filePath = await exportConversation(activeConversation, format);

            // Dismiss loading toast
            toast.dismiss();

            if (filePath) {
                toast.success(`Exported successfully to ${filePath}`);
            } else {
                toast.info('Export cancelled');
            }
        } catch (error) {
            toast.dismiss();
            toast.error('Export failed. Please try again.');
            console.error('Export failed:', error);
        }
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

    // Add these handler functions to your ChatRoom component
    const handleResend = async (messageId: string) => {
        if (!activeConversationId) return;
        await resendMessage(activeConversationId, messageId, currentOptions);
    };

    const handleRegenerate = async (messageId: string) => {
        if (!activeConversationId) return;
        await regenerateMessage(activeConversationId, messageId, currentOptions);
    };

    const handleEdit = (messageId: string, content: string, role: 'user' | 'assistant') => {
        setEditDialog({
            isOpen: true,
            messageId,
            content,
            role
        });
    };

    const handleDelete = (messageId: string) => {
        if (!activeConversationId) return;

        // Optional: Add confirmation dialog
        if (confirm('Are you sure you want to delete this message?')) {
            deleteMessage(activeConversationId, messageId);
        }
    };

    const handleStop = (messageId: string) => {
        if (!activeConversationId) return;
        stopGeneration(activeConversationId);
        console.log("🛑 Stopped generation for message:", messageId);
    };

    const handleEditSave = async (newContent: string) => {
        if (!activeConversationId) return;
        await editMessage(activeConversationId, editDialog.messageId, newContent, currentOptions);
        setEditDialog({ isOpen: false, messageId: '', content: '', role: 'user' });
    };

    const handleEditCancel = () => {
        setEditDialog({ isOpen: false, messageId: '', content: '', role: 'user' });
    };

    const handleCopy = async (messageId: string) => {
        const message = activeConversation?.messages.find(msg => msg.id === messageId);
        if (!message) return;

        const textContent = typeof message.content === 'string'
            ? message.content
            : message.content
                .filter(block => block.type === 'text')
                .map(block => (block as any).text)
                .join('\n\n');

        await navigator.clipboard.writeText(textContent);
        toast.success('Copied to clipboard');
    };

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
                        <DropdownMenuItem
                            onClick={() => setRenameDialog({
                                isOpen: true,
                                currentTitle: activeConversation.title
                            })}
                        >
                            <Edit className="h-4 w-4 mr-2" />
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
                                <div className="flex flex-col gap-2 max-w-[80%]">
                                    {/* Message bubble content */}
                                    <div
                                        className={`rounded-lg p-4 ${message.role === 'user'
                                            ? 'bg-primary/[5%] text-primary'
                                            : 'bg-muted'
                                            } ${message.isStreaming ? 'animate-pulse' : ''}`}
                                    >
                                        {/* Thinking bubble (only show if thinking tokens exist) - BEFORE the response! */}
                                        {message.thinkingTokens && message.thinkingTokens.trim() && (
                                            <ThinkingBubble thinkingTokens={message.thinkingTokens} />
                                        )}

                                        {/* 🆕 FILE ATTACHMENTS DISPLAY - REFACTORED with theme variables */}
                                        {message.files && message.files.length > 0 && (
                                            <div className="mb-3 space-y-2">
                                                {/* Image thumbnails */}
                                                {message.files.some(f => f.type.startsWith('image/')) && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {message.files
                                                            .filter(f => f.type.startsWith('image/'))
                                                            .map((file, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="relative rounded overflow-hidden border border-border/40"
                                                                >
                                                                    <img
                                                                        src={file.blobUrl || file.url} // Try blobUrl first, fallback to url
                                                                        alt={file.name}
                                                                        className="w-full h-32 object-cover"
                                                                    />
                                                                    <div className={`absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-xs truncate ${useUIStore().theme === 'dark' ? 'text-primary' : "text-primary-foreground"}`}>
                                                                        {file.name}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}

                                                {/* Other file types (PDF, audio, video) - REFACTORED with theme variables */}
                                                {message.files.some(f => !f.type.startsWith('image/')) && (
                                                    <div className="space-y-1">
                                                        {message.files
                                                            .filter(f => !f.type.startsWith('image/'))
                                                            .map((file, idx) => {
                                                                const isPDF = file.type === 'application/pdf';
                                                                const isAudio = file.type.startsWith('audio/');
                                                                const isVideo = file.type.startsWith('video/');

                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-center gap-2 px-3 py-2 rounded bg-background/50 border border-border/40"
                                                                    >
                                                                        {isPDF && <FileText className="h-4 w-4" />}
                                                                        {isAudio && <Music className="h-4 w-4" />}
                                                                        {isVideo && <Film className="h-4 w-4" />}
                                                                        <span className="text-sm truncate flex-1">
                                                                            {file.name}
                                                                        </span>
                                                                        <span className="text-xs opacity-70">
                                                                            {formatFileSize(file.size)}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Message content */}
                                        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath, remarkGfm]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    // Code blocks with syntax highlighting
                                                    code: ({ inline, className, children, ...props }: any) => {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        const language = match ? match[1] : undefined;
                                                        const codeString = String(children).replace(/\n$/, '');
                                                        return <CodeBlock inline={inline} language={language}>{codeString}</CodeBlock>;
                                                    },
                                                    // Headings with better spacing
                                                    h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>,
                                                    h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                                                    h4: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>,
                                                    // Paragraphs
                                                    p: ({ children }) => <p className="mb-4 last:mb-0 whitespace-pre-wrap leading-relaxed">{children}</p>,
                                                    // Lists with proper spacing
                                                    ul: ({ children }) => <ul className="list-disc list-outside ml-6 mb-4 space-y-2">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-2">{children}</ol>,
                                                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                                    // Blockquotes
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                    // Tables
                                                    table: ({ children }) => (
                                                        <div className="my-4 overflow-x-auto">
                                                            <table className="min-w-full divide-y divide-border">{children}</table>
                                                        </div>
                                                    ),
                                                    thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                                                    tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                                                    tr: ({ children }) => <tr>{children}</tr>,
                                                    th: ({ children }) => (
                                                        <th className="px-4 py-2 text-left text-sm font-semibold">{children}</th>
                                                    ),
                                                    td: ({ children }) => <td className="px-4 py-2 text-sm">{children}</td>,
                                                    // Links
                                                    a: ({ href, children }) => (
                                                        <a
                                                            href={href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline font-medium"
                                                        >
                                                            {children}
                                                        </a>
                                                    ),
                                                    // Horizontal rule
                                                    hr: () => <hr className="my-6 border-border" />,
                                                    // Strikethrough (from remark-gfm)
                                                    del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
                                                }}
                                            >
                                                {/* Extract text for display */}
                                                {typeof message.content === 'string'
                                                    ? message.content
                                                    : message.content
                                                        .filter(block => block.type === 'text')
                                                        .map(block => (block as any).text)
                                                        .join('\n\n') || ' '
                                                }
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
                                    {/* Message Actions - positioned below the message */}
                                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <MessageActions
                                            messageId={message.id}
                                            role={message.role}
                                            isStreaming={message.isStreaming}
                                            onResend={handleResend}
                                            onEdit={(messageId) => {
                                                // Extract text from content
                                                const textContent = typeof message.content === 'string'
                                                    ? message.content
                                                    : message.content
                                                        .filter(block => block.type === 'text')
                                                        .map(block => (block as any).text)
                                                        .join('\n\n');
                                                handleEdit(messageId, textContent, message.role);
                                            }}
                                            onRegenerate={handleRegenerate}
                                            onEditAI={(messageId) => {
                                                // Extract text from content
                                                const textContent = typeof message.content === 'string'
                                                    ? message.content
                                                    : message.content
                                                        .filter(block => block.type === 'text')
                                                        .map(block => (block as any).text)
                                                        .join('\n\n');
                                                handleEdit(messageId, textContent, message.role);
                                            }}
                                            onDelete={handleDelete}
                                            onStop={handleStop}
                                            onCopy={handleCopy}
                                        />
                                    </div>
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
                                onClick={() => handleExport('markdown')}
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
                        <p className="mb-1">💾 Local saving</p>
                        <p>Conversations are saved locally on every message.</p>
                    </div>
                </div>
            </div>

            {/* Rename Dialog - REFACTORED with theme variables and proper Input component */}
            {renameDialog.isOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-background border border-border rounded-lg p-6 w-96 shadow-lg">
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
                                onClick={() => setRenameDialog({ isOpen: false, currentTitle: '' })}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (activeConversationId && renameDialog.currentTitle.trim()) {
                                        renameConversation(activeConversationId, renameDialog.currentTitle);
                                        setRenameDialog({ isOpen: false, currentTitle: '' });
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

            {/* Edit Message Dialog */}
            <EditMessageDialog
                isOpen={editDialog.isOpen}
                onClose={handleEditCancel}
                messageContent={editDialog.content}
                messageRole={editDialog.role}
                onSave={handleEditSave}
            />
        </div >
    );
};