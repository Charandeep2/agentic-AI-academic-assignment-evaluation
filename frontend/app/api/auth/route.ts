import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = readDb();
  // Return users without passwords for safe frontend display
  const safeUsers = (db.users || []).map(({ password, ...rest }) => rest);
  return NextResponse.json({ users: safeUsers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const db = readDb();
    if (!db.users) db.users = [];

    // ==========================================
    // ACTION: REGISTER NEW USER
    // ==========================================
    if (action === 'register') {
      const { username, password, fullName, email, role, department } = body;

      if (!username || !password || !fullName || !email) {
        return NextResponse.json(
          { error: 'Please provide all required fields: username, password, full name, and email.' },
          { status: 400 }
        );
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();
      const cleanFullName = fullName.trim();
      const userRole = role === 'faculty' ? 'faculty' : 'student';
      const userDept = department?.trim() || (userRole === 'faculty' ? 'Computer Science & AI' : 'Computer Science');

      // Check if username or email already exists
      const existingUser = db.users.find(
        u => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
      );

      if (existingUser) {
        if (existingUser.username.toLowerCase() === cleanUsername) {
          return NextResponse.json({ error: `Username "${username}" is already taken.` }, { status: 409 });
        }
        return NextResponse.json({ error: `Email "${email}" is already registered.` }, { status: 409 });
      }

      // Generate unique user ID and avatar
      const newUserId = `u-${userRole}-${Date.now()}`;
      const avatarSeed = encodeURIComponent(cleanFullName);
      const newUser = {
        id: newUserId,
        username: cleanUsername,
        password: password,
        fullName: cleanFullName,
        email: cleanEmail,
        role: userRole,
        department: userDept,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`,
        createdAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      writeDb(db);

      // Async sync to SQLite database backend (fails gracefully if backend offline)
      try {
        fetch('http://localhost:8000/api/db/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUsername,
            email: cleanEmail,
            fullName: cleanFullName,
            role: userRole,
            department: userDept,
            password: password,
          }),
        }).catch(() => {});
      } catch (e) {
        // Ignored
      }

      const { password: _, ...safeUser } = newUser;
      return NextResponse.json({
        success: true,
        message: 'Account registered successfully!',
        user: safeUser,
      });
    }

    // ==========================================
    // ACTION: LOGIN / AUTHENTICATE
    // ==========================================
    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json({ error: 'Username/email and password are required.' }, { status: 400 });
    }

    const cleanIdentifier = username.trim().toLowerCase();
    const user = db.users.find(
      u =>
        (u.username.toLowerCase() === cleanIdentifier || u.email.toLowerCase() === cleanIdentifier) &&
        u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username/email or password. Please verify your credentials.' },
        { status: 401 }
      );
    }

    const { password: _, ...safeUser } = user;
    return NextResponse.json({
      success: true,
      message: 'Logged in successfully!',
      user: safeUser,
    });
  } catch (err: any) {
    console.error('Auth error in POST /api/auth:', err);
    return NextResponse.json({ error: err.message || 'Authentication failed' }, { status: 500 });
  }
}
