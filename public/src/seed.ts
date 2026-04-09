import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const TEST_STUDENTS = [
  { studentId: '24-17-802', name: 'Tasmia Huda Noora', phone: '79757690', roll: '1001', grade: 'Ten-Sci' },
  { studentId: '25-18-917', name: 'Afraz Ahmed', phone: '97032151', roll: '1002', grade: 'Ten-Sci' },
  { studentId: '24-17-820', name: 'Miraz Uddin', phone: '99050417', roll: '1003', grade: 'Ten-Sci' },
  { studentId: '24-17-803', name: 'Najifa Alam', phone: '94777657', roll: '1004', grade: 'Ten-Sci' },
  { studentId: '24-17-804', name: 'Sabira Mushfirat', phone: '98197603', roll: '1005', grade: 'Ten-Sci' },
  { studentId: '24-17-808', name: 'Aisha Marine', phone: '92128199', roll: '1006', grade: 'Ten-Sci' },
  { studentId: '24-17-825', name: 'Shahriar Nafiz Sayed', phone: '78485445', roll: '1007', grade: 'Ten-Sci' },
  { studentId: '24-17-834', name: 'Abdul Hakeem', phone: '78573797', roll: '1008', grade: 'Ten-Sci' },
  { studentId: '24-17-821', name: 'Md Ashraful Islam Sorkar', phone: '95695816', roll: '1009', grade: 'Ten-Sci' },
  { studentId: '24-17-824', name: 'Alefa Alam', phone: '72130848', roll: '1010', grade: 'Ten-Sci' },
  { studentId: '24-17-811', name: 'Jannat Aloma', phone: '99414472', roll: '1011', grade: 'Ten-Sci' },
  { studentId: '24-17-809', name: 'Homaira', phone: '96399494', roll: '1012', grade: 'Ten-Sci' },
  { studentId: '24-17-810', name: 'Jannatul Ferdous Marua', phone: '94581313', roll: '1013', grade: 'Ten-Sci' },
  { studentId: '24-17-831', name: 'Mohammed Surov Azad', phone: '99074541', roll: '1014', grade: 'Ten-Sci' },
  { studentId: '25-18-918', name: 'Puja Rani Baidya', phone: '78330373', roll: '1015', grade: 'Ten-Sci' },
  { studentId: '26-19-1016', name: 'Snigdha Majumder', phone: '96962657', roll: '1016', grade: 'Ten-Sci' },
  { studentId: '25-18-923', name: 'Md Farhan Ullah', phone: '94322993', roll: '1017', grade: 'Ten-Sci' }
];

