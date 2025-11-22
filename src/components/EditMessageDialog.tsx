import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditMessageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    messageContent: string;
    messageRole: 'user' | 'assistant';
    onSave: (newContent: string) => void;
}

export const EditMessageDialog: React.FC<EditMessageDialogProps> = ({
    isOpen,
    onClose,
    messageContent,
    messageRole,
    onSave
}) => {
    const [editedContent, setEditedContent] = useState(messageContent);

    // Reset content when dialog opens with new message
    useEffect(() => {
        setEditedContent(messageContent);
    }, [messageContent, isOpen]);

    const handleSave = () => {
        if (editedContent.trim()) {
            onSave(editedContent.trim());
            onClose();
        }
    };

    const handleCancel = () => {
        setEditedContent(messageContent); // Reset to original
        onClose();
    };

    const hasChanges = editedContent.trim() !== messageContent.trim();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        Edit {messageRole === 'user' ? 'Message' : 'AI Response'}
                    </DialogTitle>
                    <DialogDescription>
                        {messageRole === 'user'
                            ? 'Edit your message. Saving will automatically resend with the new content.'
                            : 'Edit the AI response. This will update the message content.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="message-content">Content</Label>
                        <Textarea
                            id="message-content"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-32 resize-none"
                            placeholder={`Enter ${messageRole === 'user' ? 'your message' : 'AI response'}...`}
                        />
                    </div>

                    {/* Character count */}
                    <div className="text-sm text-muted-foreground text-right">
                        {editedContent.length} characters
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!editedContent.trim() || !hasChanges}
                    >
                        {messageRole === 'user' ? 'Save & Resend' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};