import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { seedAdminStudents, seedQuestions } from './seed';
import Login from './components/Auth/Login';
import Home from './components/Dashboard/Home';
import Leaderboard from './components/Dashboard/Leaderboard';
import Profile from './components/Profile/Profile';
import QuizGame from './components/Quiz/QuizGame';
import AdminPanel from './components/Admin/AdminPanel';
import Calendar from './components/Social/Social';
import Layout from './components/Layout';
import ErrorBoundary from './components/Common/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Seed test students once if needed
    const hasSeeded = localStorage.getItem('hasSeededQuestionsFull_v1');
    if (!hasSeeded) {
      seedQuestions().then(() => {
        seedAdminStudents().then(() => {
          localStorage.setItem('hasSeededQuestionsFull_v1', 'true');
        });
      });
    }

    let sessionUnsubscribe: (() => void) | null = null;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous session listener and heartbeat
      if (sessionUnsubscribe) {
        sessionUnsubscribe();
        sessionUnsubscribe = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      if (currentUser) {
        try {
          // 1. Initial check for ban status
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userDataSnapshot = userDoc.data();
            if (userDataSnapshot.isBanned) {
              await auth.signOut();
              setUser(null);
              alert('Your account has been banned.');
              setLoading(false);
              return;
            }

            // 2. Aggressively ensure basic fields exist for leaderboard and tracking
            const needsRepair = userDataSnapshot.xp === undefined || 
                                typeof userDataSnapshot.xp !== 'number' ||
                                !userDataSnapshot.achievements ||
                                userDataSnapshot.totalQuizzesPlayed === undefined ||
                                userDataSnapshot.totalQuestionsAttended === undefined ||
                                userDataSnapshot.cycleScore === undefined;
            
            let localSessionId = localStorage.getItem('user_session_id');
            if (!localSessionId) {
              localSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
              localStorage.setItem('user_session_id', localSessionId);
            }

            // Only update if session changed or fields are missing
            if (needsRepair || userDataSnapshot.currentSessionId !== localSessionId) {
              const updates: any = {
                currentSessionId: localSessionId,
                lastActive: new Date().toISOString()
              };

              // Only set missing fields to avoid overwriting with stale data
              if (userDataSnapshot.xp === undefined) updates.xp = 0;
              if (!userDataSnapshot.achievements) updates.achievements = [];
              if (userDataSnapshot.consecutiveWrongAnswers === undefined) updates.consecutiveWrongAnswers = 0;
              if (userDataSnapshot.totalQuizzesPlayed === undefined) updates.totalQuizzesPlayed = 0;
              if (userDataSnapshot.totalQuestionsAttended === undefined) updates.totalQuestionsAttended = 0;
              if (userDataSnapshot.cycleScore === undefined) updates.cycleScore = 0;
              if (!userDataSnapshot.lastUsernameChange) updates.lastUsernameChange = new Date().toISOString();

              await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
            }

            // 3. Start Heartbeat (update lastActive every 15 minutes to save quota)
            heartbeatInterval = setInterval(async () => {
              try {
                // If we already know quota is hit, don't even try
                if (window.location.search.includes('error=quota')) return;

                // Only update if tab is visible and user is logged in
                if (auth.currentUser && document.visibilityState === 'visible') {
                  await setDoc(doc(db, 'users', auth.currentUser.uid), { 
                    lastActive: new Date().toISOString() 
                  }, { merge: true });
                }
              } catch (err: any) {
                if (err.code === 'resource-exhausted') {
                  console.warn("Firestore Quota Exceeded: Heartbeat skipped.");
                  if (!window.location.search.includes('error=quota')) {
                    const newUrl = window.location.pathname + '?error=quota' + window.location.hash;
                    window.history.replaceState({}, '', newUrl);
                  }
                } else {
                  console.warn("Heartbeat failed:", err);
                }
              }
            }, 900000); // 15 minutes
          }

          // 4. Set up real-time session and ban monitoring
          sessionUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const localSessionId = localStorage.getItem('user_session_id');

              // Check for ban
              if (data.isBanned) {
                if (sessionUnsubscribe) sessionUnsubscribe();
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                await auth.signOut();
                setUser(null);
                alert('Your account has been banned.');
                return;
              }

              // Check for other device login
              if (data.currentSessionId && localSessionId && data.currentSessionId !== localSessionId) {
                // Only kick out if the other session is actually "active" (updated in last 2 mins)
                const lastActive = data.lastActive ? new Date(data.lastActive).getTime() : 0;
                const now = Date.now();
                if (now - lastActive < 120000) { // 2 minutes
                  if (sessionUnsubscribe) sessionUnsubscribe();
                  if (heartbeatInterval) clearInterval(heartbeatInterval);
                  await auth.signOut();
                  setUser(null);
                  alert('You have been logged out because your account was logged in on another device.');
                  return;
                }
              }
            }
          });

          setUser(currentUser);
        } catch (err) {
          console.error("Error checking user status:", err);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (sessionUnsubscribe) sessionUnsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, []);

  const isQuotaExceeded = window.location.search.includes('error=quota');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ivory">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-denim"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="mobile-container relative">
          {/* Quota Warning Overlay */}
          <AnimatePresence>
            {isQuotaExceeded && (
              <motion.div 
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed top-4 left-4 right-4 z-[100] bg-orange-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border-2 border-white/20 backdrop-blur-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-tight">Daily Limit Reached</p>
                    <p className="text-[10px] opacity-90 font-bold uppercase tracking-widest leading-tight">Server is resting. Try again tomorrow!</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const newUrl = window.location.pathname + window.location.hash;
                    window.history.replaceState({}, '', newUrl);
                    window.location.reload();
                  }}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            
            <Route element={<Layout user={user} />}>
              <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
              <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/login" />} />
              <Route path="/profile/:uid" element={user ? <Profile /> : <Navigate to="/login" />} />
              <Route path="/quiz" element={user ? <QuizGame /> : <Navigate to="/login" />} />
              <Route path="/social" element={user ? <Calendar /> : <Navigate to="/login" />} />
              <Route path="/admin" element={user ? <AdminPanel /> : <Navigate to="/login" />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

