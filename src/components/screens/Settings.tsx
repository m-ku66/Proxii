import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useModelStore } from '@/stores/modelStore';
import { refreshAppPricing } from '@/utils/initialization';
import { getCacheStatus, refreshModelPricing } from '@/utils/modelPricing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Plus, X, Search } from 'lucide-react';

export const Settings = () => {
    const { openRouterApiKey, setOpenRouterApiKey } = useSettingsStore();
    const {
        availableModels,
        userModelIds,
        loading: modelsLoading,
        fetchModels,
        addToCollection,
        removeFromCollection,
        isInCollection,
        getUserModels,
    } = useModelStore();

    const [apiKey, setApiKey] = useState(openRouterApiKey || '');
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [cacheStatus, setCacheStatus] = useState(getCacheStatus());
    const [lastRefresh, setLastRefresh] = useState<string | null>(null);
    const [modelSearch, setModelSearch] = useState('');

    // Update cache status on mount and when relevant
    useEffect(() => {
        updateCacheStatus();
    }, []);

    const updateCacheStatus = () => {
        setCacheStatus(getCacheStatus());
    };

    const handleSaveApiKey = async () => {
        setSaving(true);
        try {
            setOpenRouterApiKey(apiKey);
            await refreshAppPricing();

            // Also fetch models with the new key
            await fetchModels(apiKey);

            updateCacheStatus();
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Error saving API key:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleLoadModels = async () => {
        if (!openRouterApiKey) {
            alert('Please add your OpenRouter API key first');
            return;
        }

        await fetchModels(openRouterApiKey);
    };

    // Filter models based on search
    const filteredModels = availableModels.filter((model) =>
        model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
        model.id.toLowerCase().includes(modelSearch.toLowerCase())
    );

    const handleRefreshPricing = async () => {
        if (!openRouterApiKey) {
            alert('Please add your OpenRouter API key first');
            return;
        }

        setRefreshing(true);
        try {
            await refreshModelPricing(openRouterApiKey);
            updateCacheStatus();
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (error) {
            console.error('Error refreshing pricing:', error);
            alert('Failed to refresh pricing. Check console for details.');
        } finally {
            setRefreshing(false);
        }
    };

    // Format cache age to human-readable
    const formatCacheAge = (ageMs?: number): string => {
        if (!ageMs) return 'Unknown';

        const seconds = Math.floor(ageMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    return (
        <div className="max-w-2xl p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Configure your Proxii application
                </p>
            </div>

            {/* API Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>OpenRouter API Key</CardTitle>
                    <CardDescription>
                        Your API key is required for chat functionality and dynamic pricing
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <Input
                            id="api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Get your API key from{' '}
                            <a
                                href="https://openrouter.ai/keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-foreground"
                            >
                                openrouter.ai/keys
                            </a>
                        </p>
                    </div>

                    <Button
                        onClick={handleSaveApiKey}
                        disabled={saving || !apiKey.trim()}
                    >
                        {saving ? 'Saving...' : 'Save API Key'}
                    </Button>
                </CardContent>
            </Card>

            {/* Model Pricing Cache */}
            <Card>
                <CardHeader>
                    <CardTitle>Model Pricing Cache</CardTitle>
                    <CardDescription>
                        Dynamic pricing is fetched from OpenRouter and cached locally
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Cache Status */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                                {cacheStatus.exists ? (
                                    cacheStatus.expired ? (
                                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                                    ) : (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    )
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {cacheStatus.exists
                                            ? cacheStatus.expired
                                                ? 'Cache Expired'
                                                : 'Cache Active'
                                            : 'No Cache'
                                        }
                                    </p>
                                    {cacheStatus.exists && (
                                        <p className="text-xs text-muted-foreground">
                                            {cacheStatus.modelCount} models loaded
                                        </p>
                                    )}
                                </div>
                            </div>
                            {cacheStatus.exists && cacheStatus.age !== undefined && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{formatCacheAge(cacheStatus.age)}</span>
                                </div>
                            )}
                        </div>

                        {lastRefresh && (
                            <p className="text-xs text-muted-foreground">
                                Last refreshed at {lastRefresh}
                            </p>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleRefreshPricing}
                            disabled={refreshing || !openRouterApiKey}
                            variant="outline"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh Pricing'}
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Pricing cache refreshes automatically every 24 hours.
                        Token counts shown in the app are estimates - always verify with your LLM provider for exact billing.
                    </p>
                </CardContent>
            </Card>

            {/* Model Management */}
            <Card>
                <CardHeader>
                    <CardTitle>Model Collection</CardTitle>
                    <CardDescription>
                        Manage which models appear in your chat dropdown
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Load Models Button */}
                    {availableModels.length === 0 && (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-3">
                                Load models from OpenRouter to customize your collection
                            </p>
                            <Button
                                onClick={handleLoadModels}
                                disabled={modelsLoading || !openRouterApiKey}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${modelsLoading ? 'animate-spin' : ''}`} />
                                {modelsLoading ? 'Loading...' : 'Load Models'}
                            </Button>
                        </div>
                    )}

                    {availableModels.length > 0 && (
                        <>
                            {/* Current Collection */}
                            <div>
                                <Label className="text-sm font-medium mb-2 block">
                                    Your Models ({getUserModels().length})
                                </Label>
                                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                                    {getUserModels().map((model) => (
                                        <div
                                            key={model.id}
                                            className="flex items-center justify-between p-2 bg-muted rounded"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{model.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{model.id}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFromCollection(model.id)}
                                                className="ml-2 h-8 w-8 p-0"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {getUserModels().length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No models in your collection. Add some below!
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Add Models */}
                            <div>
                                <Label className="text-sm font-medium mb-2 block">
                                    Available Models ({availableModels.length})
                                </Label>

                                {/* Search */}
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search models..."
                                        value={modelSearch}
                                        onChange={(e) => setModelSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                {/* Model List */}
                                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                                    {filteredModels.map((model) => (
                                        <div
                                            key={model.id}
                                            className="flex items-center justify-between p-2 hover:bg-muted rounded"
                                        >
                                            <div className="flex-1 min-w-0 mr-2">
                                                <p className="text-sm font-medium truncate">{model.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{model.id}</p>
                                            </div>
                                            {isInCollection(model.id) ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled
                                                    className="h-8"
                                                >
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => addToCollection(model.id)}
                                                    className="h-8"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {filteredModels.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No models found matching "{modelSearch}"
                                        </p>
                                    )}
                                </div>

                                <Button
                                    onClick={handleLoadModels}
                                    variant="outline"
                                    size="sm"
                                    disabled={modelsLoading}
                                    className="w-full mt-2"
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${modelsLoading ? 'animate-spin' : ''}`} />
                                    Refresh Models
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};