import { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Item,
    ItemContent,
    ItemGroup,
    ItemTitle,
} from '@/components/ui/item';
import { ArrowLeft, MessageSquare, Upload, FileText, X, MoreVertical, Star, Edit, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputComponent } from '../InputComponent';
import { toast } from 'sonner';

export const ProjectDetail = () => {
    const { getActiveProject, updateProject, deleteProject, toggleStar } = useProjectStore();
    const { conversations, getConversationsByProject, setActiveConversation, createNewChat, sendMessage, deleteConversation, renameConversation, toggleStar: toggleConversationStar } = useChatStore();
    const { setActiveScreen, theme } = useUIStore();

    const project = getActiveProject();

    // Local state for editing
    const [editedInstructions, setEditedInstructions] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit dialog state
    const [editDialog, setEditDialog] = useState<{
        isOpen: boolean;
        name: string;
        description: string;
    }>({
        isOpen: false,
        name: '',
        description: '',
    });

    // Rename conversation dialog state
    const [renameConvDialog, setRenameConvDialog] = useState<{
        isOpen: boolean;
        conversationId: string;
        currentTitle: string;
    }>({
        isOpen: false,
        conversationId: '',
        currentTitle: '',
    });

    // Initialize edit state when project loads
    useEffect(() => {
        if (project) {
            setEditedInstructions(project.instructions || '');
        }
    }, [project?.id]); // Only re-run when project ID changes

    // Track if instructions have been changed
    useEffect(() => {
        if (project) {
            const instructionsChanged = editedInstructions !== (project.instructions || '');
            setHasChanges(instructionsChanged);
        }
    }, [editedInstructions, project]);

    if (!project) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No project selected</p>
            </div>
        );
    }

    // Get conversations for this project
    const projectConversations = getConversationsByProject(project.id).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const handleBack = () => {
        setActiveScreen('projects');
    };

    const handleOpenEditDialog = () => {
        setEditDialog({
            isOpen: true,
            name: project.name,
            description: project.description || '',
        });
    };

    const handleSaveProjectInfo = () => {
        if (!editDialog.name.trim()) {
            toast.error('Project name cannot be empty');
            return;
        }

        updateProject(project.id, {
            name: editDialog.name.trim(),
            description: editDialog.description.trim() || undefined,
        });

        setEditDialog({
            isOpen: false,
            name: '',
            description: '',
        });
        toast.success('Project info updated!');
    };

    const handleDeleteProject = async () => {
        const projectConversationsCount = projectConversations.length;
        const confirmMessage = projectConversationsCount > 0
            ? `Are you sure you want to delete this project? This will also delete ${projectConversationsCount} ${projectConversationsCount === 1 ? 'conversation' : 'conversations'} in this project.`
            : 'Are you sure you want to delete this project?';

        if (confirm(confirmMessage)) {
            // Delete all conversations in this project first
            for (const conversation of projectConversations) {
                await deleteConversation(conversation.id);
            }

            // Then delete the project itself
            deleteProject(project.id);
            toast.success('Project and its conversations deleted');
            setActiveScreen('projects');
        }
    };

    const handleConversationClick = (id: string) => {
        setActiveConversation(id);
        setActiveScreen('chatRoom');
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        
        try {
            // Update the project (marks dirty)
            updateProject(project.id, {
                instructions: editedInstructions.trim() || undefined,
            });

            // Immediately trigger save instead of waiting for auto-save
            await useProjectStore.getState().saveAllDirtyProjects();
            
            setHasChanges(false);
            toast.success('Instructions saved!');
        } catch (error) {
            console.error('Failed to save instructions:', error);
            toast.error('Failed to save instructions');
        } finally {
            setIsSaving(false);
        }
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
        // Create a new chat with the first message as the title (truncated)
        const title = message.length > 50 ? message.substring(0, 50) + '...' : message;

        // Create the new chat in this project
        createNewChat(title, undefined, project.id);

        // Get the newly created chat ID (it's the first one now)
        const newChatId = useChatStore.getState().conversations[0]?.id;

        if (newChatId) {
            try {
                // Send the message with files
                await sendMessage(newChatId, message, model, thinkingEnabled, options, files);

                // Navigate to chat room
                setActiveScreen('chatRoom');
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes === 1) return '1 minute ago';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString();
    };

    return (
        <div className="flex h-full flex-col">
            {/* Back button header */}
            <div className="flex items-center gap-2 p-6 pb-4 border-b">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    All Projects
                </Button>
            </div>

            {/* Main content: Two-panel layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel (70%) - Conversations */}
                <div className="flex-[7] flex flex-col border-r overflow-hidden">
                    {/* Project header */}
                    <div className="p-6 pb-4 border-b">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold truncate">{project.name}</h2>
                                    {project.starred && (
                                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                    )}
                                </div>
                                {project.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {project.description}
                                    </p>
                                )}
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                        toggleStar(project.id);
                                        toast.success(project.starred ? 'Project unstarred' : 'Project starred');
                                    }}>
                                        <Star
                                            className={`h-4 w-4 mr-2 ${
                                                project.starred
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : ''
                                            }`}
                                        />
                                        {project.starred ? 'Unstar' : 'Star'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleOpenEditDialog}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleDeleteProject}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Input component */}
                    <div className="p-6 border-b">
                        <InputComponent onSubmit={handleSubmit} />
                    </div>

                    {/* Conversations list */}
                    <div className="flex-1 p-6 overflow-auto">
                        <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
                            CONVERSATIONS
                        </h3>
                        {projectConversations.length > 0 ? (
                            <ItemGroup className="gap-2">
                                {projectConversations.map((conv) => (
                                    <Item
                                        key={conv.id}
                                        variant="outline"
                                        role="listitem"
                                        className={`cursor-pointer ${theme === 'dark' ? "hover:bg-foreground/5" : "hover:bg-accent"} transition-colors`}
                                        onClick={() => handleConversationClick(conv.id)}
                                    >
                                        <ItemContent className="w-full">
                                            <div className="flex items-center justify-between gap-4 w-full">
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
                                                                toggleConversationStar(conv.id);
                                                                toast.success(conv.starred ? 'Conversation unstarred' : 'Conversation starred');
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
                                                                setRenameConvDialog({
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
                                                                if (confirm('Are you sure you want to delete this conversation?')) {
                                                                    deleteConversation(conv.id);
                                                                    toast.success('Conversation deleted');
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
                                ))}
                            </ItemGroup>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground mb-2">
                                    No conversations yet
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Start a conversation above to get started
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel (30%) - Project Info */}
                <div className="flex-[3] flex flex-col overflow-auto">
                    <div className="p-6 space-y-6">
                        {/* Custom Instructions Section */}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="project-instructions" className="mb-2">
                                    Custom Instructions
                                </Label>
                                <Textarea
                                    id="project-instructions"
                                    value={editedInstructions}
                                    onChange={(e) => setEditedInstructions(e.target.value)}
                                    placeholder="Add custom instructions for conversations in this project..."
                                    rows={8}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    These instructions will be prepended to all conversations in this project
                                </p>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="pt-4 border-t space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Conversations</span>
                                <span className="font-medium">{projectConversations.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Knowledge files</span>
                                <span className="font-medium">{project.knowledgeFiles.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Created</span>
                                <span className="font-medium">{new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Knowledge Base Section (Placeholder UI) */}
                        <div className="pt-4 border-t">
                            <div className="flex items-center justify-between mb-4">
                                <Label>Knowledge Base</Label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    disabled
                                    title="Coming in Phase 3"
                                >
                                    <Upload className="h-4 w-4" />
                                    Upload
                                </Button>
                            </div>

                            {project.knowledgeFiles.length > 0 ? (
                                <div className="space-y-2">
                                    {project.knowledgeFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm truncate">{file.filename}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(file.size / 1024).toFixed(1)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                disabled
                                                title="Coming in Phase 3"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 border rounded-md bg-muted/30">
                                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        No knowledge files yet
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Upload files to provide context
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Save button */}
                        <div className="pt-4">
                            <Button
                                onClick={handleSaveChanges}
                                disabled={!hasChanges || isSaving}
                                className="w-full"
                            >
                                {isSaving ? 'Saving...' : 'Save Instructions'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Project Dialog */}
            {editDialog.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 w-96">
                        <h3 className="font-semibold mb-4">Edit Project</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="edit-project-name" className="mb-2">
                                    Name *
                                </Label>
                                <Input
                                    id="edit-project-name"
                                    type="text"
                                    value={editDialog.name}
                                    onChange={(e) => setEditDialog(prev => ({
                                        ...prev,
                                        name: e.target.value
                                    }))}
                                    placeholder="Project name"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-project-description" className="mb-2">
                                    Description
                                </Label>
                                <Textarea
                                    id="edit-project-description"
                                    value={editDialog.description}
                                    onChange={(e) => setEditDialog(prev => ({
                                        ...prev,
                                        description: e.target.value
                                    }))}
                                    placeholder="A brief description..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setEditDialog({
                                    isOpen: false,
                                    name: '',
                                    description: '',
                                })}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSaveProjectInfo}>
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Conversation Dialog */}
            {renameConvDialog.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 w-96">
                        <h3 className="font-semibold mb-4">Rename Conversation</h3>
                        <Input
                            type="text"
                            value={renameConvDialog.currentTitle}
                            onChange={(e) => setRenameConvDialog(prev => ({
                                ...prev,
                                currentTitle: e.target.value
                            }))}
                            placeholder="Conversation title..."
                            autoFocus
                            className="mb-4"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setRenameConvDialog({
                                    isOpen: false,
                                    conversationId: '',
                                    currentTitle: ''
                                })}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (renameConvDialog.currentTitle.trim()) {
                                        renameConversation(renameConvDialog.conversationId, renameConvDialog.currentTitle);
                                        setRenameConvDialog({
                                            isOpen: false,
                                            conversationId: '',
                                            currentTitle: ''
                                        });
                                        toast.success('Conversation renamed!');
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
