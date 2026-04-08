import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '../../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, where, limit, getDocFromServer } from 'firebase/firestore';
import { GraduationCap, Chrome } from 'lucide-react';
import { cn } from '../../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMethod, setLoginMethod] = useState<'google' | 'id'>('google');
  const [idInfo, setIdInfo] = useState({ studentId: '', phone: '' });
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      // Generate a unique session ID for this device (but don't save yet)
      const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const localSessionId = localStorage.getItem('user_session_id');

      if (userDoc?.exists()) {
        const data = userDoc.data();
        if (data.isBanned) {
          await auth.signOut();
          setError('Your account has been banned. Please contact the administrator.');
          setLoading(false);
          return;
        }

        // BLOCK SECOND LOGIN: Only if session is active AND not this device
        if (data.currentSessionId && data.currentSessionId !== localSessionId) {
          const lastActive = data.lastActive ? new Date(data.lastActive).getTime() : 0;
          const now = Date.now();
          // If session was active in the last 2 minutes, block it
          if (now - lastActive < 120000) {
            await auth.signOut();
            setError('This account is already logged in on another device. Please log out from that device first.');
            setLoading(false);
            return;
          }
        }
      }

      // If we reach here, login is allowed
      const finalSessionId = localSessionId || newSessionId;
      localStorage.setItem('user_session_id', finalSessionId);

      if (!userDoc?.exists()) {
        // Check if this is the first user
        let usersSnapshot;
        try {
          usersSnapshot = await getDocs(collection(db, 'users'));
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'users');
        }
        const isFirstUser = usersSnapshot?.empty;

        // Create new user profile
        try {
          await setDoc(userDocRef, {
            uid: user.uid,
            username: user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
            name: user.displayName || 'Student',
            email: user.email,
            photoUrl: user.photoURL,
            xp: 0,
            achievements: [],
            lastUsernameChange: new Date().toISOString(),
            consecutiveWrongAnswers: 0,
            role: isFirstUser ? 'admin' : 'student',
            studentId: '',
            roll: '',
            grade: '',
            phone: '',
            isBanned: false,
            currentSessionId: finalSessionId,
            lastActive: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      } else {
        // Update session ID for existing user
        await setDoc(userDocRef, { 
          currentSessionId: finalSessionId,
          lastActive: new Date().toISOString()
        }, { merge: true });
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Verify authorization in admin_students using getDoc (more reliable)
      const studentDocRef = doc(db, 'admin_students', idInfo.studentId);
      let studentDoc;
      try {
        studentDoc = await getDoc(studentDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `admin_students/${idInfo.studentId}`);
      }

      if (!studentDoc?.exists() || studentDoc.data().phone !== idInfo.phone) {
        setError('Invalid Student ID or Phone Number. Please ensure you are authorized by an administrator.');
        setLoading(false);
        return;
      }

      const authorizedData = studentDoc.data();
      const email = `${idInfo.studentId.toLowerCase()}@school.id`;
      const password = idInfo.phone;

      // Generate a unique session ID for this device (but don't save yet)
      const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const localSessionId = localStorage.getItem('user_session_id');

      let user;
      try {
        // 2. Try to sign in
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
      } catch (err: any) {
        // Firebase now often returns 'auth/invalid-credential' instead of 'auth/user-not-found'
        // due to email enumeration protection.
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            // 3. Create account if first time
            const result = await createUserWithEmailAndPassword(auth, email, password);
            user = result.user;
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // If it already exists, then the original error was actually a wrong password
              setError('Incorrect phone number for this Student ID.');
              setLoading(false);
              return;
            }
            throw createErr;
          }
        } else {
          throw err;
        }
      }

      // 4. Check/Create user profile
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      if (userDoc?.exists()) {
        const data = userDoc.data();
        if (data.isBanned) {
          await auth.signOut();
          setError('Your account has been banned. Please contact the administrator.');
          setLoading(false);
          return;
        }

        // BLOCK SECOND LOGIN: Only if session is active AND not this device
        if (data.currentSessionId && data.currentSessionId !== localSessionId) {
          const lastActive = data.lastActive ? new Date(data.lastActive).getTime() : 0;
          const now = Date.now();
          if (now - lastActive < 120000) {
            await auth.signOut();
            setError('This account is already logged in on another device. Please log out from that device first.');
            setLoading(false);
            return;
          }
        }
      }

      // If we reach here, login is allowed
      const finalSessionId = localSessionId || newSessionId;
      localStorage.setItem('user_session_id', finalSessionId);

      if (!userDoc?.exists()) {
        try {
          await setDoc(userDocRef, {
            uid: user.uid,
            username: idInfo.studentId,
            name: authorizedData.name,
            email: email,
            photoUrl: null,
            xp: 0,
            achievements: [],
            lastUsernameChange: new Date().toISOString(),
            consecutiveWrongAnswers: 0,
            role: 'student',
            studentId: idInfo.studentId,
            roll: authorizedData.roll || '',
            grade: authorizedData.grade || '',
            phone: idInfo.phone,
            isBanned: false,
            currentSessionId: finalSessionId,
            lastActive: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      } else {
        // Update session ID for existing user
        await setDoc(userDocRef, { 
          currentSessionId: finalSessionId,
          lastActive: new Date().toISOString()
        }, { merge: true });
      }

      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect phone number for this Student ID.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 flex flex-col justify-center">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-black text-denim tracking-tighter mb-2">SchoolQuiz</h1>
        <p className="text-gray-500 font-medium">Learn and compete with friends!</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-6">
          <div className="w-20 h-20 bg-denim/10 rounded-full flex items-center justify-center text-denim mx-auto">
            <LogIn size={40} />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Welcome</h2>
            <p className="text-gray-500 text-sm mt-1">Choose your preferred login method.</p>
          </div>

          {/* Login Method Toggle */}
          <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
            <button
              onClick={() => setLoginMethod('google')}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                loginMethod === 'google' ? "bg-white text-denim shadow-sm" : "text-gray-400"
              )}
            >
              <Chrome size={18} />
              Google
            </button>
            <button
              onClick={() => setLoginMethod('id')}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                loginMethod === 'id' ? "bg-white text-denim shadow-sm" : "text-gray-400"
              )}
            >
              <GraduationCap size={18} />
              School ID
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl text-sm text-left">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {loginMethod === 'google' ? (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border-2 border-gray-100 text-gray-700 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-denim/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-denim"></div>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          ) : (
            <form onSubmit={handleIdLogin} className="space-y-4 text-left">
              <div>
                <label className="label">Student ID</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. S12345"
                  value={idInfo.studentId}
                  onChange={(e) => setIdInfo({ ...idInfo, studentId: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="input-field"
                  placeholder="Your registered phone"
                  value={idInfo.phone}
                  onChange={(e) => setIdInfo({ ...idInfo, phone: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 mt-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mx-auto"></div>
                ) : (
                  'Sign In with ID'
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs px-8">
          {loginMethod === 'id' 
            ? "Only authorized students can use ID login. Others must use Google."
            : "By signing in, you agree to our terms of service and privacy policy."}
        </p>
      </motion.div>
    </div>
  );
}


function CheckCircle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
