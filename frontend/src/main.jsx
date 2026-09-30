import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import App from './App';
import './index.css';
import './details.css';
import './battle.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000, refetchOnWindowFocus: true } } });
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><MotionConfig reducedMotion="user"><App /></MotionConfig></BrowserRouter></QueryClientProvider></React.StrictMode>);
