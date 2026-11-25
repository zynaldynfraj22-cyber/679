import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextFunction, Request, Response } from 'express';
import { getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface FirebaseRuntimeConfig {
  projectId: string;
  firestoreDatabaseId: string;
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  adminSource: 'custom_claim' | 'firestore_admins' | 'bootstrap_email' | 'none';
  claims: Record<string, unknown>;
}

export type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
};

let cachedConfig: FirebaseRuntimeConfig | null = null;
let firestoreDisabledReason: string | null = null;

export function getFirebaseRuntimeConfig(): FirebaseRuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
  let fileConfig: { projectId?: string; firestoreDatabaseId?: string } = {};
  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
        projectId?: string;
        firestoreDatabaseId?: string;
      };
    } catch {
      fileConfig = {};
    }
  }

  const projectId = (
    process.env.FIREBASE_PROJECT_ID ||
    fileConfig.projectId ||
    ''
  ).trim();
  const firestoreDatabaseId = (
    process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
    fileConfig.firestoreDatabaseId ||
    '(default)'
  ).trim();

  cachedConfig = { projectId, firestoreDatabaseId };
  return cachedConfig;
}

export function isPlaceholderFirebaseConfig(cfg: FirebaseRuntimeConfig): boolean {
  return (
    !cfg.projectId ||
    cfg.projectId.includes('remixed-project-id') ||
    cfg.firestoreDatabaseId.includes('remixed-firestore-database-id')
  );
}

export function getAdminApp(): App | null {
  const cfg = getFirebaseRuntimeConfig();
  if (isPlaceholderFirebaseConfig(cfg)) {
    return null;
  }
  return getApps().length > 0 ? getApp() : initializeApp({ projectId: cfg.projectId });
}

export function getAdminFirestore(): { db: Firestore | null; unavailableReason: string | null } {
  if (firestoreDisabledReason) {
    return { db: null, unavailableReason: firestoreDisabledReason };
  }
  const app = getAdminApp();
  if (!app) {
    return { db: null, unavailableReason: 'FIREBASE_NOT_CONFIGURED' };
  }
  const cfg = getFirebaseRuntimeConfig();
  try {
    const db =
      cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)'
        ? getFirestore(app, cfg.firestoreDatabaseId)
        : getFirestore(app);
    return { db, unavailableReason: null };
  } catch (err) {
    firestoreDisabledReason = err instanceof Error ? err.message : 'FIRESTORE_INIT_FAILED';
    return { db: null, unavailableReason: firestoreDisabledReason };
  }
}

export function markAdminFirestoreUnavailable(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('Could not load the default credentials') ||
    msg.includes('UNAUTHENTICATED') ||
    msg.includes('7 PERMISSION_DENIED')
  ) {
    firestoreDisabledReason =
      'خدمة Admin Firestore غير مفوضة بصلاحيات IAM على هذا المشروع بعد (يرجى مراجعة دليل التهيئة).';
  }
  return firestoreDisabledReason ?? msg;
}

export function getAdminFirestoreStatus(): { available: boolean; reason: string | null } {
  const { db, unavailableReason } = getAdminFirestore();
  return { available: Boolean(db), reason: unavailableReason };
}

function getBootstrapAdminEmails(): Set<string> {
  const raw = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || 'zynaldynfraj22@gmail.com';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function resolveAdminRole(decoded: {
  uid: string;
  email?: string;
  email_verified?: boolean;
  admin?: unknown;
  role?: unknown;
}): Promise<{
  isAdmin: boolean;
  source: AuthenticatedUser['adminSource'];
}> {
  // Never grant admin privileges to unverified accounts
  if (decoded.email_verified !== true) {
    return { isAdmin: false, source: 'none' };
  }

  if (decoded.admin === true || decoded.role === 'admin') {
    return { isAdmin: true, source: 'custom_claim' };
  }

  // Optional Firestore /admins/{uid} lookup if Admin Firestore IAM is available
  const { db } = getAdminFirestore();
  if (db) {
    try {
      const snap = await db.collection('admins').doc(decoded.uid).get();
      if (snap.exists) {
        return { isAdmin: true, source: 'firestore_admins' };
      }
    } catch (err) {
      markAdminFirestoreUnavailable(err);
    }
  }

  // Transitional bootstrap admin check (requires verified email)
  const email = (decoded.email ?? '').trim().toLowerCase();
  if (email && getBootstrapAdminEmails().has(email)) {
    return { isAdmin: true, source: 'bootstrap_email' };
  }

  return { isAdmin: false, source: 'none' };
}

export function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

export type TokenVerifier = (idToken: string) => Promise<DecodedIdToken | {
  uid: string;
  email?: string;
  email_verified?: boolean;
  admin?: unknown;
  role?: unknown;
  [key: string]: unknown;
}>;

const defaultTokenVerifier: TokenVerifier = async (idToken: string) => {
  const app = getAdminApp();
  if (!app) {
    throw new Error('FIREBASE_ADMIN_UNCONFIGURED');
  }
  return getAuth(app).verifyIdToken(idToken);
};

export function createAuthMiddlewares(verifier: TokenVerifier = defaultTokenVerifier) {
  async function authenticateToken(
    req: AuthenticatedRequest
  ): Promise<{ ok: true; user: AuthenticatedUser } | { ok: false; status: number; error: string }> {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return {
        ok: false,
        status: 401,
        error: 'يلزم تسجيل الدخول بحسابك للوصول إلى هذه الخدمة (رمز التحقق مفقود).',
      };
    }

    try {
      const decoded = await verifier(token);
      if (!decoded || typeof decoded.uid !== 'string' || decoded.uid.length < 3) {
        return {
          ok: false,
          status: 401,
          error: 'تعذر التحقق من هوية المستخدم. يرجى إعادة تسجيل الدخول.',
        };
      }

      const roleInfo = await resolveAdminRole(decoded);
      const authUser: AuthenticatedUser = {
        uid: decoded.uid,
        email: typeof decoded.email === 'string' ? decoded.email : '',
        emailVerified: decoded.email_verified === true,
        isAdmin: roleInfo.isAdmin,
        adminSource: roleInfo.source,
        claims: decoded as Record<string, unknown>,
      };

      req.authUser = authUser;
      return { ok: true, user: authUser };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('FIREBASE_ADMIN_UNCONFIGURED')) {
        return {
          ok: false,
          status: 503,
          error: 'خدمة التحقق من الهوية غير مهيأة على الخادم حالياً.',
        };
      }
      return {
        ok: false,
        status: 401,
        error: 'انتهت صلاحية الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول مجدداً.',
      };
    }
  }

  const requireAuthenticatedUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = await authenticateToken(req);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    next();
  };

  const requireVerifiedUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = await authenticateToken(req);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    if (!result.user.emailVerified) {
      res.status(403).json({
        error: 'يتطلب هذا الإجراء تفعيل البريد الإلكتروني لحسابك أولاً.',
      });
      return;
    }
    next();
  };

  const requireAdministrator = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = await authenticateToken(req);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    if (!result.user.emailVerified || !result.user.isAdmin) {
      res.status(403).json({
        error: 'هذا الإجراء مقتصر على مشرفي المنهج المعتمدين فقط.',
      });
      return;
    }
    next();
  };

  return {
    requireAuthenticatedUser,
    requireVerifiedUser,
    requireAdministrator,
  };
}

const defaultMiddlewares = createAuthMiddlewares();
export const requireAuthenticatedUser = defaultMiddlewares.requireAuthenticatedUser;
export const requireVerifiedUser = defaultMiddlewares.requireVerifiedUser;
export const requireAdministrator = defaultMiddlewares.requireAdministrator;
