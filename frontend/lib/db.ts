import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

// Ensure database and uploads directory exist
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface DbData {
  users: any[];
  classes: any[];
  announcements: any[];
  assignments: any[];
  submissions: any[];
  materials?: any[];
  quizzes?: any[];
  quizSubmissions?: any[];
}

export function readDb(): DbData {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return {
        users: [],
        classes: [],
        announcements: [],
        assignments: [],
        submissions: [],
        materials: [],
        quizzes: [],
        quizSubmissions: [],
      };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.materials) parsed.materials = [];
    if (!parsed.quizzes) parsed.quizzes = [];
    if (!parsed.quizSubmissions) parsed.quizSubmissions = [];
    return parsed;
  } catch (err) {
    console.error('Error reading db.json:', err);
    return {
      users: [],
      classes: [],
      announcements: [],
      assignments: [],
      submissions: [],
      materials: [],
      quizzes: [],
      quizSubmissions: [],
    };
  }
}

export function writeDb(data: DbData): boolean {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to db.json:', err);
    return false;
  }
}

export function saveUploadedFile(fileName: string, content: string | Buffer): string {
  try {
    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    
    // Check if content is a Base64 Data URL (e.g., data:application/...;base64,...)
    if (typeof content === 'string' && content.startsWith('data:') && content.includes(';base64,')) {
      const base64Data = content.split(';base64,')[1];
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    } else if (typeof content === 'string' && /^[A-Za-z0-9+/=]{100,}$/.test(content.trim().slice(0, 500))) {
      // Raw base64 string
      fs.writeFileSync(filePath, Buffer.from(content.trim(), 'base64'));
    } else {
      fs.writeFileSync(filePath, content);
    }
    return `uploads/${safeName}`;
  } catch (err) {
    console.error('Failed to save file to disk:', err);
    return '';
  }
}
