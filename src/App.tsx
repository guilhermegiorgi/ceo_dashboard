import React from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import DashboardLayout from './components/DashboardLayout';

function App() {
  return (
    <LanguageProvider>
      <DashboardLayout />
    </LanguageProvider>
  );
}

export default App;