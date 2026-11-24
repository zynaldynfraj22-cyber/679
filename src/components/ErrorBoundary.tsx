import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'حدث خطأ غير متوقع في المنصة.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('STUDY CORE ErrorBoundary caught error:', error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6"
        >
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-right">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              تعذر عرض هذه الصفحة مؤقتاً
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              واجه التطبيق خطأً أثناء معالجة البيانات. يمكنك إعادة تحميل الصفحة للمتابعة بأمان.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium bg-sky-800 text-white rounded-lg hover:bg-sky-900 transition-colors"
            >
              إعادة تحميل المنصة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
