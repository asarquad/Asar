import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, User, Trophy, Settings, LogOut, Calendar as CalendarIcon, Star } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: FirebaseUser | null;
}

export default function Layout({ user }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // Real-time listener for user data (pfp and admin status)
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserData(data);
        if (data.role === 'admin' || user.email === 'afrajahme2@gmail.com') {
          setIsAdmin(true);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { currentSessionId: null }, { merge: true });
        localStorage.removeItem('user_session_id');
      } catch (err) {
        console.error("Error clearing session on logout:", err);
      }
    }
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/quiz', icon: Star, label: 'Quiz' },
    { path: '/social', icon: CalendarIcon, label: 'Calendar' },
    ...(isAdmin ? [{ path: '/admin', icon: Settings, label: 'Admin' }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-denim">SchoolQuiz</h1>
        <Link to={`/profile/${user?.uid}`} className="relative group">
          <div className="w-10 h-10 rounded-2xl bg-gray-50 border-2 border-gray-100 overflow-hidden transition-all group-hover:border-denim group-active:scale-95">
            {userData?.photoUrl ? (
              <img 
                src={userData.photoUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <User size={20} />
              </div>
            )}
          </div>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                isActive ? "text-denim scale-110" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
