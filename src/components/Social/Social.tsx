import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  MoreHorizontal, 
  LayoutGrid, 
  List,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addDays,
  startOfDay,
  parseISO
} from 'date-fns';
import { cn } from '../../lib/utils';

interface Event {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  time?: string;
  description?: string;
  color?: string;
}

const MONTH_COLORS = [
  'bg-[#E8D5B5] text-[#5D4037]', // Jan (Shortbread)
  'bg-[#C5A381] text-white',     // Feb (Toast)
  'bg-[#8B5E3C] text-white',     // Mar (Nutmeg)
  'bg-[#D2B48C] text-[#5D4037]', // Apr (Tawny)
  'bg-[#B8977E] text-white',     // May (Latte)
  'bg-[#7B4B31] text-white',     // Jun (Cocoa)
  'bg-[#4E342E] text-white',     // Jul (Hazelnut)
  'bg-[#9E4638] text-white',     // Aug (Umber)
  'bg-[#C06C4D] text-white',     // Sep (Cinnamon)
  'bg-[#EAD8C0] text-[#5D4037]', // Oct (Seaside)
  'bg-[#8B5E3C] text-white',     // Nov (Nutmeg repeat)
  'bg-[#4E342E] text-white',     // Dec (Hazelnut repeat)
];

const DAILY_COLORS = [
  'bg-[#8B5E3C] text-white',     // Nutmeg
  'bg-[#C06C4D] text-white',     // Cinnamon
  'bg-[#B8977E] text-white',     // Latte
  'bg-[#9E4638] text-white',     // Umber
  'bg-[#7B4B31] text-white',     // Cocoa
];

