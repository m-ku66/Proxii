import { useUIStore } from '../stores/uiStore';
import { CustomSidebar } from './CustomSidebar';
import { Home } from './screens/Home';
import { Chats } from './screens/Chats';
import { ChatRoom } from './screens/ChatRoom';
import { Projects } from './screens/Projects';
import { Settings } from './screens/Settings';

export const Layout = () => {
    const { activeScreen } = useUIStore();

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
        <div className="flex h-screen w-full overflow-hidden">
            <CustomSidebar />
            <main className="flex-1 overflow-auto">
                {renderScreen()}
            </main>
        </div>
    );
};