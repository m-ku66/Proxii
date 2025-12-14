import { useState, useEffect } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import { supportsThinking } from '@/stores/chatStore';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import { Button } from './ui/button';
import { ButtonGroup } from './ui/button-group';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Paperclip, Settings, Send } from 'lucide-react';
import { FilePreviewBubble } from './FilePreviewBubble';
import { AttachedFile, MAX_FILES_PER_MESSAGE } from '@/types/multimodal';
import {
    createAttachedFile,
    cleanupAttachedFiles,
    validateFiles,
} from '@/utils/fileUtils';
import { toast } from 'sonner';

interface InputComponentProps {
    onSubmit?: (
        message: string,
        model: string,
        thinkingEnabled?: boolean,
        options?: {
            temperature: number;
            max_tokens: number;
        },
        files?: File[] // NEW: Add files parameter
    ) => void;
    onFileUpload?: (file: File) => void; // Keep for backwards compatibility but won't be used
}

export const InputComponent = ({ onSubmit }: InputComponentProps) => {
    const { getUserModels, selectedModelId, setSelectedModel } = useModelStore();
    const { theme } = useUIStore();
    const userModels = getUserModels();

    const [message, setMessage] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4000);
    const [thinkingEnabled, setThinkingEnabledRaw] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]); // NEW: File state

    const setThinkingEnabled = (value: boolean) => {
        setThinkingEnabledRaw(value);
    };

    const thinkingCapability = supportsThinking(selectedModelId || '');

    useEffect(() => {
        if (!selectedModelId && userModels.length > 0) {
            setSelectedModel(userModels[0].id);
        }
    }, [selectedModelId, userModels, setSelectedModel]);

    useEffect(() => {
        if (thinkingCapability === 'always') {
            setThinkingEnabled(true);
        } else if (!thinkingCapability) {
            setThinkingEnabled(false);
        }
    }, [selectedModelId, thinkingCapability]);

    // NEW: Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            cleanupAttachedFiles(attachedFiles);
        };
    }, []);

    const handleSubmit = () => {
        console.log('📤 InputComponent sending:', {
            temperature,
            maxTokens,
            thinkingEnabled,
            selectedModel: selectedModelId,
            filesCount: attachedFiles.length,
        });

        if (message.trim() && selectedModelId) {
            // Pass the actual File objects to onSubmit
            const files = attachedFiles.map(af => af.file);

            onSubmit?.(message, selectedModelId, thinkingEnabled, {
                temperature,
                max_tokens: maxTokens,
            }, files); // NEW: Pass files

            setMessage('');

            // NEW: Clean up and clear files after submit
            cleanupAttachedFiles(attachedFiles);
            setAttachedFiles([]);
        }
    };

    // Handle Ctrl/Cmd + Enter to submit
    const handleEditorKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // NEW: Updated to handle multiple files
    const handleFileClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true; // Allow multiple file selection
        input.accept = 'image/*,application/pdf,audio/*,video/*'; // Hint at supported types

        input.onchange = (e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);

            if (files.length === 0) return;

            // Check if adding these files would exceed the limit
            const totalFiles = attachedFiles.length + files.length;
            if (totalFiles > MAX_FILES_PER_MESSAGE) {
                toast.error(`Maximum ${MAX_FILES_PER_MESSAGE} files per message. You're trying to add ${files.length} more to ${attachedFiles.length} existing.`);
                return;
            }

            // Validate all new files
            const validation = validateFiles(files);
            if (!validation.valid) {
                toast.error(validation.error || 'File validation failed');
                return;
            }

            // Create AttachedFile objects (includes preview URLs for images)
            const newAttachedFiles = files.map(createAttachedFile);

            setAttachedFiles(prev => [...prev, ...newAttachedFiles]);
            toast.success(`${files.length} ${files.length === 1 ? 'file' : 'files'} attached`);
        };

        input.click();
    };

    // NEW: Remove a file
    const handleRemoveFile = (fileId: string) => {
        setAttachedFiles(prev => {
            const toRemove = prev.find(f => f.id === fileId);
            if (toRemove) {
                cleanupAttachedFiles([toRemove]); // Clean up preview URL
            }
            return prev.filter(f => f.id !== fileId);
        });
    };

    const getThinkingHelperText = () => {
        switch (thinkingCapability) {
            case 'always':
                return 'This model always uses extended thinking';
            case 'reasoning_effort':
                return 'Enable deeper reasoning with o1 thinking mode';
            case 'thinking':
                return 'Enable Claude extended thinking (up to 10k tokens)';
            case 'max_reasoning_tokens':
                return 'Enable Gemini reasoning mode (up to 8k tokens)';
            default:
                return 'This model does not support extended thinking';
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-2">
            {/* NEW: File preview bubble */}
            <FilePreviewBubble files={attachedFiles} onRemove={handleRemoveFile} />

            {/* Rich Markdown Editor */}
            <div
                className="w-full border rounded-md overflow-hidden"
                onKeyDown={handleEditorKeyDown}
                data-color-mode={theme}
            >
                <MDEditor
                    value={message}
                    onChange={(value) => setMessage(value || '')}
                    preview="edit"
                    hideToolbar={false}
                    height={100}
                    visibleDragbar={false}
                    textareaProps={{
                        placeholder: 'Type your message... (Ctrl/Cmd+Enter to send, Shift+Enter for new line)'
                    }}
                />
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between">
                {/* Left: File Upload + Settings */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFileClick}
                        title="Upload files"
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" title="Model settings">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="space-y-4">
                                <h4 className="font-medium">Model Settings</h4>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="thinking-mode" className="text-sm font-medium">
                                            Extended Thinking
                                            {thinkingCapability === 'always' && (
                                                <span className="ml-2 text-xs font-normal text-green-500">
                                                    (Always On)
                                                </span>
                                            )}
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {getThinkingHelperText()}
                                        </p>
                                    </div>
                                    <Switch
                                        id="thinking-mode"
                                        checked={thinkingEnabled}
                                        onCheckedChange={setThinkingEnabled}
                                        disabled={!thinkingCapability || thinkingCapability === 'always'}
                                    />
                                </div>

                                <div className="border-t pt-4 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Temperature: {temperature}
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={temperature}
                                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Max Tokens: {maxTokens}
                                        </label>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="8000"
                                            step="100"
                                            value={maxTokens}
                                            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Right: Model Select + Submit */}
                <ButtonGroup>
                    <Select value={selectedModelId as string} onValueChange={setSelectedModel}>
                        <SelectTrigger className="w-[200px] [&>span]:truncate">
                            <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                            {userModels.length > 0 ? (
                                userModels.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value=" " disabled>
                                    No models - Add in Settings
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>

                    <Button onClick={handleSubmit} disabled={!message.trim() || !selectedModelId}>
                        <Send className="h-4 w-4" />
                    </Button>
                </ButtonGroup>
            </div>
        </div>
    );
};