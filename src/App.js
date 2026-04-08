import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import PrayerCalendar from './components/PrayerCalendar';
import Progress from './components/Progress';
import Profile from './components/Profile';
import Leaderboard from './components/Leaderboard';
import Rules from './components/Rules';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import UpdateNotification from './components/UpdateNotification';
import { AppShell } from './components/AppShell';
import './App.css';
import { OnlineStatusProvider, useOnlineStatus } from './contexts/OnlineStatusContext';

function AppContent() {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('calendar');
  const { online } = useOnlineStatus();

  if (!currentUser) {
    return <Login />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'calendar':
        return <PrayerCalendar />;
      case 'progress':
        return <Progress />;
      case 'profile':
        return <Profile />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'rules':
        return <Rules />;
      default:
        return <PrayerCalendar />;
    }
  };

  return (
    <>
      <UpdateNotification />
      <AppShell
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        online={online}
      >
        {renderCurrentPage()}
      </AppShell>
      <PWAInstallPrompt />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OnlineStatusProvider>
          <AppContent />
        </OnlineStatusProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
