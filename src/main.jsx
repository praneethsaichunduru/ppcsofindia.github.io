import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes.jsx';
import './styles/theme.css';
import './styles/chrome.css';
import './styles/app.css';

export const createRoot = ViteReactSSG({ routes });
