import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Layout from './components/Layout';
import Login from './components/Auth/Login';
import Home from './components/Dashboard/Home';
import Leaderboard from './components/Dashboard/Leaderboard';
import QuizGame from './components/Quiz/QuizGame';
import Profile from './components/Profile/Profile';
import AdminPanel from './components/Admin/AdminPanel';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Social from './components/Social/Social';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-butter">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-forest"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Layout user={user} /> : <Navigate to="/login" />}>
            <Route index element={<Home />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="quiz" element={<QuizGame />} />
            <Route path="profile/:uid" element={<Profile />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="social" element={<Social />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
