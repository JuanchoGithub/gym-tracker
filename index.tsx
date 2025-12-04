
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { I18nProvider } from './contexts/I18nContext';
import { TimerProvider } from './contexts/TimerContext';
import { ActiveWorkoutProvider } from './contexts/ActiveWorkoutContext';
import { StatsProvider } from './contexts/StatsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <TimerProvider>
        <AppProvider>
          <ActiveWorkoutProvider>
            <StatsProvider>
              <App />
            </StatsProvider>
          </ActiveWorkoutProvider>
        </AppProvider>
      </TimerProvider>
    </I18nProvider>
  </React.StrictMode>
);
