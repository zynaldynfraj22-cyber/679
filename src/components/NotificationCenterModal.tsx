import React from 'react';
import { NotificationItem } from '../types/intelligence';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([
    {
      id: 'n-1',
      userId: 'user',
      type: 'REVISION_DUE',
      titleAr: 'موعد مراجعة مستحق اليوم',
      messageAr: 'لديك مراجعة مجدولة لدرس قوانين كيرشوف في الفيزياء.',
      createdAtIso: 'منذ ساعتين',
      isRead: false,
    },
    {
      id: 'n-2',
      userId: 'user',
      type: 'ACHIEVEMENT_UNLOCKED',
      titleAr: 'إنجاز جديد فتح!',
      messageAr: 'لقد حصلت على شارة "بطل التكرار المتباعد" نظراً لالتزامك.',
      createdAtIso: 'منذ يوم',
      isRead: true,
    },
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scaleUp">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">مركز الإشعارات والتنبيهات</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold hover:bg-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border ${
                n.isRead
                  ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                  : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{n.titleAr}</h3>
                <span className="text-[11px] text-slate-500">{n.createdAtIso}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{n.messageAr}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
