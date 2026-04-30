import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastProvider';
import { ToastContainer } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Agenda } from './pages/Agenda';
import { Patients } from './pages/Patients';
import { PatientDetail } from './pages/PatientDetail';
import { Sessions } from './pages/Sessions';
import { Financial } from './pages/Financial';
import { Receipts } from './pages/Receipts';
import { Settings } from './pages/Settings';
import { initializeData } from './utils/storage';

function AppLayout() {
  useEffect(() => {
    initializeData();
  }, []);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f0f4f7' }}>
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col min-h-screen overflow-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/pacientes" element={<Patients />} />
          <Route path="/pacientes/:id" element={<PatientDetail />} />
          <Route path="/sessoes" element={<Sessions />} />
          <Route path="/financeiro" element={<Financial />} />
          <Route path="/recibos" element={<Receipts />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
