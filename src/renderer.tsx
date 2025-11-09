import './index.css';
import { createRoot } from 'react-dom/client';
import { Layout } from './components/Layout';

const App = () => {
  return <Layout />;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}