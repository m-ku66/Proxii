import { useUIStore } from '../stores/uiStore';
import { Button } from '../../components/ui/button';
import { Home, MessageSquare, FolderKanban, Settings, X } from 'lucide-react';

export const Sidebar = () => {
    const { activeScreen, setActiveScreen, toggleSidebar } = useUIStore();

    const navItems = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'chats', label: 'Chats', icon: MessageSquare },
        { id: 'projects', label: 'Projects', icon: FolderKanban },
        { id: 'settings', label: 'Settings', icon: Settings },
    ] as const;

    return (
        <div className="flex h-full flex-col p-4">
            {/* Header with close button for mobile */}
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Proxii</h2>
                <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={toggleSidebar}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeScreen === item.id;

                    return (
                        <Button
                            key={item.id}
                            variant={isActive ? 'secondary' : 'ghost'}
                            className="w-full justify-start gap-3"
                            onClick={() => {
                                setActiveScreen(item.id);
                                // Close sidebar on mobile after selection
                                if (window.innerWidth < 1024) {
                                    toggleSidebar();
                                }
                            }}
                        >
                            <Icon className="h-5 w-5" />
                            {item.label}
                        </Button>
                    );
                })}
            </nav>

            {/* Footer info */}
            <div className="mt-auto pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                    Local-first • Private • Secure
                </p>
            </div>
        </div>
    );
};