import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
    language?: string;
    children: string;
    inline?: boolean;
}

export const CodeBlock = ({ language, children, inline }: CodeBlockProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Inline code (single backticks)
    if (inline) {
        return (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono border border-border">
                {children}
            </code>
        );
    }

    // Block code (triple backticks)
    return (
        <div className="relative group my-4">
            {/* Language label and copy button */}
            <div className="flex items-center justify-between bg-muted/50 border-b border-border px-4 py-2 rounded-t-lg">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                    {language || 'plaintext'}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-2 opacity-70 hover:opacity-100 transition-opacity"
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-xs">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4 mr-1" />
                            <span className="text-xs">Copy</span>
                        </>
                    )}
                </Button>
            </div>

            {/* Code content */}
            <SyntaxHighlighter
                language={language || 'plaintext'}
                style={oneDark}
                customStyle={{
                    margin: 0,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: '0.5rem',
                    borderBottomRightRadius: '0.5rem',
                    fontSize: '0.875rem',
                    border: '1px solid hsl(var(--border))',
                    borderTop: 'none',
                }}
                showLineNumbers
            >
                {children}
            </SyntaxHighlighter>
        </div>
    );
};
