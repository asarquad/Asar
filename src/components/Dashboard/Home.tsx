import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Star, Calendar, Settings, ChevronRight, BookOpen, Activity } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Home() {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
    };
    fetchUserData();
  }, []);

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-butter uppercase tracking-widest">ACADEX</h1>
          <p className="text-butter/60 font-medium mt-1">Welcome back, {userData?.name || auth.currentUser?.displayName || 'Student'}!</p>
        </div>
        <div className="w-16 h-16 bg-butter/10 rounded-2xl flex items-center justify-center border border-butter/20">
          <Activity className="text-butter" size={32} />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <Trophy className="text-forest mb-2" size={32} />
          <p className="text-3xl font-black text-forest">{userData?.xp || 0}</p>
          <p className="text-xs font-bold uppercase text-forest/40 tracking-widest mt-1">Total Brain Gains</p>
        </div>
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <Star className="text-yellow-600 mb-2" size={32} />
          <p className="text-3xl font-black text-forest">{userData?.achievements?.length || 0}</p>
          <p className="text-xs font-bold uppercase text-forest/40 tracking-widest mt-1">Achievements</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-butter/60 uppercase tracking-widest ml-2">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/quiz" className="card p-6 flex items-center justify-between hover:border-forest transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-forest/10 rounded-2xl flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-butter transition-all">
                <BookOpen size={28} />
              </div>
              <div>
                <h2 className="text-lg font-black text-forest">Play Quiz</h2>
                <p className="text-xs font-bold text-forest/60 uppercase tracking-widest mt-1">Test your knowledge</p>
              </div>
            </div>
            <ChevronRight className="text-forest/40 group-hover:text-forest transition-colors" />
          </Link>

          <Link to="/leaderboard" className="card p-6 flex items-center justify-between hover:border-forest transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-forest/10 rounded-2xl flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-butter transition-all">
                <Trophy size={28} />
              </div>
              <div>
                <h2 className="text-lg font-black text-forest">Leaderboard</h2>
                <p className="text-xs font-bold text-forest/60 uppercase tracking-widest mt-1">See top performers</p>
              </div>
            </div>
            <ChevronRight className="text-forest/40 group-hover:text-forest transition-colors" />
          </Link>

          <Link to="/social" className="card p-6 flex items-center justify-between hover:border-forest transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-forest/10 rounded-2xl flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-butter transition-all">
                <Calendar size={28} />
              </div>
              <div>
                <h2 className="text-lg font-black text-forest">Calendar</h2>
                <p className="text-xs font-bold text-forest/60 uppercase tracking-widest mt-1">Upcoming events</p>
              </div>
            </div>
            <ChevronRight className="text-forest/40 group-hover:text-forest transition-colors" />
          </Link>
          
          {userData?.role === 'admin' && (
            <Link to="/admin" className="card p-6 flex items-center justify-between hover:border-forest transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-forest/10 rounded-2xl flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-butter transition-all">
                  <Settings size={28} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-forest">Admin Panel</h2>
                  <p className="text-xs font-bold text-forest/60 uppercase tracking-widest mt-1">Manage platform</p>
                </div>
              </div>
              <ChevronRight className="text-forest/40 group-hover:text-forest transition-colors" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
