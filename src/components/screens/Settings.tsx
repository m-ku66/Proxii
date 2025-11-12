import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { refreshAppPricing } from '@/utils/initialization';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export const Settings = () => {
    const { openRouterApiKey, setOpenRouterApiKey } = useSettingsStore();
    const [apiKey, setApiKey] = useState(openRouterApiKey || '');
    const [saving, setSaving] = useState(false);

    const handleSaveApiKey = async () => {
        setSaving(true);
        try {
            setOpenRouterApiKey(apiKey);
            await refreshAppPricing(); // Refresh pricing with new key
            // Show success message
        } catch (error) {
            console.error('Error saving API key:', error);
            // Show error message
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="api-key">OpenRouter API Key</Label>
                <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Get your API key from{' '}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">
                        openrouter.ai/keys
                    </a>
                </p>
            </div>

            <Button onClick={handleSaveApiKey} disabled={saving}>
                {saving ? 'Saving...' : 'Save API Key'}
            </Button>
        </div>
    );
};