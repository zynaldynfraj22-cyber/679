import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  FileWarning,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  CurriculumSource,
  Lesson,
  OfficialLessonCatalogItem,
  Semester,
  Subject,
  SubjectId,
  Unit,
  VerificationRecord,
  VerificationStatus,
} from '../types/curriculum';
import { computeCurriculumCoverage } from '../utils/coverageEngine';

interface CoverageDashboardProps {
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  catalog: OfficialLessonCatalogItem[];
  sources: CurriculumSource[];
  verificationRecords: VerificationRecord[];
  onOpenLesson: (lesson: Lesson) => void;
  onEditLessonInCms: (lessonId: string) => void;
  onCreateMissingLessonInCms: (catalogItem: OfficialLessonCatalogItem) => void;
}

const STATUS_DISPLAY: Record<VerificationStatus, { labelAr: string; className: string }> = {
  VERIFIED: { labelAr: 'موثق (VERIFIED)', className: 'text-emerald-700 dark:text-emerald-400' },
  NEEDS_REVIEW: {
    labelAr: 'قيد المراجعة (NEEDS_REVIEW)',
    className: 'text-amber-700 dark:text-amber-400',
  },
  OUTDATED: { labelAr: 'قديم / مؤقت (OUTDATED)', className: 'text-rose-700 dark:text-rose-400' },
  UNAVAILABLE: {
    labelAr: 'غير متاح (UNAVAILABLE)',
    className: 'text-slate-500 dark:text-slate-400',
  },
};

