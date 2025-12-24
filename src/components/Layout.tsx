import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import { CustomSidebar } from './CustomSidebar';
import { Home } from './screens/Home';
import { Chats } from './screens/Chats';
import { ChatRoom } from './screens/ChatRoom';
import { Projects } from './screens/Projects';
import { ProjectDetail } from './screens/ProjectDetail';
import { Settings } from './screens/Settings';
import { Toaster } from './ui/sonner';

export const Layout = () => {
    const { activeScreen, theme } = useUIStore();

    // 🎨 Sync theme with HTML element
    useEffect(() => {
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        
        console.log(`🎨 Theme applied: ${theme}`);
    }, [theme]);

    const renderScreen = () => {
        switch (activeScreen) {
            case 'home':
                return <Home />;
            case 'chats':
                return <Chats />;
            case 'chatRoom':
                return <ChatRoom />;
            case 'projects':
                return <Projects />;
            case 'projectDetail':
                return <ProjectDetail />;
            case 'settings':
                return <Settings />;
            default:
                return <Home />;
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <CustomSidebar />
            <main className="flex-1 overflow-auto">
                {renderScreen()}
            </main>
            <Toaster position='top-right' offset={{ top: 10, right: 10 }} />
        </div>
    );
};