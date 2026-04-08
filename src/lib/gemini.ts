import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.error("GEMINI_API_KEY is missing! Please set it in the app settings.");
}
const ai = new GoogleGenAI({ apiKey });

export async function generateQuizFromBook(bookTitle: string, content: string | { data: string, mimeType: string }) {
  const model = "gemini-3-flash-preview";
  console.log("Gemini: Generating quiz for", bookTitle, "using model", model);
  
  const systemInstruction = `You are an elite curriculum developer. Your sole purpose is to generate high-volume, high-quality question banks. 
  You MUST always generate exactly 100 questions as requested. 
  Never truncate the list. Never summarize. 
  Each question must be unique and derived from the provided content.
  If the content is short, expand on the concepts to reach the 100-question goal.`;

  const prompt = `TASK: Generate a comprehensive quiz based on the provided content from the book "${bookTitle}".
  
  REQUIREMENTS:
  1. QUANTITY: You MUST generate EXACTLY 100 unique multiple-choice questions. This is a non-negotiable hard requirement.
  2. QUALITY: Questions should range from basic recall to advanced critical thinking.
  3. STRUCTURE: Each question must have exactly 4 options.
  4. FORMAT: Return the data as a JSON array of objects.
  
  JSON SCHEMA:
  - question: string (The question text)
  - options: string[] (Array of exactly 4 strings)
  - correctIndex: number (0-3, index of the correct answer)
  - chapter: string (The specific chapter name if found, otherwise use "${bookTitle}")
  - difficulty: string ("Easy", "Medium", or "Hard" based on the question complexity)
  
  Ensure the questions are accurate to the source material and pedagogically sound.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: typeof content === 'string' 
        ? [{ parts: [{ text: prompt }, { text: content }] }]
        : { parts: [{ text: prompt }, { inlineData: content }] },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 20000, // Substantially increased for 100 questions + thinking tokens
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctIndex: { type: Type.NUMBER },
              chapter: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] }
            },
            required: ["question", "options", "correctIndex", "chapter", "difficulty"]
          }
        }
      }
    });

    const text = response.text;
    console.log("Gemini: Received response length", text?.length);
    const parsed = JSON.parse(text || "[]");
    console.log(`Gemini: Parsed ${parsed.length} questions.`);
    return parsed;
  } catch (e) {
    console.error("Gemini: generateQuizFromBook failed", e);
    throw e;
  }
}

export async function extractStudentsFromIDCards(content: { data: string, mimeType: string }) {
  const model = "gemini-3-flash-preview";
  console.log("Gemini: Extracting students using model", model);
  
  const prompt = `You are a highly accurate data extraction specialist. 
  TASK: Extract student information from the provided document (ID cards, lists, or registration forms).
  
  INSTRUCTIONS:
  1. Scan the entire document for student details.
  2. Extract: Full Name, Student ID, Phone Number, Roll Number, and Grade/Class.
  3. If a field is not found, use an empty string "".
  4. Ensure every student visible in the document is captured.
  
  JSON SCHEMA:
  - studentId: string (Unique identifier)
  - name: string (Full name)
  - phone: string (Contact number)
  - roll: string (Roll number)
  - grade: string (Grade or Class)
  
  Return the result as a JSON array of student objects.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }, { inlineData: content }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              studentId: { type: Type.STRING },
              name: { type: Type.STRING },
              phone: { type: Type.STRING },
              roll: { type: Type.STRING },
              grade: { type: Type.STRING }
            },
            required: ["studentId", "name", "phone", "roll", "grade"]
          }
        }
      }
    });

    const text = response.text;
    console.log("Gemini: Received students response length", text?.length);
    return JSON.parse(text || "[]");
  } catch (e) {
    console.error("Gemini: extractStudentsFromIDCards failed", e);
    throw e;
  }
}

export async function extractEventsFromCalendar(content: { data: string, mimeType: string }) {
  const model = "gemini-3-flash-preview";
  console.log("Gemini: Extracting events using model", model);
  
  const prompt = `You are an expert at extracting school calendar events from images. 
  I am providing an image of a monthly school calendar. 
  
  CONTEXT:
  - The image shows a calendar month (e.g., "January 2026").
  - Below the grid, there is a list of events with their dates.
  
  TASK:
  1. Identify the Month and Year (e.g., "January 2026").
  2. Extract events from the list at the bottom.
  3. For each event:
     - If the date is a range (e.g., "24-29"):
       - **CRITICAL: Return EXACTLY ONE JSON object for this entire range.**
       - The title should be the event name (e.g., "Class Test 2").
       - The date should be the START date of the range (e.g., 2026-01-24).
       - The endDate should be the END date of the range (e.g., 2026-01-29).
     - Otherwise, return one JSON object where date and endDate are the same.
     - Format all dates as YYYY-MM-DD.
  
  FILTERING RULES (IMPORTANT):
  - INCLUDE: School-specific events like "New Academic Year Commences", "Annual Sports Competition", "Class Tests", "Exams", "School Festivals".
  - EXCLUDE: Religious holidays (e.g., "Isra & Miraj", "Eid").
  - EXCLUDE: Administrative/Staff-only meetings (e.g., "Principal's Meeting").
  - EXCLUDE: General national holidays that aren't school-specific (e.g., "Accession Day of Sultan").
  
  OUTPUT:
  Return a JSON array of objects with:
  - title: string (The event name)
  - date: string (YYYY-MM-DD)
  - description: string (Brief context)`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }, { inlineData: content }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              endDate: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "date", "description"]
          }
        }
      }
    });

    const text = response.text || "[]";
    console.log("Gemini: Received events response length", text.length);
    return JSON.parse(text);
  } catch (e) {
    console.error("Gemini: extractEventsFromCalendar failed", e);
    throw e;
  }
}
