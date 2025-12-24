import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useChatStore } from '@/stores/chatStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Item,
    ItemContent,
    ItemGroup,
    ItemTitle,
    ItemDescription,
} from '@/components/ui/item';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, MoreVertical, Edit, Trash2, FolderOpen, Star } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useUIStore } from '@/stores/uiStore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Projects = () => {
    const { projects, createProject, updateProject, deleteProject, toggleStar, setActiveProject } = useProjectStore();
    const { getConversationsByProject, deleteConversation } = useChatStore();
    const { theme, setActiveScreen } = useUIStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'starred'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const projectsPerPage = 10;

    // Create dialog state
    const [createDialog, setCreateDialog] = useState<{
        isOpen: boolean;
        name: string;
        description: string;
    }>({
        isOpen: false,
        name: '',
        description: '',
    });

    // Rename dialog state
    const [renameDialog, setRenameDialog] = useState<{
        isOpen: boolean;
        projectId: string;
        currentName: string;
    }>({
        isOpen: false,
        projectId: '',
        currentName: '',
    });

    // Filter projects based on tab and search, then sort by most recently updated
    const filteredProjects = projects
        .filter((project) => {
            const matchesSearch =
                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTab = activeTab === 'all' || project.starred;
            return matchesSearch && matchesTab;
        })
        .sort((a, b) => {
            // Sort by updatedAt descending (most recent first)
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

    // Pagination logic
    const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
    const startIndex = (currentPage - 1) * projectsPerPage;
    const endIndex = startIndex + projectsPerPage;
    const currentProjects = filteredProjects.slice(startIndex, endIndex);

    const handleProjectClick = (id: string) => {
        setActiveProject(id);
        setActiveScreen('projectDetail');
    };

    const handleCreateProject = () => {
        setCreateDialog({
            isOpen: true,
            name: '',
            description: '',
        });
    };

    const handleSaveNewProject = () => {
        if (createDialog.name.trim()) {
            createProject(
                createDialog.name.trim(),
                createDialog.description.trim() || undefined
            );
            setCreateDialog({
                isOpen: false,
                name: '',
                description: '',
            });
            toast.success('Project created!');
        } else {
            toast.error('Project name is required');
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredProjects.length) {
            // Deselect all
            setSelectedIds(new Set());
        } else {
            // Select all
            setSelectedIds(new Set(filteredProjects.map(proj => proj.id)));
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
    if (confirm(`Are you sure you want to delete ${count} ${count === 1 ? 'project' : 'projects'}? This will also delete all conversations in ${count === 1 ? 'this project' : 'these projects'}.`)) {
    for (const id of selectedIds) {
    // Delete all conversations in this project
        const projectConversations = getConversationsByProject(id);
        for (const conv of projectConversations) {
            await deleteConversation(conv.id);
            }
                // Then delete the project
                deleteProject(id);
            }
            setSelectedIds(new Set());
            toast.success(`Deleted ${count} ${count === 1 ? 'project' : 'projects'} and their conversations`);
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes === 1) return '1 minute ago';
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffHours === 1) return '1 hour ago';
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffWeeks === 1) return '1 week ago';
        if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
        if (diffMonths === 1) return '1 month ago';
        if (diffMonths < 12) return `${diffMonths} months ago`;
        if (diffYears === 1) return '1 year ago';

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
                <h1 className="text-3xl font-bold">Projects</h1>
                <Button onClick={handleCreateProject} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create project
                </Button>
            </div>

            {/* Search bar */}
            <Input
                type="search"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setSelectedIds(new Set());
                }}
                className="mb-6"
            />

            {/* Tabs and Filter section */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
                        setActiveTab(value as 'all' | 'starred');
                        setCurrentPage(1);
                        setSelectedIds(new Set());
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
                                {filteredProjects.length}{' '}
                                {filteredProjects.length === 1 ? 'project' : 'projects'}
                            </Label>
                            {filteredProjects.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSelectAll}
                                >
                                    Select all
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Projects list */}
            <ItemGroup className="flex-1 gap-2 overflow-auto">
                {currentProjects.length > 0 ? (
                    currentProjects.map((project) => (
                        <Item
                            key={project.id}
                            variant="outline"
                            role="listitem"
                            className={`cursor-pointer ${theme === 'dark' ? "hover:bg-foreground/5" : "hover:bg-accent"} transition-colors`}
                            onClick={() => handleProjectClick(project.id)}
                        >
                            <ItemContent className="w-full">
                                <div className="flex items-center justify-between gap-4 w-full">
                                    <Checkbox
                                        checked={selectedIds.has(project.id)}
                                        onCheckedChange={() => handleToggleSelect(project.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <ItemTitle className="line-clamp-1">
                                                {project.name}
                                            </ItemTitle>
                                            {project.starred && (
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                            )}
                                        </div>
                                        {project.description && (
                                            <ItemDescription className="mt-1">
                                                {project.description}
                                            </ItemDescription>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                            <span>Last updated {formatTime(project.updatedAt)}</span>
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
                                                    toggleStar(project.id);
                                                    toast.success(project.starred ? 'Project unstarred' : 'Project starred');
                                                }}
                                            >
                                                <Star
                                                    className={`h-4 w-4 mr-2 ${
                                                        project.starred
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : ''
                                                    }`}
                                                />
                                                {project.starred ? 'Unstar' : 'Star'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRenameDialog({
                                                        isOpen: true,
                                                        projectId: project.id,
                                                        currentName: project.name
                                                    });
                                                }}
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const projectConversations = getConversationsByProject(project.id);
                                                    const convCount = projectConversations.length;
                                                    const confirmMessage = convCount > 0
                                                        ? `Are you sure you want to delete this project? This will also delete ${convCount} ${convCount === 1 ? 'conversation' : 'conversations'}.`
                                                        : 'Are you sure you want to delete this project?';
                                                    
                                                    if (confirm(confirmMessage)) {
                                                        // Delete all conversations first
                                                        for (const conv of projectConversations) {
                                                            await deleteConversation(conv.id);
                                                        }
                                                        // Then delete the project
                                                        deleteProject(project.id);
                                                        toast.success('Project and its conversations deleted');
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
                        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-2">
                            {activeTab === 'starred'
                                ? 'No starred projects'
                                : 'No projects found'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? 'Try a different search term'
                                : activeTab === 'starred'
                                    ? 'Star projects to see them here'
                                    : 'Create your first project to get started'}
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

            {/* Create Project Dialog */}
            {createDialog.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 w-96">
                        <h3 className="font-semibold mb-4">Create Project</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="project-name" className="mb-2">
                                    Name *
                                </Label>
                                <Input
                                    id="project-name"
                                    type="text"
                                    value={createDialog.name}
                                    onChange={(e) => setCreateDialog(prev => ({
                                        ...prev,
                                        name: e.target.value
                                    }))}
                                    placeholder="My Project"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <Label htmlFor="project-description" className="mb-2">
                                    Description
                                </Label>
                                <Textarea
                                    id="project-description"
                                    value={createDialog.description}
                                    onChange={(e) => setCreateDialog(prev => ({
                                        ...prev,
                                        description: e.target.value
                                    }))}
                                    placeholder="A brief description of your project..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setCreateDialog({
                                    isOpen: false,
                                    name: '',
                                    description: '',
                                })}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSaveNewProject}>
                                Create
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Dialog */}
            {renameDialog.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-6 w-96">
                        <h3 className="font-semibold mb-4">Rename Project</h3>
                        <Input
                            type="text"
                            value={renameDialog.currentName}
                            onChange={(e) => setRenameDialog(prev => ({
                                ...prev,
                                currentName: e.target.value
                            }))}
                            placeholder="Project name..."
                            autoFocus
                            className="mb-4"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setRenameDialog({
                                    isOpen: false,
                                    projectId: '',
                                    currentName: ''
                                })}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (renameDialog.currentName.trim()) {
                                        updateProject(renameDialog.projectId, {
                                            name: renameDialog.currentName.trim()
                                        });
                                        setRenameDialog({
                                            isOpen: false,
                                            projectId: '',
                                            currentName: ''
                                        });
                                        toast.success('Project renamed!');
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