const SAMPLE_QUESTIONS = [
  // Mathematics - Algebra
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 1,
    question: 'What is 5 + 7?',
    options: ['10', '11', '12', '13'],
    correctIndex: 2
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 2,
    question: 'Solve for x: 2x = 10',
    options: ['2', '5', '10', '20'],
    correctIndex: 1
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 3,
    question: 'What is the value of 3^2 + 4^2?',
    options: ['7', '12', '25', '49'],
    correctIndex: 2
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 4,
    question: 'If x + 5 = 12, what is x?',
    options: ['5', '7', '12', '17'],
    correctIndex: 1
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 5,
    question: 'What is the square root of 144?',
    options: ['10', '11', '12', '14'],
    correctIndex: 2
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 6,
    question: 'Simplify: 2(x + 3)',
    options: ['2x + 3', '2x + 6', 'x + 6', '2x + 5'],
    correctIndex: 1
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 7,
    question: 'What is the value of x in 3x - 4 = 11?',
    options: ['3', '4', '5', '6'],
    correctIndex: 2
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 8,
    question: 'Which of these is a prime number?',
    options: ['4', '9', '15', '17'],
    correctIndex: 3
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 9,
    question: 'What is 15% of 200?',
    options: ['15', '20', '30', '45'],
    correctIndex: 2
  },
  {
    subject: 'Mathematics',
    chapter: 'Algebra Basics',
    level: 10,
    question: 'Solve for y: y/4 = 8',
    options: ['2', '12', '24', '32'],
    correctIndex: 3
  },
  // Science - Solar System
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 1,
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 2,
    question: 'What is the largest planet in our solar system?',
    options: ['Earth', 'Mars', 'Jupiter', 'Neptune'],
    correctIndex: 2
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 3,
    question: 'Which planet is closest to the Sun?',
    options: ['Mercury', 'Venus', 'Earth', 'Mars'],
    correctIndex: 0
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 4,
    question: 'What is the center of our solar system?',
    options: ['The Moon', 'The Earth', 'The Sun', 'The Milky Way'],
    correctIndex: 2
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 5,
    question: 'How many planets are in our solar system?',
    options: ['7', '8', '9', '10'],
    correctIndex: 1
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 6,
    question: 'Which planet has the famous rings?',
    options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    correctIndex: 1
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 7,
    question: 'What is the hottest planet in our solar system?',
    options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
    correctIndex: 1
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 8,
    question: 'Which planet is known as the Blue Giant?',
    options: ['Uranus', 'Neptune', 'Saturn', 'Earth'],
    correctIndex: 1
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 9,
    question: 'What force keeps planets in orbit?',
    options: ['Magnetism', 'Friction', 'Gravity', 'Electricity'],
    correctIndex: 2
  },
  {
    subject: 'Science',
    chapter: 'Solar System',
    level: 10,
    question: 'Which planet rotates on its side?',
    options: ['Venus', 'Mars', 'Uranus', 'Neptune'],
    correctIndex: 2
  }
];

// Generate Chemistry Chapter 1 questions (10 levels * 10 questions = 100 questions)
const CHEMISTRY_QUESTIONS: any[] = [];
const chemistryTopics = [
  "Atoms and Molecules", "Periodic Table", "Chemical Bonds", "Reactions", 
  "Acids and Bases", "States of Matter", "Organic Chemistry", "Thermodynamics",
  "Electrochemistry", "Nuclear Chemistry"
];

for (let level = 1; level <= 10; level++) {
  const topic = chemistryTopics[level - 1];
  for (let qNum = 1; qNum <= 10; qNum++) {
    CHEMISTRY_QUESTIONS.push({
      subject: 'Chemistry',
      chapter: 'Chapter 1: Foundations',
      level: level,
      question: `[Level ${level}] ${topic} - Question ${qNum}: What is a fundamental property of this topic?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: Math.floor(Math.random() * 4)
    });
  }
}

export async function seedQuestions() {
  console.log('Seeding questions...');
  const { collection, addDoc, getDocs, query, where } = await import('firebase/firestore');
  
  const ALL_TO_SEED = [...SAMPLE_QUESTIONS, ...CHEMISTRY_QUESTIONS];

  for (const q of ALL_TO_SEED) {
    // Check if question already exists to avoid duplicates
    const qry = query(
      collection(db, 'questions'), 
      where('question', '==', q.question),
      where('subject', '==', q.subject),
      where('level', '==', q.level)
    );
    const snap = await getDocs(qry);
    if (snap.empty) {
      // For SAMPLE_QUESTIONS (which only have 1 per level in the array), we add 10 variants
      // For CHEMISTRY_QUESTIONS (which already have 10 per level), we just add the one
      const isChemistry = q.subject === 'Chemistry';
      const count = isChemistry ? 1 : 10;

      for (let i = 0; i < count; i++) {
        await addDoc(collection(db, 'questions'), {
          ...q,
          question: (isChemistry || i === 0) ? q.question : `${q.question} (Variant ${i + 1})`
        });
      }
    }
  }
  console.log('Question seeding complete.');
}

export async function seedAdminStudents() {
  console.log('Seeding admin students...');
  for (const student of TEST_STUDENTS) {
    const docRef = doc(db, 'admin_students', student.studentId);
    await setDoc(docRef, student, { merge: true });
  }
  console.log('Seeding complete.');
}
