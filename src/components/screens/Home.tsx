import { InputComponent } from '../InputComponent';

export const Home = () => {
    const handleSubmit = (message: string, model: string) => {
        console.log('Message:', message);
        console.log('Model:', model);
        // TODO: Handle message submission
    };

    const handleFileUpload = (file: File) => {
        console.log('File uploaded:', file.name);
        // TODO: Handle file upload
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

                <InputComponent
                    onSubmit={handleSubmit}
                    onFileUpload={handleFileUpload}
                />
            </div>
        </div>
    );
};