import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import UploadPage from './pages/UploadPage';
import StudentsPage from './pages/StudentsPage';
import { UploadProvider } from './context/UploadContext';

export default function App() {
  return (
    <BrowserRouter>
      <UploadProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </UploadProvider>
    </BrowserRouter>
  );
}
