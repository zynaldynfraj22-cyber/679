import React from 'react';
import { Subject, SubjectId } from '../types/curriculum';
import { OFFICIAL_DIPLOMA_BLUEPRINTS, OFFICIAL_EXAMINATION_SOURCES, OFFICIAL_PAST_PAPERS_LIBRARY } from '../data/diplomaExamSpecs';

interface Props {
  subjects: Subject[];
  isAdminUser: boolean;
  onStartSimulation: (blueprintId: string) => void;
}

export const DiplomaExamHub: React.FC<Props> = ({ subjects, onStartSimulation }) => {
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<SubjectId | 'all'>('all');
  const [activeTab, setActiveTab] = React.useState<'blueprints' | 'sources' | 'past_papers'>('blueprints');

  const filteredBlueprints =
    selectedSubjectId === 'all'
      ? OFFICIAL_DIPLOMA_BLUEPRINTS
      : OFFICIAL_DIPLOMA_BLUEPRINTS.filter((b) => b.subjectId === selectedSubjectId);

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-60 h-60 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block bg-sky-500/30 text-sky-200 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-sky-400/30">
            محاكي امتحانات دبلوم التعليم العام في سلطنة عُمان · 2026–2027
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            مركز الامتحانات التجريبية والمواصفات الوزارية الرسمية
          </h1>
          <p className="text-sky-100 text-sm sm:text-base leading-relaxed">
            منظومة دقيقة تحاكي اختبارات الوزارة النهائية لطلبة الصف الثاني عشر (المسار العلمي) وفق وثائق التقويم الرسمية لأعوام 2026–2027 مع توزيع الأوزان النسبية للوحدات وأهدافي التقويم AO1 وAO2.
          </p>
        </div>
      </div>

      {/* Navigation Tabs & Subject Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div
          role="tablist"
          aria-label="تبويب الأقسام"
          className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'blueprints'}
            onClick={() => setActiveTab('blueprints')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'blueprints'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            مخططات الامتحانات ومواصفاتها
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'sources'}
            onClick={() => setActiveTab('sources')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'sources'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            وثائق التقويم الوزارية الرسمية
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'past_papers'}
            onClick={() => setActiveTab('past_papers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'past_papers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            أرشيف الامتحانات السابقة
          </button>
        </div>

        {activeTab === 'blueprints' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSubjectId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedSubjectId === 'all'
                  ? 'bg-sky-900 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              جميع المواد
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  selectedSubjectId === s.id
                    ? 'bg-sky-900 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {s.titleAr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Blueprints */}
      {activeTab === 'blueprints' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBlueprints.map((bp) => {
            const subject = subjects.find((s) => s.id === bp.subjectId);
            return (
              <div
                key={bp.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                      {subject?.titleAr ?? bp.subjectId} · الفصل {bp.semester}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">العام: {bp.academicYear}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{bp.titleAr}</h3>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    الدرجة الكلية: {bp.totalMarks} درجة · الزمن: {bp.durationMinutes / 60} ساعات · عدد الأسئلة: {bp.questionCountRange.min}–{bp.questionCountRange.max} مفردة
                  </p>

                  {/* Assessment Objectives */}
                  <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-4">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">توزيع أهداف التقويم:</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block">AO1 (المعرفة والفهم)</span>
                        <strong className="text-slate-900 dark:text-white text-sm">{bp.assessmentObjectives.ao1Marks} درجة</strong>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block">AO2 (التطبيق والاستدلال)</span>
                        <strong className="text-slate-900 dark:text-white text-sm">{bp.assessmentObjectives.ao2Marks} درجة</strong>
                      </div>
                    </div>
                  </div>

                  {/* Unit Weights Preview */}
                  <div className="space-y-2 mb-6">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">أوزان الوحدات الدراسية:</h4>
                    <div className="space-y-1.5">
                      {bp.unitWeights.map((u) => (
                        <div key={u.unitId} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950/40 px-3 py-2 rounded-xl">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            وحدة {u.unitNumber}: {u.titleAr}
                          </span>
                          <span className="font-bold text-sky-700 dark:text-sky-400">
                            {u.weightPercent}% ({u.allocatedMarks} درجة)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onStartSimulation(bp.id)}
                  className="w-full bg-sky-900 hover:bg-sky-950 text-white font-bold text-xs sm:text-sm py-3 rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  بدء المحاكاة الرسمية للامتحان التجريبي ↗
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Sources */}
      {activeTab === 'sources' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">وثائق التقويم الرسمية المعتمدة (2026–2027)</h2>
          <div className="space-y-4">
            {OFFICIAL_EXAMINATION_SOURCES.map((src) => (
              <div key={src.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    رمز الوثيقة: {src.documentCode}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mt-2">{src.titleAr}</h3>
                  <p className="text-xs text-slate-500 mt-1">{src.publisherAr} · إصدار {src.version} ({src.publicationYear})</p>
                </div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap bg-sky-800 hover:bg-sky-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  فتح المستند الرسمي ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Past Papers */}
      {activeTab === 'past_papers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">أرشيف امتحانات دبلوم التعليم العام السابقة</h2>
          <div className="space-y-4">
            {OFFICIAL_PAST_PAPERS_LIBRARY.map((paper) => {
              const subj = subjects.find((s) => s.id === paper.subjectId);
              return (
                <div key={paper.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {subj?.titleAr ?? paper.subjectId} · {paper.academicYear} (الفصل {paper.semester})
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mt-2">امتحان دبلوم التعليم العام — {paper.sessionAr}</h3>
                    <p className="text-xs text-slate-500 mt-1">مصدر موثق من أرشيف وزارة التربية والتعليم العُمانية</p>
                  </div>
                  <a
                    href={paper.examPaperUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="whitespace-nowrap bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    استعراض الأرشيف الرسمي ↗
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
