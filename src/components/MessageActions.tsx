import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageActionsProps {
    messageId: string;
    role: 'user' | 'assistant';
    onResend?: (messageId: string) => void;
    onEdit?: (messageId: string) => void;
    onRegenerate?: (messageId: string) => void;
    onEditAI?: (messageId: string) => void;
    onDelete?: (messageId: string) => void;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
    messageId,
    role,
    onResend,
    onEdit,
    onRegenerate,
    onEditAI,
    onDelete
}) => {
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
                {/* Regenerate */}
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

                {/* 🔧 FIXED: AI messages are now always editable */}
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
};