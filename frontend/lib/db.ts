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
    fs.writeFileSync(filePath, content);
    return `uploads/${safeName}`;
  } catch (err) {
    console.error('Failed to save file to disk:', err);
    return '';
  }
}
