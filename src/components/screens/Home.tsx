import { InputComponent } from '../InputComponent';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';

export const Home = () => {
    const { createNewChat, sendMessage } = useChatStore();
    const { setActiveScreen } = useUIStore();

    const handleSubmit = async (
        message: string,
        model: string,
        thinkingEnabled?: boolean,
        options?: {
            temperature: number;
            max_tokens: number;
        },
        files?: File[]
    ) => {
        // Create a new chat with the first message as the title (truncated)
        const title = message.length > 50 ? message.substring(0, 50) + '...' : message;

        // Create the new chat
        createNewChat(title);

        // Get the newly created chat ID (it's the first one now)
        const newChatId = useChatStore.getState().conversations[0]?.id;

        if (newChatId) {
            try {
                // Send the message with files
                await sendMessage(newChatId, message, model, thinkingEnabled, options, files);

                // Navigate to chat room
                setActiveScreen('chatRoom');
            } catch (error) {
                console.error('Failed to send message:', error);
            }
        }
    };

    return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="w-full max-w-3xl space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold">Welcome to Proxii</h1>
                    <p className="text-muted-foreground text-lg">
                        Your local-first AI chat interface
                    </p>
                </div>

                <InputComponent onSubmit={handleSubmit} />
            </div>
        </div>
    );
};