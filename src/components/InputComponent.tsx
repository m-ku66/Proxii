import { useState, useRef, useEffect } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { supportsThinking } from '@/stores/chatStore';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ButtonGroup } from './ui/button-group';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Paperclip, Settings, Send } from 'lucide-react';

interface InputComponentProps {
    onSubmit?: (
        message: string,
        model: string,
        thinkingEnabled?: boolean,
        options?: {
            temperature: number;
            max_tokens: number;
        }
    ) => void;
    onFileUpload?: (file: File) => void;
}

export const InputComponent = ({ onSubmit, onFileUpload }: InputComponentProps) => {
    const { getUserModels, selectedModelId, setSelectedModel } = useModelStore();
    const userModels = getUserModels();

    const [message, setMessage] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4000);
    const [thinkingEnabled, setThinkingEnabled] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const MAX_HEIGHT = 200; // px, tweak to taste

    // Check if selected model supports thinking
    const thinkingCapability = supportsThinking(selectedModelId || '');

    // Auto-select first model if nothing is selected
    useEffect(() => {
        if (!selectedModelId && userModels.length > 0) {
            setSelectedModel(userModels[0].id);
        }
    }, [selectedModelId, userModels, setSelectedModel]);

    // Auto-disable thinking toggle when switching to non-thinking model
    // Auto-enable for 'always' thinking models like DeepSeek
    useEffect(() => {
        if (thinkingCapability === 'always') {
            setThinkingEnabled(true);
        } else if (!thinkingCapability) {
            setThinkingEnabled(false);
        }
    }, [selectedModelId, thinkingCapability]);

    // Auto-resize textarea based on content
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto"; // reset first
        const newHeight = textarea.scrollHeight;

        if (newHeight > MAX_HEIGHT) {
            textarea.style.height = `${MAX_HEIGHT}px`;
            textarea.style.overflowY = "auto";
        } else {
            textarea.style.height = `${newHeight}px`;
            textarea.style.overflowY = "hidden";
        }
    };

    // Adjust height when message changes
    useEffect(() => {
        adjustTextareaHeight();
    }, [message]);

    const handleSubmit = () => {
        if (message.trim() && selectedModelId) {
            onSubmit?.(message, selectedModelId, thinkingEnabled, {
                temperature,
                max_tokens: maxTokens,
            });
            setMessage('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                onFileUpload?.(file);
            }
        };
        input.click();
    };

    // Get helper text based on thinking capability
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
            {/* Textarea Field */}
            <Textarea
                ref={textareaRef}
                placeholder="Type your message... (Shift+Enter for new line)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[60px] resize-none"
                rows={2}
                spellCheck={true}
            />

            {/* Bottom Controls */}
            <div className="flex items-center justify-between">
                {/* Left: File Upload + Settings */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFileClick}
                        title="Upload file"
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

                                {/* Extended Thinking Toggle */}
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