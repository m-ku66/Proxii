import { X, FileText, Music, Film, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { AttachedFile } from '@/types/multimodal';
import { formatFileSize, getFileTypeName, getFileCategory } from '@/utils/fileUtils';

interface FilePreviewBubbleProps {
    files: AttachedFile[];
    onRemove: (fileId: string) => void;
}

export const FilePreviewBubble = ({ files, onRemove }: FilePreviewBubbleProps) => {
    if (files.length === 0) return null;

    return (
        <div className="w-full max-w-3xl mx-auto mb-2">
            <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="font-medium">
                        {files.length} {files.length === 1 ? 'file' : 'files'} attached
                    </span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {files.map((attachedFile) => (
                        <FilePreviewChip
                            key={attachedFile.id}
                            attachedFile={attachedFile}
                            onRemove={() => onRemove(attachedFile.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// Individual file chip component
interface FilePreviewChipProps {
    attachedFile: AttachedFile;
    onRemove: () => void;
}

const FilePreviewChip = ({ attachedFile, onRemove }: FilePreviewChipProps) => {
    const { file, preview } = attachedFile;
    const category = getFileCategory(file.type);
    const fileTypeName = getFileTypeName(file);
    const fileSize = formatFileSize(file.size);

    // Get icon based on category
    const getIcon = () => {
        switch (category) {
            case 'image':
                return <ImageIcon className="h-4 w-4" />;
            case 'document':
                return <FileText className="h-4 w-4" />;
            case 'audio':
                return <Music className="h-4 w-4" />;
            case 'video':
                return <Film className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <div className="flex items-center gap-2 bg-muted/50 hover:bg-muted border rounded-lg p-2 pr-1 max-w-xs transition-colors">
            {/* Preview or icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-background flex items-center justify-center">
                {preview && category === 'image' ? (
                    <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="text-muted-foreground">{getIcon()}</div>
                )}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={file.name}>
                    {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {fileTypeName} • {fileSize}
                </p>
            </div>

            {/* Remove button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={onRemove}
                title="Remove file"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
};