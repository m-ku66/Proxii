import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Edit2, Trash2, RefreshCw, StopCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageActionsProps {
    messageId: string;
    role: 'user' | 'assistant';
    isStreaming?: boolean;
    onResend?: (messageId: string) => void;
    onEdit?: (messageId: string) => void;
    onRegenerate?: (messageId: string) => void;
    onEditAI?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
    onStop?: (messageId: string) => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
    messageId,
    role,
    isStreaming,
    onResend,
    onEdit,
    onRegenerate,
    onEditAI,
    onDelete,
    onStop,
}) => {
    // 🐛 DEBUG: Log what we're receiving
    console.log('MessageActions:', { messageId, role, isStreaming });

    if (role === 'user') {
        return (
            <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                <TooltipProvider>
                    {/* Resend */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => onResend?.(messageId)}
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Resend</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Edit */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => onEdit?.(messageId)}
                            >
                                <Edit2 className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Edit</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Delete */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => onDelete?.(messageId)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Delete</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    }

    // Assistant message actions
    return (
        <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <TooltipProvider>
                {/* ✨ Stop button - only show when streaming */}
                {isStreaming && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                                onClick={() => onStop?.(messageId)}
                            >
                                <StopCircle className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Stop Generating</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Regenerate - hide when streaming */}
                {!isStreaming && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => onRegenerate?.(messageId)}
                            >
                                <RefreshCw className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Regenerate</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Edit - hide when streaming */}
                {!isStreaming && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => onEditAI?.(messageId)}
                            >
                                <Edit2 className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Edit AI Response</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Delete - hide when streaming */}
                {!isStreaming && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => onDelete?.(messageId)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>Delete</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </TooltipProvider>
        </div>
    );
};