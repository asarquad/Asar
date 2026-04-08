import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Trophy, Star, Zap, Target, ChevronRight, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export default function Home() {
  const [userData, setUserData] = useState<any>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to user data
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribeUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.data());
      }
    }, (err: any) => {
      console.error("Home Snapshot Error:", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('Quota exceeded')) {
        if (!window.location.search.includes('error=quota')) {
          const newUrl = window.location.pathname + '?error=quota' + window.location.hash;
          window.history.replaceState({}, '', newUrl);
          window.location.reload();
        }
      }
    });

    // Calculate rank (simplified: fetch top 100 and find index)
    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(100));
    getDocs(q).then(snapshot => {
      const index = snapshot.docs.findIndex(doc => doc.id === auth.currentUser?.uid);
      if (index !== -1) {
        setRank(index + 1);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Home Rank Fetch Error:", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('Quota exceeded')) {
        if (!window.location.search.includes('error=quota')) {
          const newUrl = window.location.pathname + '?error=quota' + window.location.hash;
          window.history.replaceState({}, '', newUrl);
          window.location.reload();
        }
      }
      setLoading(false);
    });

    return () => unsubscribeUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-denim"></div>
      </div>
    );
  }

  const nextMilestone = Math.ceil((userData?.xp || 0) / 100) * 100 || 100;
  const progress = ((userData?.xp || 0) % 100);

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-denim tracking-tighter uppercase italic">
          Welcome, {userData?.name?.split(' ')[0] || 'Scholar'}!
        </h2>
        <p className="text-gray-500 font-medium text-sm">Ready to sharpen your mind today?</p>
      </div>

      {/* Stats Overview Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-denim rounded-[2.5rem] p-8 text-white shadow-2xl shadow-denim/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-xl"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Current Rank</p>
              <div className="flex items-center gap-2">
                <Trophy className="text-yellow-400" size={24} />
                <span className="text-4xl font-black italic">#{rank || '--'}</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total XP</p>
              <div className="flex items-center gap-2 justify-end">
                <Star className="text-yellow-400 fill-yellow-400" size={20} />
                <span className="text-3xl font-black">{userData?.xp || 0}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span>Level Progress</span>
              <span>{progress}% to {nextMilestone} XP</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-[0_0_10px_rgba(253,224,71,0.5)]"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/quiz')}
          className="card p-6 bg-wine/10 text-wine border-wine/20 flex flex-col items-center gap-4 group shadow-xl shadow-wine/5"
        >
          <div className="w-12 h-12 bg-wine/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap size={28} className="fill-current" />
          </div>
          <div className="text-center">
            <p className="font-black uppercase text-sm tracking-tight">Start Quiz</p>
            <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Quick Play</p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/leaderboard')}
          className="card p-6 bg-white border-2 border-gray-50 flex flex-col items-center gap-4 group shadow-lg shadow-gray-200/50"
        >
          <div className="w-12 h-12 bg-denim/5 rounded-2xl flex items-center justify-center text-denim group-hover:scale-110 transition-transform">
            <TrendingUp size={28} />
          </div>
          <div className="text-center">
            <p className="font-black uppercase text-sm tracking-tight text-denim">Rankings</p>
            <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">View Board</p>
          </div>
        </motion.button>
      </div>

      {/* Activity Summary */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] px-2">Your Activity</h3>
        <div className="space-y-3">
          <div className="card p-5 flex items-center gap-4 bg-white border-gray-50 shadow-sm">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
              <Target size={24} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">Quizzes Completed</p>
              <p className="text-xs text-gray-400 font-medium">Keep going to reach level 2!</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-denim">{userData?.totalQuizzesPlayed || 0}</p>
            </div>
          </div>

          <div className="card p-5 flex items-center gap-4 bg-white border-gray-50 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Clock size={24} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">Last Session</p>
              <p className="text-xs text-gray-400 font-medium">
                {userData?.lastQuizCompleted ? new Date(userData.lastQuizCompleted).toLocaleDateString() : 'No quizzes yet'}
              </p>
            </div>
            <div className="text-right text-gray-300">
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Subject (Static for now) */}
      <div className="card p-6 bg-gradient-to-br from-ivory to-white border-2 border-wine/5 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-wine/5 rounded-3xl flex items-center justify-center text-wine shadow-inner">
            <BookOpen size={32} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-wine/60">Featured Topic</p>
            <h4 className="text-xl font-black text-gray-800 tracking-tight">World History</h4>
            <button 
              onClick={() => navigate('/quiz')}
              className="text-[10px] font-black uppercase text-wine flex items-center gap-1 hover:gap-2 transition-all"
            >
              Explore Now <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
