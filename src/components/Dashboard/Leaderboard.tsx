import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Trophy, Medal, Star, QrCode, Crown, ChevronRight, User as UserIcon, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export default function Leaderboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Check admin status
    if (auth.currentUser) {
      if (auth.currentUser.email === 'afrajahme2@gmail.com') {
        setIsAdmin(true);
      } else {
        getDoc(doc(db, 'users', auth.currentUser.uid)).then(docSnap => {
          if (docSnap.exists() && docSnap.data().role === 'admin') {
            setIsAdmin(true);
          }
        });
      }
    }

    const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-denim"></div>
      </div>
    );
  }

  const topThree = users.slice(0, 3);
  const remainingUsers = users.slice(3);

  // Reorder for podium: [Rank 2, Rank 1, Rank 3]
  const podiumOrder = [
    topThree[1] || null,
    topThree[0] || null,
    topThree[2] || null
  ];

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-denim">
            <Trophy size={28} className="fill-current" />
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Leaderboard</h2>
          </div>
          <p className="text-gray-500 font-medium text-sm">Compete with students globally and rise to the top.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-12 h-12 bg-denim text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-denim/90 transition-all"
            >
              <Shield size={24} />
            </button>
          )}
          <button
            onClick={() => setShowQR(true)}
            className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-denim hover:bg-denim hover:text-white transition-all"
          >
            <QrCode size={24} />
          </button>
        </div>
      </div>

      {/* Podium Section */}
      <div className="relative pt-12 pb-4">
        <div className="flex items-end justify-center gap-2 sm:gap-4 px-2">
          {podiumOrder.map((user, idx) => {
            if (!user) return <div key={idx} className="flex-1" />;
            
            const isFirst = idx === 1;
            const isSecond = idx === 0;
            const isThird = idx === 2;
            const rank = isFirst ? 1 : isSecond ? 2 : 3;

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => navigate(`/profile/${user.uid}`)}
                className={cn(
                  "flex-1 flex flex-col items-center text-center cursor-pointer group",
                  isFirst ? "z-10 -mt-8" : "z-0"
                )}
              >
                <div className="relative mb-3">
                  {isFirst && (
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ repeat: Infinity, duration: 4 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-500"
                    >
                      <Crown size={32} className="fill-current" />
                    </motion.div>
                  )}
                  
                  <div className={cn(
                    "relative rounded-full p-1 transition-transform group-hover:scale-105 shadow-md",
                    isFirst ? "bg-gradient-to-b from-yellow-300 to-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]" : 
                    isSecond ? "bg-gradient-to-b from-gray-200 to-gray-400" : 
                    "bg-gradient-to-b from-amber-500 to-amber-700"
                  )}>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white overflow-hidden border-2 border-white">
                      <img 
                        src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className={cn(
                      "absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white",
                      isFirst ? "bg-yellow-500 text-white" : isSecond ? "bg-gray-400 text-white" : "bg-amber-700 text-white"
                    )}>
                      {rank}
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className={cn("font-black truncate w-24 sm:w-32", isFirst ? "text-lg text-denim" : "text-sm text-gray-700")}>
                    {user.name}
                  </p>
                  <p className={cn("font-black", isFirst ? "text-yellow-600" : isSecond ? "text-gray-500" : "text-amber-700")}>
                    {user.xp} <b>BRAIN GAINS</b>
                  </p>
                </div>

                {/* Podium Base */}
                <div className={cn(
                  "w-full mt-4 rounded-t-2xl shadow-lg",
                  isFirst ? "h-24 bg-gradient-to-b from-yellow-400 to-yellow-600 border-t-2 border-yellow-300" : 
                  isSecond ? "h-16 bg-gradient-to-b from-gray-300 to-gray-500 border-t-2 border-gray-200" : 
                  "h-12 bg-gradient-to-b from-amber-600 to-amber-800 border-t-2 border-amber-500"
                )} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-3">
        {remainingUsers.map((user, index) => {
          const rank = index + 4;
          const isCurrentUser = user.uid === auth.currentUser?.uid;

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/profile/${user.uid}`)}
              className={cn(
                "card flex items-center gap-4 p-4 transition-all cursor-pointer group hover:scale-[1.02]",
                isCurrentUser ? "border-denim ring-2 ring-denim/10 bg-denim/5" : "hover:border-denim/30"
              )}
            >
              <div className="w-8 font-black text-gray-400 text-sm">
                {rank}
              </div>
              
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm shrink-0">
                <img 
                  src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 leading-tight truncate">{user.name}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Level 1</p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-lg font-black text-denim leading-none">{user.xp}</p>
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest"><b>BRAIN GAINS</b></p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-xs text-center space-y-6"
            >
              <h3 className="text-xl font-bold text-denim">My Profile QR</h3>
              <div className="bg-gray-50 p-6 rounded-2xl flex justify-center">
                <QRCodeSVG value={`${window.location.origin}/profile/${auth.currentUser?.uid}`} size={200} />
              </div>
              <p className="text-sm text-gray-500">Others can scan this to view your profile and achievements.</p>
              <button onClick={() => setShowQR(false)} className="btn-primary w-full">
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
