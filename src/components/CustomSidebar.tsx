import { motion } from 'motion/react';
import { useUIStore } from '../stores/uiStore';
import { Home, MessageSquare, FolderKanban, Settings, PanelLeft, PanelLeftClose } from 'lucide-react';
import { Button } from './ui/button';

export const CustomSidebar = () => {
    const { activeScreen, setActiveScreen, sidebarOpen, toggleSidebar } = useUIStore();

    const navItems = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'chats', label: 'Chats', icon: MessageSquare },
        { id: 'projects', label: 'Projects', icon: FolderKanban },
        { id: 'settings', label: 'Settings', icon: Settings },
    ] as const;

    return (
        <motion.aside
            initial={false}
            animate={{
                width: sidebarOpen ? '16rem' : '4rem',
            }}
            transition={{
                duration: 0.3,
                ease: 'easeInOut',
            }}
            className="relative flex h-full flex-col border-r border-border bg-card"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
                <motion.h2
                    initial={false}
                    animate={{
                        opacity: sidebarOpen ? 1 : 0,
                        display: sidebarOpen ? 'block' : 'none',
                    }}
                    transition={{ duration: 0.2 }}
                    className="text-xl font-bold"
                >
                    Proxii
                </motion.h2>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="ml-auto shrink-0"
                >
                    {sidebarOpen ? (
                        <PanelLeftClose className="h-5 w-5" />
                    ) : (
                        <PanelLeft className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeScreen === item.id;

                    return (
                        <Button
                            key={item.id}
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={`w-full justify-start gap-3 ${!sidebarOpen && 'justify-center px-2'}`}
                            onClick={() => setActiveScreen(item.id)}
                            title={!sidebarOpen ? item.label : undefined}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            <motion.span
                                initial={false}
                                animate={{
                                    opacity: sidebarOpen ? 1 : 0,
                                    width: sidebarOpen ? 'auto' : 0,
                                }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden whitespace-nowrap"
                            >
                                {item.label}
                            </motion.span>
                        </Button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-border p-4">
                <motion.p
                    initial={false}
                    animate={{
                        opacity: sidebarOpen ? 1 : 0,
                        height: sidebarOpen ? 'auto' : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden text-xs text-muted-foreground"
                >
                    Local-first • Private • Secure
                </motion.p>
            </div>
        </motion.aside>
    );
};