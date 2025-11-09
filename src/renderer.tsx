import './index.css';
import { createRoot } from 'react-dom/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

const App = () => {
  return (
    <div className="dark min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">Electron Boilerplate</h1>
        <p className="text-center text-muted-foreground">
          Electron + React + TailwindCSS v3 + TypeScript + Shadcn UI
        </p>

        <div className="space-y-4 p-6 border rounded-lg bg-card">
          <div className="space-y-2">
            <label className="text-sm font-medium">Input Component</label>
            <Input placeholder="Type something..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Button Component</label>
            <div className="flex gap-2">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
            </div>
          </div>

          <div className="flex w-full max-w-md flex-col gap-6">
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>Basic Item</ItemTitle>
                <ItemDescription>
                  A simple item with title and description.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="outline" size="sm">
                  Action
                </Button>
              </ItemActions>
            </Item>
            <Item variant="outline" size="sm" asChild>
              <a href="#">
                <ItemContent>
                  <ItemTitle>Your profile has been verified.</ItemTitle>
                </ItemContent>
              </a>
            </Item>
          </div>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}