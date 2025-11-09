import { useUIStore } from '../stores/uiStore';
import { Home } from './screens/Home';
import { Chats } from './screens/Chats';
import { ChatRoom } from './screens/ChatRoom';
import { Projects } from './screens/Projects';
import { Settings } from './screens/Settings';
import { Sidebar } from './Sidebar';

export const Layout = () => {
    const { activeScreen, sidebarOpen } = useUIStore();

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
            case 'settings':
                return <Settings />;
            default:
                return <Home />;
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background">
            {/* Sidebar - collapsible on mobile */}
            <aside
                className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed lg:relative lg:translate-x-0
          z-30 h-full w-64 
          border-r border-border bg-card
          transition-transform duration-300 ease-in-out
        `}
            >
                <Sidebar />
            </aside>

            {/* Overlay for mobile when sidebar is open */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => useUIStore.getState().toggleSidebar()}
                />
            )}

            {/* Main content area */}
            <main className="flex-1 overflow-auto">
                <div className="h-full w-full">
                    {renderScreen()}
                </div>
            </main>
        </div>
    );
};