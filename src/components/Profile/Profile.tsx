import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot, setDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../firebase';
import { User, Shield, Trophy, Star, QrCode, Scan, Edit2, CheckCircle, AlertCircle, Camera, LogOut, Sparkles, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Profile() {
  const { uid } = useParams();
  const [userData, setUserData] = useState<any>(null);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    studentId: '',
    roll: '',
    grade: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isUploading, setIsUploading] = useState<'pfp' | 'banner' | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const navigate = useNavigate();

  const isOwnProfile = currentUser?.uid === uid;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) return;
    
    // Use onSnapshot for real-time updates (important for Brain Gains feedback)
    const unsubscribe = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserData(data);
        setEditData({
          username: data.username || '',
          studentId: data.studentId || '',
          roll: data.roll || '',
          grade: data.grade || '',
          phone: data.phone || ''
        });
      }
      setLoading(false);
    }, (err: any) => {
      console.error("Profile: Failed to fetch user data:", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('Quota exceeded')) {
        if (!window.location.search.includes('error=quota')) {
          const newUrl = window.location.pathname + '?error=quota' + window.location.hash;
          window.history.replaceState({}, '', newUrl);
          window.location.reload();
        }
      }
      setLoading(false);
    });

    // Fetch quiz history
    const historyQuery = query(
      collection(db, 'users', uid, 'quizAttempts'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const historyUnsubscribe = onSnapshot(historyQuery, (snapshot) => {
      const attempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizAttempts(attempts);
    }, (err: any) => {
      console.error("Profile History Error:", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('Quota exceeded')) {
        if (!window.location.search.includes('error=quota')) {
          const newUrl = window.location.pathname + '?error=quota' + window.location.hash;
          window.history.replaceState({}, '', newUrl);
          window.location.reload();
        }
      }
    });

    return () => {
      unsubscribe();
      historyUnsubscribe();
    };
  }, [uid]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      scanner.render((decodedText) => {
        try {
          const profileUrl = new URL(decodedText);
          const profileUid = profileUrl.pathname.split('/').pop();
          if (profileUid) {
            scanner.clear().catch(err => console.error("Failed to clear scanner", err));
            setShowScanner(false);
            navigate(`/profile/${profileUid}`);
          }
        } catch (e) {
          console.error("Invalid QR code URL", e);
        }
      }, (error) => {
        // console.warn(error);
      });
      return () => {
        scanner.clear().catch(err => console.error("Failed to clear scanner", err));
      };
    }
  }, [showScanner, navigate]);

  const handleUpdateProfile = async () => {
    if (!uid || !userData) return;
    
    // Check username change limit (14 days)
    if (editData.username !== userData.username) {
      const lastChange = new Date(userData.lastUsernameChange);
      const now = new Date();
      const diffDays = Math.ceil(Math.abs(now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 14) {
        setError(`You can only change your username once every 14 days. ${14 - diffDays} days left.`);
        return;
      }

      // Check unique username
      const q = query(collection(db, 'users'), where('username', '==', editData.username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError('Username already taken.');
        return;
      }
    }

    try {
      const updatePayload: any = {
        username: editData.username,
        studentId: editData.studentId,
        roll: editData.roll,
        grade: editData.grade,
        phone: editData.phone
      };

      if (editData.username !== userData.username) {
        updatePayload.lastUsernameChange = new Date().toISOString();
      }

      await updateDoc(doc(db, 'users', uid), updatePayload);
      setUserData({ ...userData, ...updatePayload });
      setIsEditing(false);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRepairXP = async () => {
    if (!uid || !userData) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', uid), {
        xp: typeof userData.xp === 'number' ? userData.xp : 0,
        achievements: userData.achievements || [],
        consecutiveWrongAnswers: 0,
        totalQuizzesPlayed: userData.totalQuizzesPlayed || 0,
        lastActive: new Date().toISOString()
      }, { merge: true });
      setError('');
      alert('Brain Gains system repaired successfully!');
    } catch (err: any) {
      setError(`Repair failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pfp' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    // Check file size (max 1MB for Base64 storage)
    if (file.size > 1024 * 1024) {
      setError('File is too large. For best performance, please use an image under 1MB.');
      return;
    }

    setIsUploading(type);
    setUploadStatus('Processing image...');
    
    try {
      console.log(`Starting ${type} conversion to Base64...`);
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64String = await base64Promise;
      console.log('Image converted to Base64 successfully');
      
      setUploadStatus('Saving to database...');
      const updatePayload = type === 'pfp' ? { photoUrl: base64String } : { bannerUrl: base64String };
      
      await updateDoc(doc(db, 'users', uid), updatePayload);
      console.log('Firestore document updated with Base64 image');
      
      setUserData((prev: any) => ({ ...prev, ...updatePayload }));
      setError('');
      setUploadStatus('');
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(`Failed to save ${type}: ${err.message}`);
      setUploadStatus('');
    } finally {
      setIsUploading(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-denim"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold">User not found</h2>
        <button onClick={() => navigate('/')} className="btn-primary mt-4">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 pb-24">
      <div className="relative">
        {/* Banner */}
        <div className="h-32 bg-denim rounded-3xl overflow-hidden shadow-lg relative group">
          {userData.bannerUrl ? (
            <img src={userData.bannerUrl} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          )}
          
          {isOwnProfile && (
            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
              {isUploading === 'banner' ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                  <span className="text-white text-xs font-bold drop-shadow-md">{uploadStatus}</span>
                </div>
              ) : (
                <Camera className="text-white" size={32} />
              )}
            </label>
          )}
        </div>

        {/* Profile Info Overlay */}
        <div className="absolute -bottom-12 left-6 flex items-end gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl overflow-hidden">
              <img 
                src={userData.photoUrl || `https://ui-avatars.com/api/?name=${userData.name}&background=random`} 
                alt={userData.name} 
                className="w-full h-full object-cover rounded-2xl" 
                referrerPolicy="no-referrer"
              />
            </div>
            
            {isOwnProfile && (
              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-3xl">
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'pfp')} />
                {isUploading === 'pfp' ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                    <span className="text-white text-[8px] font-bold drop-shadow-md whitespace-nowrap">{uploadStatus}</span>
                  </div>
                ) : (
                  <Camera className="text-white" size={24} />
                )}
              </label>
            )}
          </div>
          <div className="mb-2">
            <h2 className="text-2xl font-black text-white drop-shadow-md">{userData.name}</h2>
            <p className="text-white/80 font-bold text-sm drop-shadow-sm">@{userData.username}</p>
          </div>
        </div>
      </div>

      <div className="pt-12 space-y-6">
        <div className="flex gap-4">
          <div className="flex-1 card flex flex-col items-center justify-center py-6 text-center">
            <Trophy className="text-denim mb-2" size={24} />
            <p className="text-2xl font-black text-denim">{userData.xp}</p>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Total <b>BRAIN GAINS</b></p>
          </div>
          <div className="flex-1 card flex flex-col items-center justify-center py-6 text-center">
            <Star className="text-yellow-500 mb-2" size={24} />
            <p className="text-2xl font-black text-gray-800">{userData.achievements?.length || 0}</p>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Achievements</p>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <User size={18} className="text-denim" />
              Student Information
            </h3>
            {isOwnProfile && (
              <div className="flex flex-col gap-2">
                <button onClick={() => setIsEditing(!isEditing)} className="text-denim hover:text-denim-dark transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
                  <Edit2 size={14} />
                  Edit Profile
                </button>
                <button 
                  onClick={handleRepairXP}
                  className="text-wine hover:text-wine-dark transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100"
                >
                  <Sparkles size={12} />
                  Repair Brain Gains
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Student ID</p>
              {isEditing ? (
                <input
                  type="text"
                  className="input-field py-1 px-2 text-sm mt-1"
                  value={editData.studentId}
                  onChange={(e) => setEditData({ ...editData, studentId: e.target.value })}
                />
              ) : (
                <p className="font-bold text-gray-800">
                  {isOwnProfile || currentUser?.email === 'afrajahme2@gmail.com' ? (userData.studentId || 'Not set') : '••••••••'}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Roll Number</p>
              {isEditing ? (
                <input
                  type="text"
                  className="input-field py-1 px-2 text-sm mt-1"
                  value={editData.roll}
                  onChange={(e) => setEditData({ ...editData, roll: e.target.value })}
                />
              ) : (
                <p className="font-bold text-gray-800">{userData.roll || 'Not set'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Grade</p>
              {isEditing ? (
                <input
                  type="text"
                  className="input-field py-1 px-2 text-sm mt-1"
                  value={editData.grade}
                  onChange={(e) => setEditData({ ...editData, grade: e.target.value })}
                />
              ) : (
                <p className="font-bold text-gray-800">{userData.grade || 'Not set'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Phone</p>
              {isEditing ? (
                <input
                  type="text"
                  className="input-field py-1 px-2 text-sm mt-1"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              ) : (
                <p className="font-bold text-gray-800">
                  {isOwnProfile || currentUser?.email === 'afrajahme2@gmail.com' ? (userData.phone || 'Not set') : '••••••••'}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Username</p>
              {isEditing ? (
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    className="input-field py-1 px-2 text-sm flex-1"
                    value={editData.username}
                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                  />
                  <button onClick={handleUpdateProfile} className="text-green-500 hover:text-green-600 transition-colors">
                    <CheckCircle size={20} />
                  </button>
                </div>
              ) : (
                <p className="font-bold text-gray-800">@{userData.username}</p>
              )}
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>

        <div className="card space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Book size={18} className="text-denim" />
            Quiz History
          </h3>
          <div className="space-y-3">
            {quizAttempts.length > 0 ? (
              quizAttempts.map((attempt: any) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{attempt.subject} - {attempt.chapter}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{new Date(attempt.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-black", attempt.netGains >= 0 ? "text-green-500" : "text-red-500")}>
                      {attempt.netGains >= 0 ? '+' : ''}{attempt.netGains} XP
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold">{attempt.accuracy}% Accuracy</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">No quiz history yet.</p>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Shield size={18} className="text-denim" />
            Achievements
          </h3>
          <div className="flex flex-wrap gap-2">
            {userData.achievements?.length > 0 ? (
              userData.achievements.map((achievement: string, idx: number) => (
                <span key={idx} className="bg-denim/10 text-denim px-3 py-1 rounded-full text-xs font-bold border border-denim/20">
                  {achievement}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">No achievements yet. Keep playing!</p>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setShowQR(true)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <QrCode size={20} />
            My QR
          </button>
          <button onClick={() => setShowScanner(true)} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Scan size={20} />
            Scan QR
          </button>
        </div>

        {isOwnProfile && (
          <button 
            onClick={handleSignOut}
            className="w-full py-4 rounded-2xl font-bold bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        )}
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-xs text-center space-y-6"
          >
            <h3 className="text-xl font-bold text-denim">Profile QR</h3>
            <div className="bg-gray-50 p-6 rounded-2xl flex justify-center">
              <QRCodeSVG value={`${window.location.origin}/profile/${uid}`} size={200} />
            </div>
            <button onClick={() => setShowQR(false)} className="btn-primary w-full">
              Close
            </button>
          </motion.div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-bold text-denim text-center">Scan Profile QR</h3>
            <div id="reader" className="overflow-hidden rounded-2xl border-2 border-denim/20"></div>
            <button onClick={() => setShowScanner(false)} className="btn-secondary w-full">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
