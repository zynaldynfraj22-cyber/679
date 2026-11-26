import React from 'react';
import {
  Home,
  BookOpen,
  Calendar,
  Award,
  BarChart2,
  Bot,
  Settings,
  HardDrive,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Sparkles,
} from 'lucide-react';
import type { AppRoute } from './TopNav';
import type { User } from 'firebase/auth';

interface SidebarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  user: User | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeRoute,
  onNavigate,
  user,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onSignOut,
}) => {
  const navItems: { id: AppRoute; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <Home className="w-5 h-5" /> },
    { id: 'subjects', label: 'المواد الدراسية', icon: <BookOpen className="w-5 h-5" />, badge: '8 مواد' },
    { id: 'diploma_exams', label: 'الامتحانات الوزارية', icon: <Award className="w-5 h-5" />, badge: 'موسم 2026' },
    { id: 'planner', label: 'خطة الدراسة', icon: <Calendar className="w-5 h-5" /> },
    { id: 'revision', label: 'المراجعة الذكية', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'reports', label: 'تقدمي الدراسي', icon: <BarChart2 className="w-5 h-5" /> },
    { id: 'tutor', label: 'المساعد الذكي', icon: <Bot className="w-5 h-5" /> },
    { id: 'source_quality', label: 'مكتبة المصادر (2000)', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'google_drive', label: 'سحابة Google Drive', icon: <HardDrive className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleSelect = (route: AppRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        aria-label="القائمة الجانبية الرئيسية"
        className={`fixed top-0 right-0 z-50 h-screen bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-20' : 'w-72'
        } ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black shadow-md shrink-0">
                SC
              </div>
              <div>
                <span className="font-display font-black text-base tracking-tight text-slate-900 dark:text-white block">
                  STUDY CORE
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                  عُمان · الصف 12 العلمي
                </span>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black shadow-md">
              SC
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 items-center justify-center hover:bg-slate-200 cursor-pointer"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              activeRoute === item.id ||
              (activeRoute === 'lesson' && item.id === 'subjects');
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <span className="flex-1 text-right truncate font-medium">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Account Footer in Sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-emerald-700/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0">
                  {user?.displayName?.[0] ?? 'ط'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.displayName ?? 'طالب متميز'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email ?? 'عُمان التعليمية'}</p>
                </div>
              </div>
              {user && (
                <button
                  onClick={onSignOut}
                  aria-label="تسجيل الخروج"
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-emerald-700/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center">
                {user?.displayName?.[0] ?? 'ط'}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
