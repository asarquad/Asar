import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Bell, Clock, MapPin, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';

const monthColors = [
  { bg: '#E6D5B3', text: '#4A3022' }, // Shortbread
  { bg: '#CBA374', text: '#4A3022' }, // Toast
  { bg: '#D9C29C', text: '#4A3022' }, // Tawny
  { bg: '#C4A482', text: '#4A3022' }, // Latte
  { bg: '#E6D5C4', text: '#4A3022' }, // Seaside
  { bg: '#E6D5B3', text: '#4A3022' }, // Shortbread
  { bg: '#CBA374', text: '#4A3022' }, // Toast
  { bg: '#D9C29C', text: '#4A3022' }, // Tawny
  { bg: '#C4A482', text: '#4A3022' }, // Latte
  { bg: '#E6D5C4', text: '#4A3022' }, // Seaside
  { bg: '#E6D5B3', text: '#4A3022' }, // Shortbread
  { bg: '#CBA374', text: '#4A3022' }, // Toast
];

const MonthCard = ({ year, month, colorBg, colorText, isSelected, onClick }: { year: number, month: number, colorBg: string, colorText: string, isSelected: boolean, onClick: () => void }) => {
  const monthDate = new Date(year, month, 1);
  const monthName = monthDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = monthDate.getDay();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-1"></div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(<div key={`day-${i}`} className="p-1 flex items-center justify-center">{i}</div>);
  }

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-3xl shadow-sm cursor-pointer transition-all duration-300 ${isSelected ? 'ring-4 ring-butter/50 scale-105 z-10' : 'hover:scale-105'}`} 
      style={{ backgroundColor: colorBg, color: colorText }}
    >
      <h3 className="font-bold mb-4">{monthName}</h3>
      <div className="grid grid-cols-7 text-[10px] text-center opacity-60 mb-2 font-bold">
        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
      </div>
      <div className="grid grid-cols-7 text-xs text-center gap-y-2 font-medium">
        {days}
      </div>
    </div>
  );
};

export default function Social() {
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [dayFilter, setDayFilter] = useState<'today' | 'tomorrow' | 'all'>('all');
  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: '',
    endDate: '',
    time: '',
    location: ''
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startDate', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Error fetching events:", err);
      // Fallback data if firestore fails
      if (events.length === 0) {
        setEvents([
          { id: '1', title: "Midterm Exams", startDate: "2026-04-15", endDate: "2026-04-20", time: "09:00 AM", location: "Main Hall" },
          { id: '2', title: "Science Fair", startDate: "2026-04-20", endDate: "2026-04-20", time: "10:00 AM", location: "Gymnasium" },
          { id: '3', title: "Parent-Teacher Meeting", startDate: "2026-04-25", endDate: "2026-04-25", time: "02:00 PM", location: "Classrooms" },
        ]);
      }
    });
    return unsub;
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || 'anonymous'
      });
      setShowModal(false);
      setNewEvent({ title: '', startDate: '', endDate: '', time: '', location: '' });
    } catch (err) {
      console.error("Error adding event:", err);
      alert("Failed to add event. Check console for details.");
    }
  };

  const getProgress = (start: string, end: string) => {
    if (!start || !end || start === end) return 0;
    const now = new Date().getTime();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime() + 86400000; // Add 1 day to include the end date fully
    if (now < s) return 0;
    if (now > e) return 100;
    return ((now - s) / (e - s)) * 100;
  };

  const filteredEvents = events.filter(event => {
    if (!event.startDate) return false;
    const [startYear, startMonthStr, startDayStr] = event.startDate.split('-');
    const startMonth = parseInt(startMonthStr, 10) - 1;
    const startDay = parseInt(startDayStr, 10);
    
    let endMonth = startMonth;
    if (event.endDate) {
      const [, endMonthStr] = event.endDate.split('-');
      endMonth = parseInt(endMonthStr, 10) - 1;
    }
    
    // Check if the selected month falls within the event's start and end months
    const inMonth = selectedMonth >= startMonth && selectedMonth <= endMonth;
    if (!inMonth) return false;

    if (dayFilter === 'all') return true;

    const today = new Date();
    const eventDate = new Date(parseInt(startYear), startMonth, startDay);
    
    if (dayFilter === 'today') {
      return eventDate.getDate() === today.getDate() && eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
    }
    
    if (dayFilter === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return eventDate.getDate() === tomorrow.getDate() && eventDate.getMonth() === tomorrow.getMonth() && eventDate.getFullYear() === tomorrow.getFullYear();
    }

    return true;
  });

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const selectedMonthName = new Date(currentYear, selectedMonth, 1).toLocaleString('default', { month: 'long' });

  const handleMonthClick = (index: number) => {
    setSelectedMonth(index);
    setViewMode('agenda');
  };

  const nextMonth = () => setSelectedMonth(prev => (prev + 1) % 12);
  const prevMonth = () => setSelectedMonth(prev => (prev - 1 + 12) % 12);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto pb-32">
      {/* Header & View Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-butter" size={32} />
          <h1 className="text-3xl md:text-4xl font-black text-butter uppercase tracking-widest italic">{currentYear} CALENDAR</h1>
        </div>
        
        <div className="flex items-center bg-butter/10 rounded-full p-1 border border-butter/20">
          <button 
            onClick={() => setViewMode('agenda')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${viewMode === 'agenda' ? 'bg-butter text-forest' : 'text-butter/60 hover:text-butter'}`}
          >
            Agenda
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${viewMode === 'grid' ? 'bg-butter text-forest' : 'text-butter/60 hover:text-butter'}`}
          >
            Grid
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Calendar Grid */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <MonthCard 
              key={i} 
              year={currentYear} 
              month={i} 
              colorBg={monthColors[i].bg} 
              colorText={monthColors[i].text} 
              isSelected={selectedMonth === i}
              onClick={() => handleMonthClick(i)}
            />
          ))}
        </div>
      ) : (
        /* Agenda View */
        <div className="space-y-8 max-w-3xl mx-auto">
          {/* Month Selector */}
          <div className="flex items-center justify-center gap-6 text-butter">
            <button onClick={prevMonth} className="p-2 hover:bg-butter/10 rounded-full transition-all">
              <ChevronLeft size={24} />
            </button>
            <div className="flex items-center gap-4 text-xl font-black tracking-widest">
              <span className="text-butter/40 cursor-pointer hover:text-butter/60 transition-all" onClick={prevMonth}>
                {months[(selectedMonth - 1 + 12) % 12]}
              </span>
              <span className="text-3xl text-butter scale-110">
                {months[selectedMonth]}
              </span>
              <span className="text-butter/40 cursor-pointer hover:text-butter/60 transition-all" onClick={nextMonth}>
                {months[(selectedMonth + 1) % 12]}
              </span>
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-butter/10 rounded-full transition-all">
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Filters & Add Event */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDayFilter('today')}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all border ${dayFilter === 'today' ? 'bg-butter text-forest border-butter' : 'bg-transparent text-butter/60 border-butter/20 hover:border-butter/40 hover:text-butter'}`}
              >
                TODAY
              </button>
              <button 
                onClick={() => setDayFilter('tomorrow')}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all border ${dayFilter === 'tomorrow' ? 'bg-butter text-forest border-butter' : 'bg-transparent text-butter/60 border-butter/20 hover:border-butter/40 hover:text-butter'}`}
              >
                TOMORROW
              </button>
              <button 
                onClick={() => setDayFilter('all')}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all border ${dayFilter === 'all' ? 'bg-butter text-forest border-butter' : 'bg-transparent text-butter/60 border-butter/20 hover:border-butter/40 hover:text-butter'}`}
              >
                ALL
              </button>
            </div>
            <button 
              onClick={() => setShowModal(true)} 
              className="bg-butter text-forest px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-butter/90 transition-all shadow-lg shadow-butter/20"
            >
              <Plus size={20} /> <span>Add Event</span>
            </button>
          </div>

          {/* Event List */}
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const isContinuous = event.endDate && event.endDate !== event.startDate;
              const progress = isContinuous ? getProgress(event.startDate, event.endDate) : 0;
              
              const startDateObj = new Date(event.startDate);
              const dayOfWeek = startDateObj.toLocaleString('default', { weekday: 'short' }).toUpperCase();
              const dayOfMonth = startDateObj.getDate();
              const monthStr = startDateObj.toLocaleString('default', { month: 'short' }).toUpperCase();

              return (
                <div key={event.id} className="bg-butter/10 border border-butter/20 rounded-[2rem] p-6 flex items-center gap-6 hover:bg-butter/15 transition-all group relative overflow-hidden">
                  {/* Left Date Section */}
                  <div className="flex flex-col items-center justify-center min-w-[60px] shrink-0">
                    <span className="text-xs font-black text-butter/60 uppercase tracking-widest">{dayOfWeek}</span>
                    <span className="text-4xl font-black text-butter my-1">{dayOfMonth}</span>
                    <span className="text-xs font-black text-butter/60 uppercase tracking-widest">{monthStr}</span>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-16 bg-butter/20 shrink-0"></div>

                  {/* Inner Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-butter/10 rounded-2xl p-4 inline-block min-w-[200px] max-w-full">
                      <div className="flex items-center gap-2 text-butter/80 text-xs font-bold mb-1">
                        <Clock size={14} />
                        <span>{event.time || 'All Day'}</span>
                      </div>
                      <h3 className="font-black text-lg text-butter truncate">{event.title}</h3>
                      {event.location && (
                        <div className="flex items-center gap-1 text-butter/60 text-xs mt-1">
                          <MapPin size={12} />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {isContinuous && (
                      <div className="mt-4 max-w-md">
                        <div className="flex justify-between text-[10px] text-butter/60 mb-1 font-bold uppercase tracking-widest">
                          <span>Event Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-forest rounded-full overflow-hidden border border-butter/10">
                          <div className="h-full bg-butter transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Action */}
                  <button className="w-12 h-12 rounded-full border-2 border-butter/20 flex items-center justify-center text-butter/60 hover:text-butter hover:border-butter hover:bg-butter/10 transition-all shrink-0">
                    <Plus size={24} />
                  </button>
                </div>
              );
            })}
            {filteredEvents.length === 0 && (
              <div className="text-center py-16 bg-butter/5 rounded-[2rem] border border-butter/10">
                <CalendarIcon className="mx-auto text-butter/20 mb-4" size={48} />
                <p className="text-butter/60 font-bold text-lg">No events scheduled.</p>
                <p className="text-butter/40 text-sm mt-1">Click 'Add Event' to create one.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-forest border border-butter/20 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-butter uppercase tracking-widest">Add Event</h2>
              <button onClick={() => setShowModal(false)} className="text-butter/60 hover:text-butter">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-butter/60 uppercase tracking-widest mb-1">Event Title</label>
                <input 
                  type="text" 
                  required
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full bg-butter/5 border border-butter/10 rounded-xl px-4 py-3 text-butter focus:outline-none focus:border-butter/40"
                  placeholder="e.g., Science Fair"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-butter/60 uppercase tracking-widest mb-1">Start Date</label>
                  <input 
                    type="date" 
                    required
                    value={newEvent.startDate}
                    onChange={e => setNewEvent({...newEvent, startDate: e.target.value})}
                    className="w-full bg-butter/5 border border-butter/10 rounded-xl px-4 py-3 text-butter focus:outline-none focus:border-butter/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-butter/60 uppercase tracking-widest mb-1">End Date (Optional)</label>
                  <input 
                    type="date" 
                    value={newEvent.endDate}
                    onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                    className="w-full bg-butter/5 border border-butter/10 rounded-xl px-4 py-3 text-butter focus:outline-none focus:border-butter/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-butter/60 uppercase tracking-widest mb-1">Time</label>
                  <input 
                    type="time" 
                    value={newEvent.time}
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                    className="w-full bg-butter/5 border border-butter/10 rounded-xl px-4 py-3 text-butter focus:outline-none focus:border-butter/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-butter/60 uppercase tracking-widest mb-1">Location</label>
                  <input 
                    type="text" 
                    value={newEvent.location}
                    onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                    className="w-full bg-butter/5 border border-butter/10 rounded-xl px-4 py-3 text-butter focus:outline-none focus:border-butter/40"
                    placeholder="e.g., Room 101"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-butter text-forest font-black py-4 rounded-xl mt-4 hover:bg-butter/90 transition-all uppercase tracking-widest">
                Save Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
