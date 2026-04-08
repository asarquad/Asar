import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, getDoc, increment, where, setDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Trophy, Star, CheckCircle, XCircle, AlertCircle, Timer, Book, ChevronRight, Shield, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Utility for classes
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Quiz Firestore Error: ', JSON.stringify(errInfo));
}

export default function QuizGame() {
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const scoreRef = React.useRef(0);
  const xpLostRef = React.useRef(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [xpLost, setXpLost] = useState(0);
  const [userTotalXp, setUserTotalXp] = useState<number>(0);
  const [totalQuizzesPlayed, setTotalQuizzesPlayed] = useState<number>(0);
  const [totalQuestionsAttended, setTotalQuestionsAttended] = useState<number>(0);
  const [cycleScore, setCycleScore] = useState<number>(0);
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const [animValue, setAnimValue] = useState(0);
  const [isMilestone, setIsMilestone] = useState(false);
  const [quizResults, setQuizResults] = useState<boolean[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        let adminStatus = false;
        // Check admin status
        if (auth.currentUser) {
          if (auth.currentUser.email === 'afrajahme2@gmail.com') {
            adminStatus = true;
          } else {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
              adminStatus = true;
            }
          }
        }
        setIsAdmin(adminStatus);

        const q = query(collection(db, 'questions'));
        const querySnapshot = await getDocs(q);
        const questionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setAllQuestions(questionsData);
        
        // Fetch user XP and stats
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserTotalXp(data.xp || 0);
            setTotalQuizzesPlayed(data.totalQuizzesPlayed || 0);
            setTotalQuestionsAttended(data.totalQuestionsAttended || 0);
            setCycleScore(data.cycleScore || 0);
          }
        }

        // Normalize subjects: trim and handle Uncategorized
        let uniqueSubjects = Array.from(new Set(questionsData.map((q: any) => (q.subject || 'Uncategorized').trim()))).sort();
        
        // Filter Uncategorized for non-admins
        if (!adminStatus) {
          uniqueSubjects = uniqueSubjects.filter(s => s !== 'Uncategorized');
        }
        
        setSubjects(uniqueSubjects);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching quizzes:", err);
        if (err.code === 'resource-exhausted' || err.message?.includes('Quota exceeded')) {
          if (!window.location.search.includes('error=quota')) {
            const newUrl = window.location.pathname + '?error=quota' + window.location.hash;
            window.history.replaceState({}, '', newUrl);
            window.location.reload();
          }
        }
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [isAdmin]); // Re-run if isAdmin changes (though it's set inside)

  useEffect(() => {
    if (selectedSubject) {
      let filteredChapters = Array.from(new Set(
        allQuestions
          .filter(q => (q.subject || 'Uncategorized').trim() === selectedSubject)
          .map(q => (q.chapter || 'Default').trim())
      )).sort();

      setChapters(filteredChapters);
    } else {
      setChapters([]);
    }
  }, [selectedSubject, allQuestions, isAdmin]);

  const startQuiz = (chapterOverride?: string) => {
    const chapter = chapterOverride || selectedChapter;
    if (!selectedSubject || !chapter) return;

    scoreRef.current = 0;
    xpLostRef.current = 0;
    setScore(0);
    setXpGained(0);
    setXpLost(0);
    setQuizResults([]);
    setCurrentIndex(0);
    setGameOver(false);
    const filtered = allQuestions.filter(q => {
      const s = (q.subject || 'Uncategorized').trim();
      const c = (q.chapter || 'Default').trim();
      return s === selectedSubject && c === chapter;
    });
    // Shuffle and take up to 20 questions for a better experience without levels
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, 20));
  };

  const syncPoint = async (change: number, isCorrect: boolean, isMilestone: boolean) => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      const updates: any = {
        xp: increment(change),
        totalQuestionsAttended: increment(1),
        lastActive: new Date().toISOString()
      };

      if (isMilestone) {
        updates.cycleScore = 0;
      } else if (isCorrect) {
        updates.cycleScore = increment(1);
      }

      await updateDoc(userRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (selectedOption !== null || !auth.currentUser) return;
    
    const correct = optionIndex === questions[currentIndex].correctIndex;
    setSelectedOption(optionIndex);
    setIsCorrect(correct);
    setQuizResults(prev => [...prev, correct]);

    let pointChange = 0;
    const nextWrong = correct ? 0 : consecutiveWrong + 1;
    
    // Update consecutive wrong state
    if (correct) {
      setConsecutiveWrong(0);
      setXpGained(prev => prev + 1);
      scoreRef.current += 1;
      pointChange = 1;
    } else {
      if (nextWrong >= 10) {
        setConsecutiveWrong(0);
        setXpLost(l => l + 2);
        xpLostRef.current += 2;
        pointChange = -2;
      } else {
        setConsecutiveWrong(nextWrong);
      }
    }

    // Calculate milestone locally for immediate UI feedback
    const newTotalAttended = totalQuestionsAttended + 1;
    setTotalQuestionsAttended(newTotalAttended);
    const isMilestoneQuestion = newTotalAttended > 0 && newTotalAttended % 15 === 0;
    
    const currentCycleScore = correct ? cycleScore + 1 : cycleScore;

    // Trigger sync in background - don't await it to keep UI snappy
    syncPoint(pointChange, correct, isMilestoneQuestion);

    // Trigger animation or instant XP update
    if (isMilestoneQuestion) {
      setAnimValue(currentCycleScore);
      setIsMilestone(true);
      setShowXpAnimation(true);
      setCycleScore(0); // Reset locally
    } else {
      // Update local display instantly
      setUserTotalXp(prev => prev + pointChange);
      if (correct) setCycleScore(prev => prev + 1);
    }

    // Start the transition timer
    const transitionTimer = setTimeout(async () => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsCorrect(null);
      } else {
        // End of quiz
        setGameOver(true);
        setIsSubmitting(true);
        
        if (auth.currentUser) {
          try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const netGains = scoreRef.current - xpLostRef.current;
            
            // Update score state for UI consistency
            setScore(scoreRef.current);
            
            const userSnap = await getDoc(userRef);
            let totalPlayed = 0;
            if (userSnap.exists()) {
              totalPlayed = typeof userSnap.data().totalQuizzesPlayed === 'number' ? userSnap.data().totalQuizzesPlayed : 0;
            }

            const totalAfter = totalPlayed + 1;
            
            // 1. Update user profile (total played and session stats)
            const userUpdatePath = `users/${auth.currentUser.uid}`;
            try {
              await setDoc(userRef, {
                consecutiveWrongAnswers: 0,
                lastActive: new Date().toISOString(),
                lastQuizCompleted: new Date().toISOString(),
                totalQuizzesPlayed: increment(1)
              }, { merge: true });
              
              setTotalQuizzesPlayed(totalAfter);
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, userUpdatePath);
            }

            // 2. Save detailed quiz attempt
            const attemptRef = doc(collection(userRef, 'quizAttempts'));
            const attemptPath = `${userUpdatePath}/quizAttempts/${attemptRef.id}`;
            try {
              await setDoc(attemptRef, {
                subject: selectedSubject,
                chapter: selectedChapter,
                score: scoreRef.current,
                xpLost: xpLostRef.current,
                netGains: netGains,
                totalQuestions: questions.length,
                timestamp: new Date().toISOString(),
                accuracy: Math.round((scoreRef.current / questions.length) * 100)
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, attemptPath);
            }
            
            setNotification({ message: `Quiz Completed!`, type: 'success' });
            setTimeout(() => setNotification(null), 3000);
          } catch (err: any) {
            console.error("QuizGame: Final Sync Failed:", err);
          } finally {
            setIsSubmitting(false);
          }
        }
      }
    }, 1500);

    return () => clearTimeout(transitionTimer);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-denim"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-6 space-y-8 max-w-4xl mx-auto">
        <div className="text-center space-y-4 py-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-wine/10 rounded-[2rem] flex items-center justify-center mx-auto text-wine shadow-inner"
          >
            <Trophy size={40} />
          </motion.div>
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-wine tracking-tighter uppercase italic">
              {selectedSubject ? selectedSubject : "Select Book"}
            </h2>
            <p className="text-gray-500 font-bold text-sm tracking-widest uppercase opacity-60">
              {selectedSubject ? "Choose a chapter to begin your quest" : "Pick a book to master"}
            </p>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className="p-12 text-center space-y-6 card bg-white border-2 border-dashed border-gray-100">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="text-gray-300" size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-800">The Library is Empty</h2>
              <p className="text-gray-500 max-w-xs mx-auto font-medium">The grandmasters haven't prepared any books yet. Check back soon!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!selectedSubject ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.map((subject, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSubject(subject)}
                    className="card p-8 flex flex-col items-center gap-6 hover:border-wine transition-all group bg-white border-2 border-gray-50 shadow-xl shadow-gray-200/50"
                  >
                    <div className="w-20 h-20 bg-wine/5 rounded-3xl flex items-center justify-center text-wine group-hover:bg-wine group-hover:text-white transition-all shadow-inner">
                      <Book size={40} strokeWidth={2.5} />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-black text-gray-800 group-hover:text-wine transition-all uppercase tracking-tight">{subject}</h3>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {allQuestions.filter(q => (q.subject || 'Uncategorized') === subject).length} Questions Available
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : !selectedChapter ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <button 
                    onClick={() => setSelectedSubject(null)}
                    className="text-wine font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-wine/5 px-4 py-2 rounded-full transition-all"
                  >
                    ← Back to Books
                  </button>
                  <div className="h-px flex-1 bg-wine/10 mx-4"></div>
                </div>
                
                <div className="grid gap-3">
                  {chapters.map((chapter, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ x: 10 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedChapter(chapter);
                        startQuiz(chapter);
                      }}
                      className="card p-6 flex items-center justify-between hover:border-wine transition-all group bg-white border-2 border-gray-50 shadow-lg shadow-gray-200/30"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-wine/5 rounded-2xl flex items-center justify-center text-wine group-hover:bg-wine group-hover:text-white transition-all shadow-inner">
                          <CheckCircle size={28} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-black text-gray-800 group-hover:text-wine transition-all tracking-tight">{chapter}</h3>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {allQuestions.filter(q => (q.subject || 'Uncategorized') === selectedSubject && (q.chapter || 'Default') === chapter).length} Challenges
                          </p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-wine/10 group-hover:text-wine transition-all">
                        <ChevronRight size={20} strokeWidth={3} />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="mx-auto text-wine" size={48} />
        <h2 className="text-xl font-bold text-wine">No questions available</h2>
        <p className="text-gray-500">Check back later when the admin adds some quizzes!</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const renderHeader = () => (
    <div className="sticky top-0 z-40 bg-ivory/80 backdrop-blur-md pb-4 pt-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
          <Star className="text-yellow-500" size={18} />
          <span className="font-black text-wine">{xpGained - xpLost} <b>BRAIN GAINS</b></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-denim/10 px-4 py-2 rounded-full border border-denim/20">
            <Book className="text-denim" size={16} />
            <span className="font-black text-denim text-[10px] uppercase tracking-widest">
              Progress {totalQuestionsAttended % 15}/15
            </span>
          </div>
          <div className="flex items-center gap-2 bg-wine/5 px-4 py-2 rounded-full border border-wine/10">
            <Trophy className="text-wine" size={18} />
            <motion.span 
              key={userTotalXp}
              initial={{ scale: 1.5, color: "#fbbf24" }}
              animate={{ scale: 1, color: "#722F37" }}
              className="font-black text-wine text-sm"
            >
              {userTotalXp}
            </motion.span>
          </div>
          {!gameOver && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
              <Timer className="text-wine" size={18} />
              <span className="font-black text-wine">{currentIndex + 1}/{questions.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnimation = () => (
    <AnimatePresence mode="wait">
      {showXpAnimation && (
        <motion.div
          key={isMilestone ? "milestone" : "instant"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, x: 0, y: 0 }}
            animate={{ 
              scale: isMilestone ? [0.5, 1.5, 1.5, 0.2] : [0.5, 1.2, 1.2, 0.2],
              opacity: [0, 1, 1, 0],
              x: [0, 0, 0, window.innerWidth / 2 - 40],
              y: [0, 0, 0, -window.innerHeight / 2 + 40]
            }}
            transition={{
              duration: isMilestone ? 3 : 1.5,
              times: [0, 0.2, 0.7, 1],
              ease: "easeInOut"
            }}
            onAnimationComplete={() => {
              setShowXpAnimation(false);
              setUserTotalXp(prev => prev + animValue);
            }}
            className={cn(
              "text-white px-10 py-6 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-2 border-4",
              isMilestone ? "bg-wine border-yellow-400" : (animValue > 0 ? "bg-green-600 border-green-400" : "bg-red-600 border-red-400")
            )}
          >
            {isMilestone ? (
              <div className="relative">
                <Trophy className="text-yellow-400" size={48} />
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute -top-4 -right-4 text-yellow-300"
                >
                  <PartyPopper size={32} />
                </motion.div>
                <motion.div
                  animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                  className="absolute -top-4 -left-4 text-yellow-300"
                >
                  <PartyPopper size={32} className="-scale-x-100" />
                </motion.div>
              </div>
            ) : (
              animValue > 0 ? <Star className="text-yellow-300 fill-yellow-300" size={32} /> : <AlertCircle size={32} />
            )}
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                {isMilestone ? "Milestone Reward" : (animValue > 0 ? "Brain Gain" : "Brain Drain")}
              </p>
              <span className={cn("font-black", isMilestone ? "text-6xl" : "text-3xl")}>
                {animValue > 0 ? `+${animValue}` : animValue}
              </span>
              {isMilestone && (
                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-yellow-200">
                  Points Earned!
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (gameOver) {
    return (
      <div className="p-6 space-y-8 pb-24 relative min-h-full">
        {renderHeader()}
        {renderAnimation()}
        <div className="flex flex-col items-center justify-center text-center space-y-6 pt-4">
          <div className="w-24 h-24 bg-wine/10 rounded-full flex items-center justify-center text-wine">
            <Trophy size={48} />
          </div>
          <h2 className="text-3xl font-black text-wine">Quiz Complete!</h2>
          {isSubmitting && (
            <div className="flex items-center gap-2 text-denim animate-pulse">
              <div className="w-2 h-2 bg-denim rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-denim rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-denim rounded-full animate-bounce [animation-delay:0.4s]"></div>
              <span className="text-xs font-bold uppercase tracking-widest">Syncing <b>BRAIN GAINS</b>...</span>
            </div>
          )}
          <div className="card w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold uppercase text-xs tracking-widest"><b>BRAIN GAINS</b> Gained</span>
              <span className="text-2xl font-black text-green-500">+{xpGained}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-bold uppercase text-xs tracking-widest"><b>BRAIN GAINS</b> Lost</span>
              <span className="text-2xl font-black text-red-500">-{xpLost}</span>
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-gray-800 font-black uppercase text-sm tracking-widest">Net Result</span>
              <span className="text-3xl font-black text-wine">{xpGained - xpLost} <b>BRAIN GAINS</b></span>
            </div>
          </div>

          {/* Question Summary */}
          <div className="w-full space-y-3">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest text-left">Quiz Summary</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quizResults.map((res, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm",
                    res ? "bg-green-500 text-white" : "bg-red-500 text-white"
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={() => startQuiz()} 
              className="btn-primary w-full bg-wine/10 text-wine border-wine/20 hover:bg-wine/20"
            >
              Play Again
              <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="text-gray-400 font-bold text-sm hover:text-wine transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 pb-24 relative">
      {renderHeader()}
      {renderAnimation()}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={cn(
              "fixed top-4 left-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2 min-w-[280px]",
              notification.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="card bg-white border-2 border-wine/10 p-8 min-h-[200px] flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-4 left-4 bg-wine/5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-wine/60 flex items-center gap-2">
            <span>Chapter: {currentQuestion.chapter}</span>
          </div>
          <h3 className="text-xl font-bold leading-tight mt-4 text-wine">{currentQuestion.question}</h3>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-wine/5 rounded-full blur-2xl"></div>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option: string, idx: number) => {
            const isSelected = selectedOption === idx;
            const isCorrectOption = idx === currentQuestion.correctIndex;
            
            let statusClass = "bg-white border-gray-100 hover:border-wine text-wine";
            if (selectedOption !== null) {
              if (isCorrectOption) statusClass = "bg-green-50 border-green-500 text-green-700";
              else if (isSelected) statusClass = "bg-red-50 border-red-500 text-red-700";
              else statusClass = "bg-gray-50 border-gray-100 opacity-50 text-wine/40";
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(idx)}
                disabled={selectedOption !== null}
                className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${statusClass}`}
              >
                <span>{option}</span>
                {selectedOption !== null && isCorrectOption && <CheckCircle size={20} className="text-green-500" />}
                {selectedOption !== null && isSelected && !isCorrectOption && <XCircle size={20} className="text-red-500" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {consecutiveWrong > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3"
          >
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-xs font-bold text-red-700">
              Warning: {consecutiveWrong}/10 consecutive wrong answers. 
              <span className="block font-medium opacity-70">10 wrong answers will deduct 2 <b>BRAIN GAINS</b>!</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
