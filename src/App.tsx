import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import GalleryPage from './pages/GalleryPage';
import ChildhoodPage from './pages/ChildhoodPage';
import VideosPage from './pages/VideosPage';
import VoiceNotesPage from './pages/VoiceNotesPage';
import TimelinePage from './pages/TimelinePage';
import LettersPage from './pages/LettersPage';
import DiaryPage from './pages/DiaryPage';
import CalendarPage from './pages/CalendarPage';
import DatePlansPage from './pages/DatePlansPage';
import BucketListPage from './pages/BucketListPage';
import QuestionsPage from './pages/QuestionsPage';
import CountdownsPage from './pages/CountdownsPage';
import SelfiePage from './pages/SelfiePage';
import CyclePage from './pages/CyclePage';
import SleepTrackerPage from './pages/SleepTrackerPage';
import LocationTrackerPage from './pages/LocationTrackerPage';

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dreamy flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-heartbeat">💗</div>
          <p className="font-handwriting text-2xl text-blush-400">Loading our universe...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/childhood" element={<ChildhoodPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/voices" element={<VoiceNotesPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/letters" element={<LettersPage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/dates" element={<DatePlansPage />} />
        <Route path="/bucket-list" element={<BucketListPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/countdowns" element={<CountdownsPage />} />
        <Route path="/selfie" element={<SelfiePage />} />
        <Route path="/sleep" element={<SleepTrackerPage />} />
        <Route path="/location" element={<LocationTrackerPage />} />
        {/* Cycle tracker — only accessible to manuuu (enforced on server too) */}
        <Route path="/cycle" element={<CyclePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}
