import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DollarSign, Clock, Brain, Eye } from 'lucide-react';
import type { Model } from '@/stores/modelStore';
import { Separator } from './ui/separator';
import { calculateCost } from '@/utils/tokenUtils';


interface ModelInfoTooltipProps {
    model: Model;
    children: React.ReactNode;
}

export const ModelInfoTooltip: React.FC<ModelInfoTooltipProps> = ({ model, children }) => {
    const formatPrice = (modelId: string, isOutput: boolean): string => {
        // Use 1M tokens as the base for display
        const costFor1M = calculateCost(1_000_000, modelId, isOutput);

        if (costFor1M === 0) return '$0';
        if (costFor1M < 0.01) return '<$0.01';
        if (costFor1M >= 1000) return `$${(costFor1M / 1000).toFixed(1)}k`;
        return `$${costFor1M.toFixed(2)}`;
    };

    const formatContextLength = (length: number): string => {
        if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
        if (length >= 1000) return `${Math.round(length / 1000)}k`;
        return length.toString();
    };

    // Detect capabilities
    const hasThinking = model.id.toLowerCase().includes('o1') ||
        model.id.toLowerCase().includes('deepseek') ||
        model.name.toLowerCase().includes('thinking');

    const hasVision = model.architecture?.input_modalities?.includes('image') ||
        model.name.toLowerCase().includes('vision');

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="cursor-help">
                    {children}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80" side="right">
                <div className="space-y-3">
                    <div>
                        <h4 className="font-medium text-sm">{model.id}</h4>
                        {/* <p className="text-xs text-muted-foreground">{model.id}</p> */}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                Input Cost
                            </span>
                            <span className="text-sm font-medium">{formatPrice(model.id, false)}/1M tokens</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-orange-600" />
                                Output Cost
                            </span>
                            <span className="text-sm font-medium">{formatPrice(model.id, true)}/1M tokens</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Context Length
                            </span>
                            <span className="text-sm font-medium">{formatContextLength(model.context_length)} tokens</span>
                        </div>

                        {model.top_provider?.max_completion_tokens && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Max Output</span>
                                <span className="text-sm font-medium">{formatContextLength(model.top_provider.max_completion_tokens)} tokens</span>
                            </div>
                        )}
                    </div>

                    {/* Capabilities */}
                    {(hasThinking || hasVision) && (
                        <div>
                            <h5 className="text-sm font-medium mb-1">Capabilities</h5>
                            <div className="flex gap-1">
                                {hasThinking && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-700 rounded text-xs">
                                        <Brain className="h-3 w-3" />
                                        Thinking
                                    </div>
                                )}
                                {hasVision && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-700 rounded text-xs">
                                        <Eye className="h-3 w-3" />
                                        Vision
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Raw pricing debug (temporary) */}
                    {/* <div className="border-t pt-2 text-xs text-muted-foreground">
                        <div>Raw input: {model.pricing.prompt}</div>
                        <div>Raw output: {model.pricing.completion}</div>
                    </div> */}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default ModelInfoTooltip;