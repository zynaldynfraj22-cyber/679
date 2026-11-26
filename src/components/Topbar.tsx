import React from 'react';
import { Search, Bell, Sun, Moon, Menu, LogIn, User as UserIcon } from 'lucide-react';
import type { User } from 'firebase/auth';

interface TopbarProps {
  user: User | null;
  authLoading: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleMobileMenu: () => void;
  onOpenNotifications: () => void;
  onSignIn: () => void;
  collapsed: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  authLoading,
  darkMode,
  onToggleDarkMode,
  onToggleMobileMenu,
  onOpenNotifications,
  onSignIn,
  collapsed,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <header
      className={`sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300 px-4 sm:px-8 flex items-center justify-between gap-4 ${
        collapsed ? 'lg:mr-20' : 'lg:mr-72'
      }`}
    >
      {/* Right section: Mobile Menu + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleMobileMenu}
          aria-label="فتح القائمة"
          className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن درس، مادة، أو سؤال في بنك المعرفة..."
            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-emerald-600 dark:focus:border-emerald-500 rounded-xl pr-10 pl-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Left section: Actions & Profile */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleDarkMode}
          aria-label="تبديل المظهر"
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        <button
          onClick={onOpenNotifications}
          aria-label="الإشعارات"
          className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-white dark:ring-slate-900" />
        </button>

        {user ? (
          <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-sm">
              {user.displayName?.[0] ?? <UserIcon className="w-4 h-4" />}
            </div>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            disabled={authLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>دخول</span>
          </button>
        )}
      </div>
    </header>
  );
};
