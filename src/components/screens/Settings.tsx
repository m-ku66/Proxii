import { useState, useEffect } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { refreshAppPricing } from '@/utils/initialization';
import { getCacheStatus, refreshModelPricing } from '@/utils/modelPricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Plus, X, Search, Sun, Moon } from 'lucide-react';
import ModelInfoTooltip from '../ModelInfoTooltip';

export const Settings = () => {
    const {
        availableModels,
        loading: modelsLoading,
        fetchModels,
        addToCollection,
        removeFromCollection,
        isInCollection,
        getUserModels,
    } = useModelStore();

    const {
        openRouterApiKey,
        setOpenRouterApiKey,
        systemPrompt,
        setSystemPrompt,
        maxContextMessages,
        maxMessagesWithImages,
        setMaxContextMessages,
        setMaxMessagesWithImages,
    } = useSettingsStore();

    const {
        theme,
        setTheme,
    } = useUIStore();

    const [apiKey, setApiKey] = useState(openRouterApiKey || '');
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [cacheStatus, setCacheStatus] = useState(getCacheStatus());
    const [lastRefresh, setLastRefresh] = useState<string | null>(null);
    const [modelSearch, setModelSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'api' | 'models' | 'prompting' | 'appearance'>('api');

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

    // Get theme icon
    const getThemeIcon = (themeValue: typeof theme) => {
        switch (themeValue) {
            case 'light':
                return <Sun className="h-4 w-4" />;
            case 'dark':
                return <Moon className="h-4 w-4" />;
        }
    };

    return (
        <div className="max-w-2xl p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Configure your Proxii application
                </p>
            </div>

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                <TabsList>
                    <TabsTrigger value="api">API & Pricing</TabsTrigger>
                    <TabsTrigger value="models">Model Collection</TabsTrigger>
                    <TabsTrigger value="prompting">Prompting</TabsTrigger>
                    <TabsTrigger value="appearance">Appearance</TabsTrigger>
                </TabsList>

                {/* API & Pricing Tab */}
                <TabsContent value="api" className="space-y-6">
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
                                <p className="text-xs text-muted-foreground">
                                    If Openrouter is your LLM provider, you can get accurate usage costs via the link above
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
                                        {cacheStatus.exists && !cacheStatus.expired ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                <div>
                                                    <p className="text-sm font-medium">Cache Valid</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {cacheStatus.modelCount || 0} models cached
                                                    </p>
                                                </div>
                                            </>
                                        ) : cacheStatus.exists ? (
                                            <>
                                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                                <div>
                                                    <p className="text-sm font-medium">Cache Expired</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Please refresh pricing data
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium">No Cache</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Save API key to fetch pricing
                                                    </p>
                                                </div>
                                            </>
                                        )}
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
                </TabsContent>

                {/* Model Collection Tab */}
                <TabsContent value="models" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Collection</CardTitle>
                            <CardDescription>
                                Manage which models appear in your chat dropdown. Click on models in the search list to see extra information about them.
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
                                                <ModelInfoTooltip key={model.id} model={model}>  <div
                                                    className="flex items-center justify-between p-2 bg-muted rounded"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{model.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {model.id}
                                                        </p>

                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeFromCollection(model.id)}
                                                        className="ml-2 h-8 w-8 p-0"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div></ModelInfoTooltip>
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
                                                <ModelInfoTooltip key={model.id} model={model}>
                                                    <div className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors">
                                                        <div className="flex-1 min-w-0">
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
                                                </ModelInfoTooltip>

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
                </TabsContent>

                {/* Prompting Tab */}
                <TabsContent value="prompting" className="space-y-6">
                    {/* Global System Prompt */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Global System Prompt</CardTitle>
                            <CardDescription>
                                This prompt will be prepended to every conversation you start
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Textarea
                                    id="system-prompt"
                                    placeholder="Write prompts in third person e.g 'You are a helpful assistant that...'"
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="min-h-[200px] resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {systemPrompt.length} characters
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Context Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Context Management</CardTitle>
                            <CardDescription>
                                Control how much conversation history is sent to the AI
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Max Context Messages */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="max-context" className="text-sm font-medium">
                                        Maximum Messages in Context
                                    </Label>
                                    <span className="text-sm font-mono text-muted-foreground">
                                        {maxContextMessages}
                                    </span>
                                </div>
                                <Slider
                                    id="max-context"
                                    min={5}
                                    max={50}
                                    step={1}
                                    value={[maxContextMessages]}
                                    onValueChange={([value]) => setMaxContextMessages(value)}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Limits how many messages are sent to the API. Lower values reduce costs and prevent payload size errors, but may lose older context.
                                </p>
                            </div>

                            {/* Max Messages With Images */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="max-images" className="text-sm font-medium">
                                        Messages That Can Include Images
                                    </Label>
                                    <span className="text-sm font-mono text-muted-foreground">
                                        {maxMessagesWithImages}
                                    </span>
                                </div>
                                <Slider
                                    id="max-images"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={[maxMessagesWithImages]}
                                    onValueChange={([value]) => setMaxMessagesWithImages(value)}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Only the most recent messages will include images. Older messages keep their text but images are stripped to reduce payload size.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Appearance Tab */}
                <TabsContent value="appearance" className="space-y-6">
                    {/* Theme Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Theme</CardTitle>
                            <CardDescription>
                                Choose how Proxii looks on your device
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="theme-select">Color Mode</Label>
                                <Select value={theme} onValueChange={(value: typeof theme) => setTheme(value)}>
                                    <SelectTrigger id="theme-select" className="w-full">
                                        <div className="flex items-center gap-2">
                                            {getThemeIcon(theme)}
                                            <SelectValue />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">
                                            <div className="flex items-center gap-2">
                                                <span>Light</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="dark">
                                            <div className="flex items-center gap-2">
                                                <span>Dark</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Preview */}
                            <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                                <p className="text-sm font-medium mb-3">Preview</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded bg-primary" />
                                        <span className="text-sm">Primary</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded bg-secondary" />
                                        <span className="text-sm">Secondary</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded bg-accent" />
                                        <span className="text-sm">Accent</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Future Customization Placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Customization</CardTitle>
                            <CardDescription>
                                Additional appearance options
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <p className="text-muted-foreground mb-2">
                                    Additional customization options coming soon
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Custom themes, font sizing, and more
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
};