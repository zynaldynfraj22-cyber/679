import React from 'react';
import { Settings, Moon, Sun, Monitor, Bell, Shield, User, Globe, HelpCircle, Check } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';

interface SettingsViewProps {
  user: FirebaseUser | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, darkMode, onToggleDarkMode }) => {
  const [activeTab, setActiveTab] = React.useState<'appearance' | 'study' | 'notifications' | 'account' | 'privacy' | 'about'>('appearance');
  const [dailyGoalMinutes, setDailyGoalMinutes] = React.useState<number>(() => {
    return Number(localStorage.getItem('study_core_daily_goal') ?? 60);
  });
  const [fontSize, setFontSize] = React.useState<'small' | 'medium' | 'large'>(() => {
    return (localStorage.getItem('study_core_font_size') as any) ?? 'medium';
  });
  const [notificationsEnabled, setNotificationsEnabled] = React.useState<boolean>(() => {
    return localStorage.getItem('study_core_notifications') !== 'false';
  });
  const [savedNotice, setSavedNotice] = React.useState(false);

  const handleSave = () => {
    localStorage.setItem('study_core_daily_goal', String(dailyGoalMinutes));
    localStorage.setItem('study_core_font_size', fontSize);
    localStorage.setItem('study_core_notifications', String(notificationsEnabled));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-8 pb-16 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            لوحة التخصيص والإعدادات المركزية
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            إعدادات المنصة وتفضيلات الدراسة
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            خصص مظهر المنصة، أهدافك الدراسية، وإشعارات المتابعة بكل سهولة.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-colors cursor-pointer shadow-md flex items-center gap-2 self-start sm:self-auto"
        >
          <Check className="w-4 h-4" />
          <span>حفظ التغييرات</span>
        </button>
      </div>

      {savedNotice && (
        <div role="alert" className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>تم حفظ الإعدادات والتفضيلات بنجاح محلياً!</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-xs">
        {[
          { id: 'appearance', label: 'المظهر والواجهة', icon: <Sun className="w-4 h-4" /> },
          { id: 'study', label: 'تفضيلات الدراسة', icon: <Settings className="w-4 h-4" /> },
          { id: 'notifications', label: 'الإشعارات', icon: <Bell className="w-4 h-4" /> },
          { id: 'account', label: 'الحساب الشخصي', icon: <User className="w-4 h-4" /> },
          { id: 'privacy', label: 'الخصوصية والبيانات', icon: <Shield className="w-4 h-4" /> },
          { id: 'about', label: 'حول المنصة', icon: <HelpCircle className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              إعدادات المظهر والمظهر العام
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={onToggleDarkMode}
                className={`border rounded-2xl p-5 flex flex-col items-center gap-3 transition-all cursor-pointer ${
                  !darkMode
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Sun className="w-6 h-6 text-amber-500" />
                <span className="font-bold text-sm">الوضع الفاتح (عاجي)</span>
              </button>

              <button
                onClick={onToggleDarkMode}
                className={`border rounded-2xl p-5 flex flex-col items-center gap-3 transition-all cursor-pointer ${
                  darkMode
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Moon className="w-6 h-6 text-indigo-400" />
                <span className="font-bold text-sm">الوضع الداكن (أخضر عميق)</span>
              </button>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col items-center gap-3 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300">
                <Monitor className="w-6 h-6 text-emerald-600" />
                <span className="font-bold text-sm">تلقائي حسب النظام</span>
              </div>
            </div>

            <div className="pt-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">حجم الخط</label>
              <div className="flex gap-3">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      fontSize === size
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {size === 'small' ? 'صغير' : size === 'medium' ? 'متوسط (افتراضي)' : 'كبير'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'study' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              تفضيلات وأهداف الدراسة
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                الهدف الدراسي اليومي (بالدقائق)
              </label>
              <input
                type="number"
                min={15}
                max={300}
                step={15}
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
                className="w-full sm:w-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-2 focus:outline-emerald-600"
              />
              <p className="text-xs text-slate-500 mt-1">المعدل الموصى به لطلبة الصف الثاني عشر العلمي هو 60–120 دقيقة يومياً.</p>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              إعدادات الإشعارات والتنبيهات
            </h2>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">تفعيل التنبيهات الفورية والمراجعات</h3>
                <p className="text-xs text-slate-500 mt-0.5">تلقي تذكيرات بمواعيد المراجعة واقتراب الامتحانات التجريبية.</p>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              معلومات الحساب الشخصي
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 block mb-1">اسم الطالب</span>
                <strong className="text-sm text-slate-900 dark:text-white">{user?.displayName ?? 'طالب متميز (جلسة معاينة)'}</strong>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 block mb-1">البريد الإلكتروني</span>
                <strong className="text-sm text-slate-900 dark:text-white">{user?.email ?? 'student@oman.edu.om'}</strong>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 block mb-1">الصف والمرحلة</span>
                <strong className="text-sm text-slate-900 dark:text-white">الصف الثاني عشر — المسار العلمي</strong>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 block mb-1">العام الدراسي</span>
                <strong className="text-sm text-slate-900 dark:text-white">2026–2027</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              الخصوصية وإدارة البيانات المحلية
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              تتم معالجة بياناتك الأكاديمية ونتائج اختباراتك بسرية تامة وتخزينها بأمان وفق المعايير المعتمدة لقطاع التعليم في سلطنة عُمان.
            </p>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              حول منصة STUDY CORE
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              منصة STUDY CORE للتعليم الذكي واختبارات دبلوم التعليم العام — الإصدار الاحترافي 2.5 (2026–2027). مصممة خصيصاً لدعم طلبة الصف الثاني عشر في سلطنة عُمان.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
