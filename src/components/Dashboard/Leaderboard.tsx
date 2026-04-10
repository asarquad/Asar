import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Trophy, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-butter"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto pb-32">
      <div className="text-center space-y-2 mb-12">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="text-yellow-500" size={32} />
          <h1 className="text-3xl md:text-4xl font-black text-butter uppercase tracking-widest italic">LEADERBOARD</h1>
        </div>
        <p className="text-butter/60 font-medium">Compete with students globally and rise to the top.</p>
      </div>

      {users.length >= 3 && (
        <div className="flex justify-center items-end gap-2 md:gap-6 mb-16 mt-16">
          {/* 2nd Place */}
          {users[1] && (
            <div className="flex flex-col items-center relative z-10 w-24 md:w-32">
              <div className="relative mb-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-gray-400 bg-forest overflow-hidden flex items-center justify-center">
                  {users[1].photoUrl ? (
                    <img src={users[1].photoUrl} className="w-full h-full object-cover" alt={users[1].name} />
                  ) : (
                    <span className="text-2xl font-black text-gray-400">{users[1].name.charAt(0)}</span>
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 md:w-8 md:h-8 bg-gray-400 rounded-full flex items-center justify-center text-forest font-black text-xs md:text-sm border-2 border-forest">2</div>
              </div>
              <p className="font-bold text-butter text-xs md:text-sm truncate w-full text-center">{users[1].name}</p>
              <p className="text-[10px] md:text-xs font-black text-gray-400 mb-2">{users[1].xp} XP</p>
              <div className="w-full h-24 md:h-32 bg-butter/5 rounded-t-2xl border-t border-x border-butter/10"></div>
            </div>
          )}

          {/* 1st Place */}
          {users[0] && (
            <div className="flex flex-col items-center relative z-20 w-28 md:w-36 -mt-8">
              <Crown className="text-yellow-500 mb-2" size={32} />
              <div className="relative mb-3">
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-yellow-500 bg-forest overflow-hidden flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                  {users[0].photoUrl ? (
                    <img src={users[0].photoUrl} className="w-full h-full object-cover" alt={users[0].name} />
                  ) : (
                    <span className="text-3xl font-black text-yellow-500">{users[0].name.charAt(0)}</span>
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 md:w-10 md:h-10 bg-yellow-500 rounded-full flex items-center justify-center text-forest font-black text-sm md:text-base border-2 border-forest">1</div>
              </div>
              <p className="font-bold text-butter text-sm md:text-base truncate w-full text-center">{users[0].name}</p>
              <p className="text-xs md:text-sm font-black text-yellow-500 mb-2">{users[0].xp} XP</p>
              <div className="w-full h-32 md:h-40 bg-yellow-500/10 rounded-t-2xl border-t border-x border-yellow-500/30"></div>
            </div>
          )}

          {/* 3rd Place */}
          {users[2] && (
            <div className="flex flex-col items-center relative z-10 w-24 md:w-32">
              <div className="relative mb-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-amber-600 bg-forest overflow-hidden flex items-center justify-center">
                  {users[2].photoUrl ? (
                    <img src={users[2].photoUrl} className="w-full h-full object-cover" alt={users[2].name} />
                  ) : (
                    <span className="text-2xl font-black text-amber-600">{users[2].name.charAt(0)}</span>
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 md:w-8 md:h-8 bg-amber-600 rounded-full flex items-center justify-center text-forest font-black text-xs md:text-sm border-2 border-forest">3</div>
              </div>
              <p className="font-bold text-butter text-xs md:text-sm truncate w-full text-center">{users[2].name}</p>
              <p className="text-[10px] md:text-xs font-black text-amber-600 mb-2">{users[2].xp} XP</p>
              <div className="w-full h-20 md:h-24 bg-butter/5 rounded-t-2xl border-t border-x border-butter/10"></div>
            </div>
          )}
        </div>
      )}

      {/* Fallback if less than 3 users */}
      {users.length > 0 && users.length < 3 && (
        <div className="space-y-3 mb-8">
          {users.map((user, index) => (
             <Link 
              key={user.id} 
              to={`/profile/${user.id}`}
              className="flex items-center gap-4 bg-butter/5 hover:bg-butter/10 border border-butter/10 rounded-3xl p-4 transition-all"
            >
              <div className="w-8 font-black text-butter/40 text-center">
                {index + 1}
              </div>
              
              <div className="w-12 h-12 rounded-full bg-butter/10 overflow-hidden shrink-0 flex items-center justify-center">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-butter/60">{user.name.charAt(0)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-butter truncate">{user.name}</h3>
                <p className="text-[10px] font-bold text-butter/40 uppercase tracking-widest truncate">LEVEL {Math.floor((user.xp || 0) / 100) + 1}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-black text-butter text-lg">{user.xp}</p>
                <p className="text-[10px] uppercase tracking-widest text-butter/40 font-bold">XP</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {users.slice(3).map((user, index) => (
          <Link 
            key={user.id} 
            to={`/profile/${user.id}`}
            className="flex items-center gap-4 bg-butter/5 hover:bg-butter/10 border border-butter/10 rounded-3xl p-4 transition-all"
          >
            <div className="w-8 font-black text-butter/40 text-center">
              {index + 4}
            </div>
            
            <div className="w-12 h-12 rounded-full bg-butter/10 overflow-hidden shrink-0 flex items-center justify-center">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-butter/60">{user.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-butter truncate">{user.name}</h3>
              <p className="text-[10px] font-bold text-butter/40 uppercase tracking-widest truncate">LEVEL {Math.floor((user.xp || 0) / 100) + 1}</p>
            </div>

            <div className="text-right shrink-0">
              <p className="font-black text-butter text-lg">{user.xp}</p>
              <p className="text-[10px] uppercase tracking-widest text-butter/40 font-bold">XP</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
