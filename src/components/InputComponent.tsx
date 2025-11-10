import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ButtonGroup } from './ui/button-group';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Paperclip, Settings, Send } from 'lucide-react';

interface InputComponentProps {
    onSubmit?: (message: string, model: string) => void;
    onFileUpload?: (file: File) => void;
}

export const InputComponent = ({ onSubmit, onFileUpload }: InputComponentProps) => {
    const [message, setMessage] = useState('');
    const [selectedModel, setSelectedModel] = useState('claude-3.5-sonnet');
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(4000);

    const handleSubmit = () => {
        if (message.trim()) {
            onSubmit?.(message, selectedModel);
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

    return (
        <div className="w-full max-w-3xl mx-auto space-y-2">
            {/* Input Field */}
            <Input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full"
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
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Right: Model Select + Submit */}
                <ButtonGroup>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={handleSubmit} disabled={!message.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </ButtonGroup>
            </div>
        </div>
    );
};