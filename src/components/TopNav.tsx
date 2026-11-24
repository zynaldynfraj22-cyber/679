import React from 'react';
import { LogIn, LogOut, Moon, Sun, Menu, X } from 'lucide-react';
import type { User } from 'firebase/auth';

export type AppRoute =
  | 'dashboard'
  | 'subjects'
  | 'lesson'
  | 'question_bank'
  | 'tutor'
  | 'coverage_cms';

interface TopNavProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  user: User | null;
  authLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function TopNav({
  activeRoute,
  onNavigate,
  user,
  authLoading,
  onSignIn,
  onSignOut,
  darkMode,
  onToggleDarkMode,
}: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems: { id: AppRoute; label: string }[] = [
    { id: 'dashboard', label: 'لوحة الطالب' },
    { id: 'subjects', label: 'المواد الدراسية' },
    { id: 'question_bank', label: 'بنك الأسئلة' },
    { id: 'tutor', label: 'المعلم الذكي' },
    { id: 'coverage_cms', label: 'تغطية المنهج و CMS' },
  ];

  const handleSelect = (route: AppRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700 rounded"
        >
          STUDY CORE
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="التنقل الرئيسي" className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive =
              activeRoute === item.id ||
              (activeRoute === 'lesson' && item.id === 'subjects');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-700 ${
                  isActive
                    ? 'border-sky-800 text-sky-900 dark:border-sky-400 dark:text-sky-300'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary action + theme switch */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              disabled={authLoading}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج ({user.displayName?.split(' ')[0] ?? 'الطالب'})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authLoading}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              activeRoute === item.id ||
              (activeRoute === 'lesson' && item.id === 'subjects');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSignIn();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-800 text-white text-sm font-semibold"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول بحساب جوجل</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
