import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateQuizFromBook(bookTitle: string, content: string | { data: string, mimeType: string }) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Generate 10 multiple-choice questions based on the following book content from "${bookTitle}". 
  The response must be a JSON array of objects, where each object has:
  - question: string
  - options: array of 4 strings
  - correctIndex: number (0-3)
  - chapter: string (the book title or specific chapter if identified)
  
  Make sure the questions are challenging but fair for students.`;

  const response = await ai.models.generateContent({
    model,
    contents: typeof content === 'string' 
      ? [{ parts: [{ text: prompt }, { text: content }] }]
      : { parts: [{ text: prompt }, { inlineData: content }] },
    config: {
      responseMimeType: "application/json",
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
            chapter: { type: Type.STRING }
          },
          required: ["question", "options", "correctIndex", "chapter"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

export async function extractStudentsFromIDCards(content: { data: string, mimeType: string }) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `You are an expert data extractor. I am providing a PDF or image containing multiple student ID cards. 
  Extract the information for EVERY student shown in the document.
  The response must be a JSON array of objects, where each object has:
  - studentId: string (e.g., "S12345")
  - name: string (Full name of the student)
  - phone: string (Phone number if available, otherwise empty string)
  - roll: string (Roll number if available, otherwise empty string)
  - grade: string (Grade or Class if available, otherwise empty string)
  
  If a field is missing for a student, use an empty string. 
  Ensure all students in the document are captured.`;

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

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

export async function extractEventsFromCalendar(content: { data: string, mimeType: string }) {
  const model = "gemini-3-flash-preview";
  
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
    console.log("Gemini Raw Response:", text);
    return JSON.parse(text);
  } catch (e) {
    console.error("Gemini Calendar Extraction Error:", e);
    throw e;
  }
}