export function CoverageDashboard({
  subjects,
  units,
  lessons,
  catalog,
  sources,
  verificationRecords,
  onOpenLesson,
  onEditLessonInCms,
  onCreateMissingLessonInCms,
}: CoverageDashboardProps) {
  const [subjectFilter, setSubjectFilter] = React.useState<SubjectId | 'all'>('all');
  const [semesterFilter, setSemesterFilter] = React.useState<Semester | 'all'>('all');
  const [unitFilter, setUnitFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<VerificationStatus | 'all'>('all');

  const availableUnits = React.useMemo(
    () =>
      units.filter(
        (u) =>
          (subjectFilter === 'all' || u.subjectId === subjectFilter) &&
          (semesterFilter === 'all' || u.semester === semesterFilter)
      ),
    [units, subjectFilter, semesterFilter]
  );

  React.useEffect(() => {
    if (unitFilter !== 'all' && !availableUnits.some((u) => u.id === unitFilter)) {
      setUnitFilter('all');
    }
  }, [availableUnits, unitFilter]);

  const summary = React.useMemo(
    () =>
      computeCurriculumCoverage(
        subjects,
        units,
        lessons,
        catalog,
        sources,
        verificationRecords,
        {
          subjectId: subjectFilter,
          semester: semesterFilter,
          unitId: unitFilter,
          verificationStatus: statusFilter,
        }
      ),
    [
      subjects,
      units,
      lessons,
      catalog,
      sources,
      verificationRecords,
      subjectFilter,
      semesterFilter,
      unitFilter,
      statusFilter,
    ]
  );

  const lessonById = React.useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const unitById = React.useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const subjectById = React.useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-sky-800 dark:text-sky-400 mb-1">
              لوحة التغطية والتدقيق المنهجي · سلطنة عُمان (2026–2027)
            </p>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
              تقرير التغطية الفعلي للمنهج العُماني والمصادر الرسمية
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              تُحسب النسب أدناه بشفافية تامة استناداً إلى الفهرس الرسمي الكامل للصف الثاني عشر
              العلمي ({catalog.length} درساً رسمياً عبر 34 وحدة دراسية).
            </p>
          </div>
          <div className="text-left shrink-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">نسبة تغطية الدروس الحالية</p>
            <p className="font-mono text-3xl font-extrabold text-sky-800 dark:text-sky-400 tabular-nums">
              {summary.overallCoveragePercent}%
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label
              htmlFor="cov-filter-subject"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              المادة الدراسية
            </label>
            <select
              id="cov-filter-subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value as SubjectId | 'all')}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="all">جميع المواد (4)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titleAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cov-filter-semester"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              الفصل الدراسي
            </label>
            <select
              id="cov-filter-semester"
              value={String(semesterFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setSemesterFilter(v === 'all' ? 'all' : (Number(v) as Semester));
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="all">الفصلان الأول والثاني</option>
              <option value="1">الفصل الأول</option>
              <option value="2">الفصل الثاني</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="cov-filter-unit"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              الوحدة الدراسية
            </label>
            <select
              id="cov-filter-unit"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="all">جميع الوحدات ({availableUnits.length})</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  الوحدة {u.unitNumber}: {u.titleAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cov-filter-status"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
            >
              حالة التحقق
            </label>
            <select
              id="cov-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as VerificationStatus | 'all')}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="VERIFIED">موثق (VERIFIED)</option>
              <option value="NEEDS_REVIEW">قيد المراجعة (NEEDS_REVIEW)</option>
              <option value="OUTDATED">قديم (OUTDATED)</option>
              <option value="UNAVAILABLE">غير متاح (UNAVAILABLE)</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPI Metrics Grid */}
      <section
        aria-label="مؤشرات تغطية المنهج"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            المواد والوحدات الموثقة
          </p>
          <p className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {summary.verifiedUnits}/{summary.totalUnits}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {summary.verifiedSubjects} من {summary.totalSubjects} مواد رئيسية
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            الدروس المكتملة من الفهرس
          </p>
          <p className="font-mono text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {summary.implementedLessonsCount}/{summary.totalOfficialCatalogLessons}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {summary.verifiedLessonsCount} درساً موثقاً بالبنية القياسية
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            دروس رسمية بانتظار الإنشاء
          </p>
          <p className="font-mono text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
            {summary.missingLessonsCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {summary.incompleteLessonsCount} دروس منشأة ناقصة الأقسام
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            تنتظر مراجعة أو تحقق مصدر
          </p>
          <p className="font-mono text-2xl font-bold text-rose-700 dark:text-rose-400 tabular-nums">
            {summary.needsReviewLessonsCount + summary.outdatedLessonsCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {summary.sourcesNeedingVerificationCount} مصادر تحتاج تحقق رابط مباشر
          </p>
        </div>
      </section>

      {/* Subject Breakdown Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          تفصيل التغطية حسب المادة الدراسية
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
              <tr>
                <th className="px-4 py-2.5 font-bold">المادة</th>
                <th className="px-4 py-2.5 font-bold">الوحدات</th>
                <th className="px-4 py-2.5 font-bold">الدروس الرسمية</th>
                <th className="px-4 py-2.5 font-bold">المبنية حالياً</th>
                <th className="px-4 py-2.5 font-bold">المتبقية</th>
                <th className="px-4 py-2.5 font-bold">قيد المراجعة/قديم</th>
                <th className="px-4 py-2.5 font-bold">نسبة التغطية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {summary.subjectBreakdowns.map((row) => (
                <tr key={row.subjectId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {row.titleAr}{' '}
                    <span className="font-mono text-xs text-slate-500">({row.code})</span>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{row.officialUnitsCount}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {row.officialCatalogLessonsCount}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                    {row.implementedLessonsCount}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-amber-700 dark:text-amber-400">
                    {row.missingLessonsCount}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-rose-700 dark:text-rose-400">
                    {row.needsReviewLessonsCount + row.outdatedLessonsCount}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums font-bold">
                    {row.coveragePercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Catalog Items: Implemented & Missing */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              خريطة الدروس الرسمية (المتاحة والمفقودة)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يعرض الفهرس الحالي {summary.filteredCatalog.length} درساً مطابقاً للتصفية. يمكنك
              فتح الدرس المبني أو إنشاء أي درس مفقود مباشرة في محرر CMS.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[540px] overflow-y-auto pr-1">
          {summary.filteredCatalog.map((item) => {
            const linked = item.linkedLessonId ? lessonById.get(item.linkedLessonId) : undefined;
            const unit = unitById.get(item.unitId);
            const subj = subjectById.get(item.subjectId);
            const effectiveStatus = linked?.verificationStatus ?? item.verificationStatus;
            const statusMeta = STATUS_DISPLAY[effectiveStatus];

            return (
              <div
                key={item.id}
                className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {subj?.titleAr}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      الفصل {item.semester === 1 ? 'الأول' : 'الثاني'} · الوحدة{' '}
                      {unit?.unitNumber ?? '-'} ({unit?.titleAr})
                    </span>
                    <span aria-hidden="true">·</span>
                    {linked ? (
                      <span className={`inline-flex items-center gap-1 font-semibold ${statusMeta.className}`}>
                        {effectiveStatus === 'VERIFIED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        <span>{statusMeta.labelAr}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                        <FileWarning className="w-3.5 h-3.5" />
                        <span>غير مبني بعد (ناقص)</span>
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-white">{item.titleAr}</p>

                  {(linked?.classificationNoteAr || item.classificationNoteAr) && (
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      ملاحظة تدقيق: {linked?.classificationNoteAr ?? item.classificationNoteAr}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {linked ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenLesson(linked)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        معاينة الطالب
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditLessonInCms(linked.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
                      >
                        تعديل في CMS
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCreateMissingLessonInCms(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-800 text-white hover:bg-sky-900 cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>إنشاء في CMS</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sources Registry + Verification Audit History */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              سجل المصادر الرسمية (MOE Oman)
            </h2>
            <ShieldCheck className="w-4 h-4 text-sky-700 dark:text-sky-400" />
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {sources.map((src) => {
              const meta = STATUS_DISPLAY[src.verificationStatus];
              return (
                <div key={src.id} className="py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {src.titleAr}
                    </p>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-800 dark:text-sky-400 hover:underline shrink-0"
                    >
                      <span>فتح</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {src.publisherAr} · <span className="font-mono">{src.publicationYear}</span> ·{' '}
                    <span className={`font-semibold ${meta.className}`}>{meta.labelAr}</span>
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{src.notesAr}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              سجل قرارات التدقيق وإعادة التصنيف
            </h2>
            <Sparkles className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {verificationRecords.map((rec) => {
              const meta = STATUS_DISPLAY[rec.status];
              return (
                <div key={rec.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-bold ${meta.className}`}>{meta.labelAr}</span>
                    <span className="font-mono text-slate-400">{rec.entityId}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {rec.reviewerAr}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rec.notesAr}
                  </p>
                </div>
              );
            })}
          </div>

          {summary.anomalies.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                تنبيهات آلية مكتشفة ({summary.anomalies.length})
              </p>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {summary.anomalies.slice(0, 6).map((a, idx) => (
                  <li key={idx}>• {a.messageAr}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
