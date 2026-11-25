import React from 'react';
import {
  FolderOpen,
  Cloud,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  LogIn,
  ShieldCheck,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { Lesson } from '../types/curriculum';

interface GoogleDriveManagerProps {
  user: User | null;
  lessons: Lesson[];
  onSignIn: () => void;
}

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
}

export function GoogleDriveManager({ user, lessons, onSignIn }: GoogleDriveManagerProps) {
  const [accessToken, setAccessToken] = React.useState<string | null>(
    () => window.sessionStorage.getItem('gdrive_access_token')
  );
  const [files, setFiles] = React.useState<DriveFileItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [selectedLessonId, setSelectedLessonId] = React.useState(lessons[0]?.id ?? '');
  const [customNoteTitle, setCustomNoteTitle] = React.useState('');
  const [customNoteContent, setCustomNoteContent] = React.useState('');
  const [uploading, setUploading] = React.useState(false);

  const fetchDriveFiles = React.useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const qParam = encodeURIComponent("trashed = false");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${qParam}&pageSize=50&fields=files(id,name,mimeType,webViewLink,createdTime,size)`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        if (res.status === 401) {
          window.sessionStorage.removeItem('gdrive_access_token');
          setAccessToken(null);
          throw new Error('انتهت صلاحية رمز الوصول. يرجى إعادة تسجيل الدخول بحساب جوجل.');
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `خطأ في الاتصال بجوجل درايف (${res.status})`);
      }
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر جلب ملفات جوجل درايف.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user && accessToken) {
      void fetchDriveFiles(accessToken);
    }
  }, [user, accessToken, fetchDriveFiles]);

  const handleDriveSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        window.sessionStorage.setItem('gdrive_access_token', credential.accessToken);
        void fetchDriveFiles(credential.accessToken);
      } else {
        throw new Error('تعذر الحصول على رمز المصادقة لجوجل درايف.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل مصادقة Google Drive.');
    }
  };

  const handleUploadStudyNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const lessonObj = lessons.find((l) => l.id === selectedLessonId);
    const fileName = customNoteTitle.trim() || `ملخص_دراسي_${lessonObj?.titleAr ?? 'درس'}.txt`;
    const fileContent =
      customNoteContent.trim() ||
      `منصة STUDY CORE — ملخص درس: ${lessonObj?.titleAr ?? ''}\nالمرجع: ${lessonObj?.officialRef ?? ''}\nالملخص: ${lessonObj?.summaryAr ?? ''}`;

    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      const metadata = {
        name: fileName,
        mimeType: 'text/plain',
      };

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append('file', new Blob([fileContent], { type: 'text/plain' }));

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: form,
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'فشل رفع الملف إلى جوجل درايف.');
      }

      setNotice(`تم رفع الملف "${fileName}" بنجاح إلى جوجل درايف.`);
      setUploadModalOpen(false);
      setCustomNoteTitle('');
      setCustomNoteContent('');
      void fetchDriveFiles(accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الملف.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    // MANDATORY User Confirmation for destructive operation per skill instructions
    const confirmed = window.confirm(
      `هل أنت متأكد من رغبتك في حذف الملف "${fileName}" نهائياً من جوجل درايف؟ هذه الخطوة لا يمكن التراجع عنها.`
    );
    if (!confirmed || !accessToken) return;

    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('تعذر حذف الملف من جوجل درايف.');
      }

      setNotice(`تم حذف الملف "${fileName}" بنجاح.`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حذف الملف.');
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-400 mb-1">
            <Cloud className="w-4 h-4" />
            <span>تكامل Google Drive التعليمي</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            إدارة ومزامنة ملفات المنهج على جوجل درايف
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            تصفح ملفاتك الدراسية، وارفع ملخصاتك وخواص الاستذكار مباشرة إلى حسابك في Google Drive بإذنك.
          </p>
        </div>

        {user && accessToken && (
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>رفع ملخص دراسي جديد إلى Drive</span>
          </button>
        )}
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-emerald-200">
          {notice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs font-medium text-rose-900 dark:text-rose-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!user ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <FolderOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            يرجى تسجل الدخول بحساب جوجل للوصول إلى Google Drive
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            يتطلب ربط منصة STUDY CORE بملفاتك على جوجل درايف منح صلاحية الوصول لعرض وإدارة المستندات والملخصات.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول بحساب جوجل</span>
          </button>
        </div>
      ) : !accessToken ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <Cloud className="w-12 h-12 text-sky-700 mx-auto" />
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            تفعيل صلاحية الوصول إلى Google Drive
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            مرحباً {user.displayName}، انقر أدناه لمنح الأذونات اللازمة لتصفح ورفع الملفات إلى جوجل درايف بأمان.
          </p>
          <button
            type="button"
            onClick={() => void handleDriveSignIn()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ربط وتفعيل Google Drive</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="search"
                aria-label="بحث في ملفات جوجل درايف"
                placeholder="بحث في ملفات جوجل درايف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchDriveFiles(accessToken)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث الملفات</span>
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                {loading ? 'جاري تحميل الملفات من جوجل درايف...' : 'لم يتم العثور على ملفات في حسابك.'}
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {file.mimeType} {file.createdTime ? `· ${new Date(file.createdTime).toLocaleDateString('ar-OM')}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-sky-800 dark:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <span>فتح</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDeleteFile(file.id, file.name)}
                      aria-label={`حذف الملف ${file.name}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-lg w-full space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              رفع ملخص دراسي إلى Google Drive
            </h3>
            <form onSubmit={(e) => void handleUploadStudyNote(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="gdrive-lesson-select"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  الدرس المرتبط بالمخلص
                </label>
                <select
                  id="gdrive-lesson-select"
                  value={selectedLessonId}
                  onChange={(e) => setSelectedLessonId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.titleAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="gdrive-file-title"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  اسم الملف (اختياري)
                </label>
                <input
                  id="gdrive-file-title"
                  type="text"
                  placeholder="مثال: ملخص_الفيزياء_النووية.txt"
                  value={customNoteTitle}
                  onChange={(e) => setCustomNoteTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="gdrive-file-content"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  محتوى الملخص النصي
                </label>
                <textarea
                  id="gdrive-file-content"
                  rows={5}
                  placeholder="اكتب ملاحظاتك أو الصق محتوى المراجعة هنا..."
                  value={customNoteContent}
                  onChange={(e) => setCustomNoteContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? 'جاري الرفع...' : 'رفع الملف إلى Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