export default function Calendar() {
  const navigate = useNavigate();
  const [view, setView] = useState<'agenda' | 'grid'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    description: ''
  });

  useEffect(() => {
    // Check admin status
    if (auth.currentUser?.email === 'afrajahme2@gmail.com') {
      setIsAdmin(true);
    }

    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : undefined)
        } as Event;
      });
      setEvents(eventsData);
    }, (err: any) => {
      console.error("Calendar Snapshot Error:", err);
      if (err.code === 'resource-exhausted' || err.message?.includes('Quota exceeded')) {
        if (!window.location.search.includes('error=quota')) {
          const newUrl = window.location.pathname + '?error=quota' + window.location.hash;
          window.history.replaceState({}, '', newUrl);
          window.location.reload();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      await addDoc(collection(db, 'events'), {
        title: newEvent.title,
        date: Timestamp.fromDate(parseISO(newEvent.date)),
        endDate: newEvent.endDate ? Timestamp.fromDate(parseISO(newEvent.endDate)) : null,
        description: newEvent.description,
        createdAt: Timestamp.now()
      });
      setShowAddModal(false);
      setNewEvent({
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        endDate: '',
        description: ''
      });
    } catch (err) {
      console.error("Error adding event:", err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!isAdmin) return;
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId || !isAdmin) return;
    try {
      await deleteDoc(doc(db, 'events', confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  const renderAgendaView = () => {
    const filteredEvents = events.filter(e => isSameMonth(e.date, currentDate));

    if (filteredEvents.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
          <CalendarIcon className="mx-auto text-gray-200 mb-2" size={48} />
          <p className="text-gray-400 font-medium italic">No events scheduled for this period</p>
        </div>
      );
    }

    const containerVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05
        }
      }
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 10 },
      show: { opacity: 1, y: 0 }
    };

    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {filteredEvents.map((event, idx) => {
          const colorClass = DAILY_COLORS[idx % DAILY_COLORS.length];
          const isMultiDay = event.endDate && !isSameDay(event.date, event.endDate);

          return (
            <motion.div
              key={event.id}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              className={cn(
                "rounded-[2.5rem] p-6 flex gap-6 relative overflow-hidden min-h-[140px] transition-shadow hover:shadow-lg",
                colorClass
              )}
            >
              <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-white/20 pr-6">
                <span className="text-xs font-bold uppercase opacity-70">{format(event.date, 'EEE')}</span>
                <span className="text-3xl font-black">{format(event.date, 'd')}</span>
                <span className="text-xs font-bold uppercase opacity-70">{format(event.date, 'MMM')}</span>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-2">
                <div className="flex items-center gap-2">
                  {isMultiDay && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      Until {format(event.endDate!, 'd MMM')}
                    </span>
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-black leading-tight">{event.title}</h3>
                  {event.description && (
                    <p className="text-xs opacity-70 mt-1 line-clamp-2 font-medium">{event.description}</p>
                  )}
                </div>

                {isMultiDay && (
                  <div className="flex flex-col gap-1 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">Event Progress</span>
                      <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">
                        {(() => {
                          const now = startOfDay(new Date());
                          const start = startOfDay(event.date);
                          const end = startOfDay(event.endDate!);
                          if (now > end) return 'Completed';
                          if (now < start) return 'Upcoming';
                          return 'In Progress';
                        })()}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${(() => {
                            const now = startOfDay(new Date());
                            const start = startOfDay(event.date);
                            const end = startOfDay(event.endDate!);
                            if (now < start) return 0;
                            if (now > end) return 100;
                            const total = end.getTime() - start.getTime();
                            if (total === 0) return 100;
                            const elapsed = now.getTime() - start.getTime();
                            return Math.round((elapsed / total) * 100);
                          })()}%` 
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-white/40 via-[#4DD0E1] to-[#00B4D8] shadow-[0_0_10px_rgba(0,180,216,0.4)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <button 
                  onClick={() => handleDeleteEvent(event.id)}
                  className="absolute top-6 right-6 bg-white/10 hover:bg-red-500 text-white p-2 rounded-full transition-all backdrop-blur-sm"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  const renderGridView = () => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

    const gridContainerVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.03
        }
      }
    };

    const gridItemVariants = {
      hidden: { opacity: 0, scale: 0.98 },
      show: { opacity: 1, scale: 1 }
    };

    return (
      <motion.div 
        variants={gridContainerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4"
      >
        {months.map((month, idx) => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const startDate = startOfWeek(monthStart);
          const endDate = endOfWeek(monthEnd);
          const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

          return (
            <motion.div
              key={month.toString()}
              variants={gridItemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setCurrentDate(month);
                setView('agenda');
              }}
              className={cn(
                "rounded-[2rem] p-4 aspect-square flex flex-col cursor-pointer transition-shadow hover:shadow-md",
                MONTH_COLORS[idx]
              )}
            >
              <h3 className="text-sm font-bold mb-2">{format(month, 'MMMM')}</h3>
              <div className="grid grid-cols-7 gap-1 text-[8px] flex-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-center opacity-50 font-bold">{d}</div>
                ))}
                {calendarDays.map((day, dIdx) => (
                  <div 
                    key={dIdx} 
                    className={cn(
                      "text-center flex items-center justify-center rounded-full aspect-square",
                      !isSameMonth(day, month) && "opacity-20",
                      isSameDay(day, new Date()) && "bg-white text-black font-black"
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className="p-6 space-y-6 pb-24 bg-[#F8F8F8] min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm hover:bg-black hover:text-white transition-all group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <div className="flex gap-2 bg-white p-1 rounded-full shadow-sm border border-gray-100">
            <button 
              onClick={() => setView('agenda')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all",
                view === 'agenda' ? "bg-black text-white" : "text-gray-400"
              )}
            >
              Agenda
            </button>
            <button 
              onClick={() => setView('grid')}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all",
                view === 'grid' ? "bg-black text-white" : "text-gray-400"
              )}
            >
              Grid
            </button>
          </div>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm hover:bg-black hover:text-white transition-all"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {/* Month Selector - Only in Agenda View */}
      {view === 'agenda' && (
        <div className="flex items-center justify-center gap-8 py-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="text-gray-300 hover:text-black">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-300">{format(subMonths(currentDate, 1), 'MMM')}</span>
            <h2 className="text-xl font-black uppercase tracking-widest">{format(currentDate, 'MMM')}</h2>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-300">{format(addMonths(currentDate, 1), 'MMM')}</span>
          </div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="text-gray-300 hover:text-black">
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: view === 'agenda' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: view === 'agenda' ? 10 : -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {view === 'agenda' ? renderAgendaView() : renderGridView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-md space-y-6 relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute right-6 top-6 text-gray-400 hover:text-black"
              >
                <X size={24} />
              </button>

              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight">Add Event</h3>
                <p className="text-sm text-gray-500 font-medium">Schedule a new activity for the students.</p>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Event Title</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Math Quiz" 
                    className="input-field"
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Start Date</label>
                    <input 
                      required
                      type="date" 
                      className="input-field"
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">End Date (Optional)</label>
                    <input 
                      type="date" 
                      className="input-field"
                      value={newEvent.endDate}
                      onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Description (Optional)</label>
                  <textarea 
                    placeholder="Details about the event..." 
                    className="input-field min-h-[100px] py-4"
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  />
                </div>

                <button type="submit" className="btn-primary w-full py-5 rounded-3xl bg-black hover:bg-gray-800">
                  Create Event
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800">Delete Event?</h4>
                <p className="text-gray-500 text-sm mt-2">This action cannot be undone. The event will be permanently removed.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 rounded-2xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
