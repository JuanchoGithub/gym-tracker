import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { I18nProvider } from './contexts/I18nContext';
import { TimerProvider } from './contexts/TimerContext';
import { ActiveWorkoutProvider } from './contexts/ActiveWorkoutContext';
import { StatsProvider } from './contexts/StatsContext';
import { UserProvider } from './contexts/UserContext';
import { DataProvider } from './contexts/DataContext';
import { SupplementProvider } from './contexts/SupplementContext';
import { EditorProvider } from './contexts/EditorContext';
import { AuthProvider } from './contexts/AuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <UserProvider>
          <DataProvider>
            <EditorProvider>
              <SupplementProvider>
                <TimerProvider>
                  <AppProvider>
                    <ActiveWorkoutProvider>
                      <StatsProvider>
                        <App />
                      </StatsProvider>
                    </ActiveWorkoutProvider>
                  </AppProvider>
                </TimerProvider>
              </SupplementProvider>
            </EditorProvider>
          </DataProvider>
        </UserProvider>
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>
);