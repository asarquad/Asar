import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, arrayUnion, query, where, setDoc, getDoc, Timestamp, writeBatch, getDocsFromServer } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Shield, Users, BookOpen, Plus, Trash2, Star, CheckCircle, AlertCircle, Lock, Key, FileText, Upload, Sparkles, FolderInput, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { generateQuizFromBook, extractStudentsFromIDCards, extractEventsFromCalendar } from '../../lib/gemini';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [bookSubject, setBookSubject] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookLevel, setBookLevel] = useState(1);
  const [idCardsFile, setIdCardsFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'user' | 'question' | 'admin_student' | 'ban' | 'category' | 'all_questions' | 'reset_points', subType?: 'subject' | 'chapter', parentSubject?: string } | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [adminStudents, setAdminStudents] = useState<any[]>([]);
  const [calendarFile, setCalendarFile] = useState<File | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        if (!auth.currentUser) {
          setIsAdmin(false);
          return;
        }
        
        // Check for default admin email first
        if (auth.currentUser.email === 'afrajahme2@gmail.com') {
          setIsAdmin(true);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, activeTab]);

  const fetchData = async () => {
    console.log("AdminPanel: Fetching data for tab:", activeTab);
    setLoading(true);
    try {
      if (activeTab === 'users') {
        console.log("AdminPanel: Fetching users...");
        const snapshot = await getDocs(collection(db, 'users'));
        console.log("AdminPanel: Fetched", snapshot.size, "users");
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'questions') {
        console.log("AdminPanel: Fetching questions...");
        const snapshot = await getDocsFromServer(collection(db, 'questions'));
        console.log("AdminPanel: Fetched", snapshot.size, "questions");
        setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'database') {
        console.log("AdminPanel: Fetching admin_students...");
        const snapshot = await getDocs(collection(db, 'admin_students'));
        console.log("AdminPanel: Fetched", snapshot.size, "admin_students");
        setAdminStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (err: any) {
      console.error("AdminPanel: Fetch data failed:", err);
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      console.log("AdminPanel: Fetching complete");
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      showNotification('User deleted successfully');
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
    setConfirmDelete(null);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteDoc(doc(db, 'questions', questionId));
      showNotification('Question deleted successfully');
      await fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
    setConfirmDelete(null);
  };

  const handleDeleteAdminStudent = async (studentId: string) => {
    try {
      await deleteDoc(doc(db, 'admin_students', studentId));
      showNotification('Student record removed');
      await fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
    setConfirmDelete(null);
  };

  const handleBanUser = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: !currentStatus
      });
      showNotification(currentStatus ? 'User unbanned' : 'User banned');
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
    setConfirmDelete(null);
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'student' : 'admin';
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      showNotification(`User role updated to ${newRole}`);
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteAllQuestions = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'questions'));
      if (snapshot.empty) {
        showNotification('No questions to delete');
        setConfirmDelete(null);
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      setQuestions([]);
      showNotification(`All ${snapshot.size} questions deleted successfully`);
      await fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
    setConfirmDelete(null);
  };

  const handleDeleteCategory = async (categoryName: string, subType?: 'subject' | 'chapter', parentSubject?: string) => {
    try {
      // Fetch all questions to handle Uncategorized/missing fields correctly
      const snapshot = await getDocs(collection(db, 'questions'));
      const allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() } as any));
      
      let toDelete: any[] = [];

      if (subType === 'subject') {
        toDelete = allQuestions.filter((q: any) => {
          const s = (q.subject || 'Uncategorized').toLowerCase();
          return s === categoryName.toLowerCase();
        });
      } else if (subType === 'chapter') {
        toDelete = allQuestions.filter((q: any) => {
          const c = (q.chapter || 'Default').toLowerCase();
          const s = (q.subject || 'Uncategorized').toLowerCase();
          if (parentSubject) {
            return c === categoryName.toLowerCase() && s === parentSubject.toLowerCase();
          }
          return c === categoryName.toLowerCase();
        });
      } else {
        // Fallback for old data
        toDelete = allQuestions.filter((q: any) => 
          (q.chapter || '').toLowerCase() === categoryName.toLowerCase() || 
          (q.subject || '').toLowerCase() === categoryName.toLowerCase()
        );
      }

      if (toDelete.length === 0) {
        showNotification(`No questions found for ${subType || 'category'} "${categoryName}"`, 'error');
        setConfirmDelete(null);
        return;
      }

      const batch = writeBatch(db);
      toDelete.forEach(q => batch.delete(q.ref));
      await batch.commit();
      
      showNotification(`Deleted ${subType || 'category'} "${categoryName}" and its ${toDelete.length} questions`);
      await fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
    setConfirmDelete(null);
  };

  const handleResetAllPoints = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'users'));
      if (snapshot.empty) {
        showNotification('No users to reset');
        setConfirmDelete(null);
        return;
      }

      const batch = writeBatch(db);
      for (const userDoc of snapshot.docs) {
        batch.update(userDoc.ref, { 
          xp: 0,
          totalQuizzesPlayed: 0,
          consecutiveWrongAnswers: 0,
          achievements: [],
          lastQuizCompleted: null,
          lastActive: new Date().toISOString()
        });
      }
      await batch.commit();
      
      showNotification(`Successfully reset points for ${snapshot.size} users. System is now clean.`);
      await fetchData();
    } catch (err: any) {
      console.error("Reset failed:", err);
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  const handleGenerateAIStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCardsFile) return;

    setAiLoading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(idCardsFile);
      const base64 = await base64Promise;

      const students = await extractStudentsFromIDCards({
        data: base64,
        mimeType: idCardsFile.type
      });

      if (students.length === 0) {
        showNotification('No students found in the document.', 'error');
        return;
      }

      let addedCount = 0;
      for (const student of students) {
        // Check if student ID already exists to avoid duplicates
        const q = query(collection(db, 'admin_students'), where('studentId', '==', student.studentId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          await setDoc(doc(db, 'admin_students', student.studentId), {
            ...student,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      }

      showNotification(`Successfully added ${addedCount} new students!`);
      setIdCardsFile(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateAICalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendarFile) return;

    setAiLoading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(calendarFile);
      const base64 = await base64Promise;

      const extractedEvents = await extractEventsFromCalendar({
        data: base64,
        mimeType: calendarFile.type
      });

      if (!extractedEvents || extractedEvents.length === 0) {
        showNotification('No school events found in the document.', 'error');
        return;
      }

      let addedCount = 0;
      for (const event of extractedEvents) {
        try {
          const eventDate = new Date(event.date);
          const endDate = event.endDate ? new Date(event.endDate) : null;
          
          // Check if date is valid
          if (isNaN(eventDate.getTime())) {
            console.warn(`Skipping event "${event.title}" due to invalid date: ${event.date}`);
            continue;
          }

          await addDoc(collection(db, 'events'), {
            ...event,
            date: Timestamp.fromDate(eventDate),
            endDate: endDate && !isNaN(endDate.getTime()) ? Timestamp.fromDate(endDate) : null,
            createdAt: Timestamp.now()
          });
          addedCount++;
        } catch (eventErr) {
          console.error(`Error adding event "${event.title}":`, eventErr);
        }
      }

      if (addedCount > 0) {
        showNotification(`Successfully added ${addedCount} school events to the calendar!`);
      } else {
        showNotification('Failed to add any valid events from the calendar.', 'error');
      }
      setCalendarFile(null);
      fetchData();
    } catch (err: any) {
      console.error("Calendar Import Error:", err);
      showNotification(err.message || 'An error occurred during calendar extraction.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const question = {
      subject: formData.get('subject') as string,
      chapter: formData.get('chapter') as string,
      level: parseInt(formData.get('level') as string) || 1,
      question: formData.get('question') as string,
      options: [
        formData.get('opt1') as string,
        formData.get('opt2') as string,
        formData.get('opt3') as string,
        formData.get('opt4') as string,
      ],
      correctIndex: parseInt(formData.get('correctIndex') as string),
    };

    try {
      await addDoc(collection(db, 'questions'), question);
      showNotification('Question added!');
      form.reset();
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleAddAchievement = async (userId: string) => {
    const achievement = prompt('Enter achievement name:');
    if (!achievement) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        achievements: arrayUnion(achievement)
      });
      showNotification('Achievement added!');
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleUpdateQuestionCategory = async (questionId: string, newCategory: string) => {
    try {
      const parts = newCategory.split('/');
      const subject = parts.length > 1 ? parts[0] : '';
      const chapter = parts.length > 1 ? parts[1] : parts[0];
      
      await updateDoc(doc(db, 'questions', questionId), {
        subject,
        chapter
      });
      showNotification('Question moved successfully');
      fetchData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleGenerateAIQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookFile || !bookTitle || !bookSubject) return;

    setAiLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const data = base64.split(',')[1];
        const mimeType = bookFile.type;

        const generatedQuestions = await generateQuizFromBook(bookTitle, { data, mimeType });
        
        if (generatedQuestions && generatedQuestions.length > 0) {
          const batch = writeBatch(db);
          generatedQuestions.forEach((q: any) => {
            const newDocRef = doc(collection(db, 'questions'));
            batch.set(newDocRef, {
              ...q,
              subject: bookSubject,
              chapter: bookTitle,
              level: bookLevel
            });
          });
          await batch.commit();
          showNotification(`Successfully generated ${generatedQuestions.length} questions for "${bookSubject} - ${bookTitle}"!`);
          setBookFile(null);
          setBookTitle('');
          setBookSubject('');
          fetchData();
        } else {
          showNotification("AI failed to generate questions. Please try a clearer image or text.", 'error');
        }
      };
      reader.readAsDataURL(bookFile);
    } catch (err: any) {
      if (err.code === 'resource-exhausted') {
        showNotification('Daily write limit reached. Please try again tomorrow.', 'error');
      } else {
        showNotification(err.message, 'error');
      }
    } finally {
      setAiLoading(false);
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-denim"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
        <Shield className="text-red-400" size={64} />
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-500">You do not have administrative privileges.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Back to Home</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2 min-w-[280px]",
              notification.type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </motion.div>
        )}

        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800">Are you sure?</h4>
                <p className="text-gray-500 text-sm mt-2">This action cannot be undone. All associated data will be lost.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDelete.type === 'user') handleDeleteUser(confirmDelete.id);
                    else if (confirmDelete.type === 'question') handleDeleteQuestion(confirmDelete.id);
                    else if (confirmDelete.type === 'admin_student') handleDeleteAdminStudent(confirmDelete.id);
                    else if (confirmDelete.type === 'category') handleDeleteCategory(confirmDelete.id, confirmDelete.subType, confirmDelete.parentSubject);
                    else if (confirmDelete.type === 'all_questions') handleDeleteAllQuestions();
                    else if (confirmDelete.type === 'reset_points') handleResetAllPoints();
                    else if (confirmDelete.type === 'ban') {
                      const user = users.find(u => u.id === confirmDelete.id);
                      handleBanUser(confirmDelete.id, user?.isBanned || false);
                    }
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-white transition-all",
                    confirmDelete.type === 'ban' ? "bg-orange-500 hover:bg-orange-600 shadow-orange-200" : "bg-red-500 hover:bg-red-600 shadow-red-200"
                  )}
                >
                  {confirmDelete.type === 'ban' ? 'Confirm' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", 
            activeTab === 'users' ? "bg-denim text-white" : "bg-white text-gray-400 border border-gray-100")}
        >
          <Users size={18} />
          Users
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", 
            activeTab === 'questions' ? "bg-denim text-white" : "bg-white text-gray-400 border border-gray-100")}
        >
          <BookOpen size={18} />
          Quiz
        </button>
        <button
          onClick={() => setActiveTab('books')}
          className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", 
            activeTab === 'books' ? "bg-denim text-white" : "bg-white text-gray-400 border border-gray-100")}
        >
          <FileText size={18} />
          Books
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", 
            activeTab === 'database' ? "bg-denim text-white" : "bg-white text-gray-400 border border-gray-100")}
        >
          <Plus size={18} />
          DB
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={cn("flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2", 
            activeTab === 'calendar' ? "bg-denim text-white" : "bg-white text-gray-400 border border-gray-100")}
        >
          <CalendarIcon size={18} />
          Cal
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h3 className="text-xl font-bold text-denim">Manage Students</h3>
            {loading ? <div className="text-center py-8">Loading...</div> : (
              users.map(user => (
                <div key={user.id} className="card flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{user.name}</p>
                      {user.role === 'admin' && (
                        <span className="px-2 py-0.5 bg-denim/10 text-denim text-[10px] font-bold rounded-full uppercase tracking-wider">Admin</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">@{user.username} • {user.xp} <b>BRAIN GAINS</b></p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleAdmin(user.id, user.role || 'student')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        user.role === 'admin' ? "bg-denim text-white" : "bg-denim/5 text-denim hover:bg-denim hover:text-white"
                      )}
                      title={user.role === 'admin' ? "Demote to Student" : "Promote to Admin"}
                    >
                      <Shield size={18} />
                    </button>
                    <button
                      onClick={() => handleAddAchievement(user.id)}
                      className="p-2 bg-denim/10 text-denim rounded-lg hover:bg-denim hover:text-white transition-all"
                      title="Add Achievement"
                    >
                      <Star size={18} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: user.id, type: 'ban' })}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        user.isBanned ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white"
                      )}
                      title={user.isBanned ? "Unban User" : "Ban User"}
                    >
                      <Shield size={18} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: user.id, type: 'user' })}
                      className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'questions' && (
          <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-denim tracking-tight">Quiz Studio</h3>
                <p className="text-xs text-gray-500 font-medium">Manage your question bank and categories</p>
              </div>
              {questions.length > 0 && (
                <button
                  onClick={() => setConfirmDelete({ id: 'all', type: 'all_questions' })}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100"
                >
                  <Trash2 size={14} />
                  Clear All
                </button>
              )}
            </div>

            {/* Categories Quick Access */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-6 space-y-4 bg-gradient-to-br from-white to-gray-50/50">
                <div className="flex items-center gap-2 text-denim">
                  <FolderInput size={20} />
                  <h4 className="font-bold">Active Subjects</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(questions.map(q => q.subject || 'Uncategorized'))).sort().map(subject => (
                    <div key={subject} className="group flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm hover:border-denim transition-all">
                      <span className="font-bold text-xs text-gray-600">{subject}</span>
                      <button
                        onClick={() => setConfirmDelete({ id: subject, type: 'category', subType: 'subject' })}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {questions.length === 0 && <p className="text-xs text-gray-400 italic">No subjects created yet.</p>}
                </div>
              </div>

              <div className="card p-6 space-y-4 bg-gradient-to-br from-white to-gray-50/50">
                <div className="flex items-center gap-2 text-denim">
                  <BookOpen size={20} />
                  <h4 className="font-bold">Active Chapters</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(questions.map(q => q.chapter).filter(Boolean))).map(chapter => (
                    <div key={chapter} className="group flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm hover:border-denim transition-all">
                      <span className="font-bold text-xs text-gray-600">{chapter}</span>
                      <button
                        onClick={() => setConfirmDelete({ id: chapter, type: 'category', subType: 'chapter' })}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {questions.filter(q => q.chapter).length === 0 && <p className="text-xs text-gray-400 italic">No chapters created yet.</p>}
                </div>
              </div>
            </div>

            {/* Add Question Form */}
            <div className="card overflow-hidden border-2 border-denim/5">
              <div className="bg-denim/5 px-6 py-4 border-b border-denim/10 flex items-center justify-between">
                <h3 className="font-bold text-denim flex items-center gap-2">
                  <Plus size={18} />
                  Create New Question
                </h3>
              </div>
              <form onSubmit={handleAddQuestion} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                    <input name="subject" required className="input-field bg-gray-50/50" placeholder="e.g. Biology" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chapter / Section</label>
                    <input name="chapter" required className="input-field bg-gray-50/50" placeholder="e.g. Cell Structure" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Level (1-10)</label>
                    <select name="level" required className="input-field bg-gray-50/50">
                      {[1,2,3,4,5,6,7,8,9,10].map(l => (
                        <option key={l} value={l}>Level {l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Question Content</label>
                  <textarea name="question" required className="input-field h-24 bg-gray-50/50 resize-none" placeholder="Type your question here..." />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Option {i}</label>
                      <input name={`opt${i}`} required className="input-field text-sm bg-gray-50/50" placeholder={`Option ${i} text`} />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Correct Answer</label>
                    <select name="correctIndex" className="input-field bg-gray-50/50">
                      <option value="0">Option 1 is Correct</option>
                      <option value="1">Option 2 is Correct</option>
                      <option value="2">Option 3 is Correct</option>
                      <option value="3">Option 4 is Correct</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary px-12 sm:self-end h-[50px] shadow-lg shadow-denim/20">
                    Save Question
                  </button>
                </div>
              </form>
            </div>

            {/* Question List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-black text-denim uppercase tracking-tight">Question Bank</h3>
                <div className="h-px flex-1 bg-gray-100 mx-4"></div>
              </div>

              <div className="space-y-8">
                {Object.entries(
                  questions.reduce((acc: any, q) => {
                    const subject = q.subject || 'Uncategorized';
                    if (!acc[subject]) acc[subject] = {};
                    const chapter = q.chapter || 'Default';
                    if (!acc[subject][chapter]) acc[subject][chapter] = [];
                    acc[subject][chapter].push(q);
                    return acc;
                  }, {})
                ).map(([subject, chapters]: [string, any]) => (
                  <div key={subject} className="space-y-4">
                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-denim/10 rounded-xl flex items-center justify-center text-denim">
                          <FolderInput size={20} />
                        </div>
                        <h4 className="text-lg font-black text-denim uppercase tracking-tight">{subject}</h4>
                      </div>
                      <button
                        onClick={() => setConfirmDelete({ id: subject, type: 'category', subType: 'subject' })}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        title={`Delete ${subject}`}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    
                    {Object.entries(chapters).map(([chapter, chapterQuestions]: [string, any]) => (
                      <div key={chapter} className="ml-6 space-y-3">
                        <div className="flex items-center justify-between px-2 border-l-2 border-denim/20 pl-4">
                          <div className="flex items-center gap-2">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{chapter}</h5>
                            <button
                              onClick={() => setConfirmDelete({ id: chapter, type: 'category', subType: 'chapter', parentSubject: subject })}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="Delete Chapter"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          <div className="flex gap-1">
                            {[1,2,3,4,5,6,7,8,9,10].map(l => {
                              const count = chapterQuestions.filter((q: any) => (q.level || 1) === l).length;
                              return (
                                <div 
                                  key={l} 
                                  title={`Level ${l}: ${count} questions`}
                                  className={cn(
                                    "w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black",
                                    count >= 10 ? "bg-green-500 text-white" : count > 0 ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                                  )}
                                >
                                  {l}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {chapterQuestions.map((q: any) => (
                            <motion.div 
                              key={q.id} 
                              layout
                              className="card p-5 flex flex-col sm:flex-row justify-between items-start gap-4 hover:border-denim/30 transition-all group"
                            >
                              <div className="flex-1 w-full">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                  <span>{q.subject}</span>
                                  <span>•</span>
                                  <span>{q.chapter}</span>
                                  <span>•</span>
                                  <span className="text-denim">Level {q.level || 1}</span>
                                </div>
                                <p className="font-bold text-gray-800 leading-snug">{q.question}</p>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  {q.options.map((opt: string, idx: number) => (
                                    <div key={idx} className={cn(
                                      "text-[10px] px-3 py-2 rounded-xl border flex items-center justify-between",
                                      idx === q.correctIndex ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-gray-50/50 border-gray-100 text-gray-500"
                                    )}>
                                      <span className="truncate">{opt}</span>
                                      {idx === q.correctIndex && <CheckCircle size={10} />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => {
                                    const currentPath = q.subject ? `${q.subject}/${q.chapter}` : q.chapter;
                                    const newPath = prompt('Enter new path (Subject/Chapter):', currentPath);
                                    if (newPath && newPath !== currentPath) handleUpdateQuestionCategory(q.id, newPath);
                                  }}
                                  className="flex-1 sm:p-2 p-3 bg-denim/5 text-denim rounded-xl hover:bg-denim hover:text-white transition-all flex items-center justify-center"
                                  title="Move to Category"
                                >
                                  <FolderInput size={16} />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ id: q.id, type: 'question' })}
                                  className="flex-1 sm:p-2 p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {questions.length === 0 && (
                  <div className="text-center py-20 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <BookOpen className="text-gray-300" size={32} />
                    </div>
                    <p className="text-gray-400 font-bold">Your question bank is empty.</p>
                    <p className="text-xs text-gray-400 mt-1">Start by adding a question manually or use the AI Generator.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'books' && (
          <motion.div key="books" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
            <div className="card overflow-hidden border-2 border-denim/5 shadow-2xl shadow-denim/5">
              <div className="bg-denim p-8 text-white relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Sparkles size={24} className="text-yellow-300" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">AI Quiz Generator</h3>
                  <p className="text-sm text-white/70 font-medium max-w-md">
                    Upload a photo of a book page or document, and our AI will instantly craft 10 high-quality multiple-choice questions.
                  </p>
                </div>
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute right-10 bottom-10 opacity-10">
                  <BookOpen size={120} />
                </div>
              </div>

              <form onSubmit={handleGenerateAIQuiz} className="p-8 space-y-6 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                    <input 
                      type="text" 
                      required 
                      className="input-field bg-gray-50 text-lg font-bold py-4" 
                      placeholder="e.g. Biology" 
                      value={bookSubject}
                      onChange={(e) => setBookSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chapter / Quiz Title</label>
                    <input 
                      type="text" 
                      required 
                      className="input-field bg-gray-50 text-lg font-bold py-4" 
                      placeholder="e.g. Chapter 4" 
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Level</label>
                    <select 
                      required 
                      className="input-field bg-gray-50 text-lg font-bold py-4" 
                      value={bookLevel}
                      onChange={(e) => setBookLevel(parseInt(e.target.value))}
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(l => (
                        <option key={l} value={l}>Level {l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Source Document</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      id="book-upload"
                      onChange={(e) => setBookFile(e.target.files?.[0] || null)}
                    />
                    <label
                      htmlFor="book-upload"
                      className={cn(
                        "w-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer",
                        bookFile 
                          ? "border-green-200 bg-green-50/30" 
                          : "border-gray-200 hover:border-denim hover:bg-denim/5"
                      )}
                    >
                      <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all",
                        bookFile ? "bg-green-100 text-green-600" : "bg-gray-50 text-gray-400 group-hover:scale-110"
                      )}>
                        {bookFile ? <CheckCircle size={32} /> : <Upload size={32} />}
                      </div>
                      <span className="text-sm font-bold text-gray-600">
                        {bookFile ? bookFile.name : 'Drop your file here or click to browse'}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium">Supports Images and PDFs</p>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={aiLoading || !bookFile || !bookTitle || !bookSubject}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl",
                    aiLoading 
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                      : "bg-denim text-white hover:bg-denim/90 shadow-denim/20 active:scale-[0.98]"
                  )}
                >
                  {aiLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-denim"></div>
                      Processing Content...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="text-yellow-300" />
                      Generate Quiz Now
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'database' && (
          <motion.div key="database" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="card space-y-4">
              <h3 className="font-bold text-denim flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-500" />
                AI Student Importer
              </h3>
              <p className="text-xs text-gray-500">Upload a PDF or image containing student ID cards. AI will automatically extract and authorize them.</p>
              
              <form onSubmit={handleGenerateAIStudents} className="space-y-4">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    id="id-cards-upload"
                    onChange={(e) => setIdCardsFile(e.target.files?.[0] || null)}
                  />
                  <label
                    htmlFor="id-cards-upload"
                    className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-denim hover:bg-denim/5 transition-all cursor-pointer"
                  >
                    <Upload className="text-gray-400 mb-2" size={32} />
                    <span className="text-sm font-bold text-gray-600">
                      {idCardsFile ? idCardsFile.name : 'Choose ID Cards PDF/Image'}
                    </span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={aiLoading || !idCardsFile}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                      Processing ID Cards...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Extract & Add Students
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-denim">Authorized Students</h3>
              {adminStudents.map(student => (
                <div key={student.id} className="card p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">{student.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{student.studentId} • Roll: {student.roll}</p>
                  </div>
                  <button
                    onClick={() => setConfirmDelete({ id: student.id, type: 'admin_student' })}
                    className="text-red-400 hover:text-red-600 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="card space-y-4">
              <h3 className="font-bold text-denim flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-500" />
                AI Calendar Importer
              </h3>
              <p className="text-xs text-gray-500">Upload a photo of your school calendar. AI will extract school events (sports, tests, etc.) while filtering out religious and principal meetings.</p>
              
              <form onSubmit={handleGenerateAICalendar} className="space-y-4">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    id="calendar-upload"
                    onChange={(e) => setCalendarFile(e.target.files?.[0] || null)}
                  />
                  <label
                    htmlFor="calendar-upload"
                    className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-denim hover:bg-denim/5 transition-all cursor-pointer"
                  >
                    <Upload className="text-gray-400 mb-2" size={32} />
                    <span className="text-sm font-bold text-gray-600">
                      {calendarFile ? calendarFile.name : 'Choose Calendar Image/PDF'}
                    </span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={aiLoading || !calendarFile}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                      Extracting Events...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Extract & Add Events
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
