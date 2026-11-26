import React from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import {
  checkUserIsAdmin,
  ensureUserProfile,
  fetchPublicQuestionsFromApi,
  fetchPublishedCurriculumFromFirestore,
  fetchServerAttemptsApi,
  saveCmsLessonToFirestore,
  saveCmsObjectiveToFirestore,
  saveCmsSourceToFirestore,
  saveCmsUnitToFirestore,
  saveLessonProgress,
  saveVerificationRecordToFirestore,
  seedCurriculumToFirestore,
  subscribeUserAttempts,
  subscribeUserProgress,
  updateUserActiveSemester,
} from './services/firestoreService';
import { OMAN_SUBJECTS, OMAN_UNITS } from './data/subjectsAndUnits';
import { CENTRAL_QUESTION_BANK, PRELOADED_LESSONS } from './data/questionBank';
import {
  ACADEMIC_YEAR_2026_2027,
  INITIAL_VERIFICATION_RECORDS,
  OFFICIAL_CURRICULUM_CATALOG,
  OFFICIAL_LEARNING_OBJECTIVES,
  OMAN_CURRICULUM_SOURCES,
  OMAN_SEMESTERS,
} from './data/sourcesAndCatalog';
import type {
  CurriculumSource,
  ExamAttempt,
  ExamSubmitResponse,
  LearningObjective,
  Lesson,
  LessonProgress,
  OfficialLessonCatalogItem,
  PublicQuestion,
  Semester,
  Subject,
  SubjectId,
  Unit,
  UserProfile,
  VerificationRecord,
  VerificationStatus,
} from './types/curriculum';
import { TopNav, type AppRoute } from './components/TopNav';
import { DashboardView } from './components/DashboardView';
import { SubjectExplorer } from './components/SubjectExplorer';
import { LessonReader } from './components/LessonReader';
import { QuestionBankView } from './components/QuestionBankView';
import { AiTutorPanel } from './components/AiTutorPanel';
import { CoverageDashboard } from './components/CoverageDashboard';
import { AdminCmsView } from './components/AdminCmsView';
import { GoogleDriveManager } from './components/GoogleDriveManager';
import { StudentIntelligenceDashboard } from './components/StudentIntelligenceDashboard';
import { StudyPlannerView } from './components/StudyPlannerView';
import { SmartRevisionView } from './components/SmartRevisionView';
import { StudentGoalsView } from './components/StudentGoalsView';
import { StudentReportsView } from './components/StudentReportsView';
import { DiplomaExamHub } from './components/DiplomaExamHub';
import { SourceQualityDashboard } from './components/SourceQualityDashboard';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { RedesignedDashboard } from './components/RedesignedDashboard';
import { SettingsView } from './components/SettingsView';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [subjects, setSubjects] = React.useState<Subject[]>(OMAN_SUBJECTS);
  const [units, setUnits] = React.useState<Unit[]>(OMAN_UNITS);
  const [lessons, setLessons] = React.useState<Lesson[]>(PRELOADED_LESSONS);
  const [questions, setQuestions] = React.useState<PublicQuestion[]>(CENTRAL_QUESTION_BANK);
  const [sources, setSources] = React.useState<CurriculumSource[]>(OMAN_CURRICULUM_SOURCES);
  const [objectives, setObjectives] = React.useState<LearningObjective[]>(
    OFFICIAL_LEARNING_OBJECTIVES
  );
  const [catalog, setCatalog] = React.useState<OfficialLessonCatalogItem[]>(
    OFFICIAL_CURRICULUM_CATALOG
  );
  const [verificationRecords, setVerificationRecords] = React.useState<VerificationRecord[]>(
    INITIAL_VERIFICATION_RECORDS
  );

  const [activeRoute, setActiveRoute] = React.useState<AppRoute>('dashboard');
  const [coverageCmsMode, setCoverageCmsMode] = React.useState<'coverage' | 'cms'>('coverage');
  const [cmsEditLessonId, setCmsEditLessonId] = React.useState<string | undefined>(undefined);
  const [cmsCatalogDraft, setCmsCatalogDraft] = React.useState<OfficialLessonCatalogItem | null>(
    null
  );

  const [selectedSubjectId, setSelectedSubjectId] = React.useState<SubjectId>('physics');
  const [selectedLessonId, setSelectedLessonId] = React.useState<string>(
    PRELOADED_LESSONS[0].id
  );
  const [tutorLessonId, setTutorLessonId] = React.useState<string | undefined>(undefined);
  const [activeSemester, setActiveSemester] = React.useState<Semester | 'all'>('all');

  const [darkMode, setDarkMode] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = React.useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = React.useState(false);

  // Firebase Auth & Sync State
  const [user, setUser] = React.useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [authNotice, setAuthNotice] = React.useState<string | null>(null);

  const [progressMap, setProgressMap] = React.useState<Record<string, LessonProgress>>({});
  const [attempts, setAttempts] = React.useState<ExamAttempt[]>([]);
  const [seedingStatus, setSeedingStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const refreshPublicQuestions = React.useCallback(async () => {
    try {
      const apiQuestions = await fetchPublicQuestionsFromApi();
      if (apiQuestions.length > 0) {
        setQuestions(apiQuestions);
      }
    } catch {
      // Keep preloaded approved public bundle if backend API is temporarily unreachable
    }
  }, []);

  // Load published curriculum from Firestore and verified public questions from backend API
  React.useEffect(() => {
    let active = true;
    void Promise.all([
      fetchPublishedCurriculumFromFirestore(),
      fetchPublicQuestionsFromApi().catch(() => [] as PublicQuestion[]),
    ]).then(([remote, apiQuestions]) => {
      if (!active) return;
      if (remote) {
        if (remote.subjects.length >= 4) {
          setSubjects((prev) =>
            prev.map((localSubj) => {
              const match = remote.subjects.find((r) => r.id === localSubj.id);
              return match ? { ...localSubj, ...match, imageUrl: localSubj.imageUrl } : localSubj;
            })
          );
        }
        if (remote.units.length >= OMAN_UNITS.length) setUnits(remote.units);
        if (remote.lessons.length >= PRELOADED_LESSONS.length) {
          setLessons(
            remote.lessons.map((remoteLesson) => {
              const localMatch = PRELOADED_LESSONS.find((l) => l.id === remoteLesson.id);
              return {
                ...localMatch,
                ...remoteLesson,
                keyPointsAr: Array.isArray(remoteLesson.keyPointsAr)
                  ? remoteLesson.keyPointsAr
                  : (localMatch?.keyPointsAr ?? []),
                keyFormulas: Array.isArray(remoteLesson.keyFormulas)
                  ? remoteLesson.keyFormulas
                  : (localMatch?.keyFormulas ?? []),
                sections: Array.isArray(remoteLesson.sections)
                  ? remoteLesson.sections
                  : (localMatch?.sections ?? []),
                solvedExamples: Array.isArray(remoteLesson.solvedExamples)
                  ? remoteLesson.solvedExamples
                  : (localMatch?.solvedExamples ?? []),
                exercises: Array.isArray(remoteLesson.exercises)
                  ? remoteLesson.exercises
                  : (localMatch?.exercises ?? []),
              };
            })
          );
        }
        if (remote.sources.length >= OMAN_CURRICULUM_SOURCES.length) {
          setSources(remote.sources);
        }
        if (remote.objectives.length >= OFFICIAL_LEARNING_OBJECTIVES.length) {
          setObjectives(remote.objectives);
        }
      }
      if (apiQuestions.length > 0) {
        setQuestions(apiQuestions);
      } else if (remote && remote.questions.length >= CENTRAL_QUESTION_BANK.length) {
        setQuestions(
          remote.questions.map((remoteQ) => {
            const localMatch = CENTRAL_QUESTION_BANK.find((q) => q.id === remoteQ.id);
            return {
              ...localMatch,
              ...remoteQ,
              sourceRefAr: remoteQ.sourceRefAr ?? localMatch?.sourceRefAr,
            };
          })
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Auth listener + Firestore subscriptions
  React.useEffect(() => {
    let unsubProgress: (() => void) | undefined;
    let unsubAttempts: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (unsubProgress) unsubProgress();
      if (unsubAttempts) unsubAttempts();

      if (firebaseUser) {
        try {
          const [profile, adminFlag, serverAttempts] = await Promise.all([
            ensureUserProfile(firebaseUser),
            checkUserIsAdmin(firebaseUser),
            fetchServerAttemptsApi().catch(() => [] as ExamAttempt[]),
          ]);
          setUserProfile(profile);
          setIsAdminUser(adminFlag);
          if (serverAttempts.length > 0) {
            setAttempts((prev) => {
              const merged = new Map<string, ExamAttempt>();
              for (const att of [...serverAttempts, ...prev]) {
                merged.set(att.id, att);
              }
              return Array.from(merged.values()).sort((a, b) =>
                b.createdAtIso.localeCompare(a.createdAtIso)
              );
            });
          }
          unsubProgress = subscribeUserProgress(firebaseUser.uid, (nextMap) => {
            setProgressMap(nextMap);
          });
          unsubAttempts = subscribeUserAttempts(firebaseUser.uid, (firestoreAttempts) => {
            setAttempts((prev) => {
              const merged = new Map<string, ExamAttempt>();
              for (const att of [...firestoreAttempts, ...prev]) {
                merged.set(att.id, att);
              }
              return Array.from(merged.values()).sort((a, b) =>
                b.createdAtIso.localeCompare(a.createdAtIso)
              );
            });
          });
        } catch (err) {
          console.error('Failed to initialize user Firestore sync:', err);
        }
      } else {
        setUserProfile(null);
        setIsAdminUser(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProgress) unsubProgress();
      if (unsubAttempts) unsubAttempts();
    };
  }, []);

  const handleSignIn = async () => {
    setAuthNotice(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In error:', error);
      setAuthNotice('تعذر إتمام تسجيل الدخول عبر نافذة جوجل. يمكنك المتابعة في التصفح.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setProgressMap({});
      setAttempts([]);
      setIsAdminUser(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleChangeSemester = async (sem: Semester | 'all') => {
    setActiveSemester(sem);
    if (user && userProfile && sem !== 'all') {
      setUserProfile((prev) => (prev ? { ...prev, activeSemester: sem } : prev));
      try {
        await updateUserActiveSemester(user.uid, userProfile, sem);
      } catch (err) {
        console.error('Failed to persist active semester:', err);
      }
    }
  };

  const upsertProgress = async (
    lesson: Lesson,
    patch: Partial<Omit<LessonProgress, 'userId' | 'lessonId' | 'subjectId' | 'bestExamScore'>>
  ) => {
    const existing = progressMap[lesson.id];
    const nextEntry: LessonProgress = {
      userId: user?.uid ?? 'guest',
      lessonId: lesson.id,
      subjectId: lesson.subjectId,
      status: patch.status ?? existing?.status ?? 'in_progress',
      bookmarked: patch.bookmarked ?? existing?.bookmarked ?? false,
      bestExamScore: existing?.bestExamScore ?? 0,
      notesAr: patch.notesAr ?? existing?.notesAr ?? '',
    };

    setProgressMap((prev) => ({ ...prev, [lesson.id]: nextEntry }));

    if (user) {
      await saveLessonProgress(user.uid, {
        lessonId: nextEntry.lessonId,
        subjectId: nextEntry.subjectId,
        status: nextEntry.status,
        bookmarked: nextEntry.bookmarked,
        notesAr: nextEntry.notesAr,
      });
    }
  };

  const handleOpenLesson = (lesson: Lesson) => {
    setSelectedSubjectId(lesson.subjectId);
    setSelectedLessonId(lesson.id);
    setActiveRoute('lesson');
    if (!progressMap[lesson.id]) {
      void upsertProgress(lesson, { status: 'in_progress' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleServerExamCompleted = (lesson: Lesson, response: ExamSubmitResponse) => {
    const existingBest = progressMap[lesson.id]?.bestExamScore ?? 0;
    const newBest = Math.max(existingBest, response.result.scorePercent);
    const nextStatus =
      response.result.scorePercent >= 60
        ? 'completed'
        : (progressMap[lesson.id]?.status ?? 'in_progress');

    setProgressMap((prev) => ({
      ...prev,
      [lesson.id]: {
        userId: user?.uid ?? response.attempt.userId,
        lessonId: lesson.id,
        subjectId: lesson.subjectId,
        status: nextStatus,
        bookmarked: prev[lesson.id]?.bookmarked ?? false,
        bestExamScore: newBest,
        notesAr: prev[lesson.id]?.notesAr ?? '',
      },
    }));

    setAttempts((prev) => {
      const filtered = prev.filter((a) => a.id !== response.attempt.id);
      return [response.attempt, ...filtered];
    });
  };

  const handleServerAttemptRecorded = (response: ExamSubmitResponse) => {
    setAttempts((prev) => {
      const filtered = prev.filter((a) => a.id !== response.attempt.id);
      return [response.attempt, ...filtered];
    });
  };

  const handleSeedFirestore = async () => {
    setSeedingStatus('جاري المزامنة...');
    try {
      const count = await seedCurriculumToFirestore(subjects, units, lessons, questions, {
        academicYear: ACADEMIC_YEAR_2026_2027,
        semesters: OMAN_SEMESTERS,
        sources,
        objectives,
        verificationRecords,
      });
      setSeedingStatus(`تم نشر ${count} وثيقة بنجاح`);
    } catch {
      setSeedingStatus('تعذر النشر، تحقق من صلاحيات المشرف');
    }
  };

  // CMS Handlers
  const handleSaveCmsLesson = async (saved: Lesson) => {
    setLessons((prev) => {
      const exists = prev.some((l) => l.id === saved.id);
      return exists ? prev.map((l) => (l.id === saved.id ? saved : l)) : [...prev, saved];
    });
    if (cmsCatalogDraft && saved.id === `cms-${cmsCatalogDraft.id}`) {
      setCatalog((prev) =>
        prev.map((item) =>
          item.id === cmsCatalogDraft.id
            ? {
                ...item,
                linkedLessonId: saved.id,
                verificationStatus: saved.verificationStatus ?? 'NEEDS_REVIEW',
              }
            : item
        )
      );
      setCmsCatalogDraft(null);
    }
    if (isAdminUser) {
      await saveCmsLessonToFirestore(saved);
    }
  };

  const handleSaveCmsUnit = async (unit: Unit) => {
    setUnits((prev) => [...prev, unit]);
    if (isAdminUser) {
      await saveCmsUnitToFirestore(unit);
    }
  };

  const handleSaveCmsSource = async (source: CurriculumSource) => {
    setSources((prev) => [...prev, source]);
    if (isAdminUser) {
      await saveCmsSourceToFirestore(source);
    }
  };

  const handleSaveCmsObjective = async (obj: LearningObjective) => {
    setObjectives((prev) => [...prev, obj]);
    if (isAdminUser) {
      await saveCmsObjectiveToFirestore(obj);
    }
  };

  const handleRecordVerification = async (
    entityType: 'lesson' | 'source',
    entityId: string,
    status: VerificationStatus,
    notesAr: string
  ) => {
    const rec: VerificationRecord = {
      id: `ver-${Date.now()}`,
      entityType,
      entityId,
      status,
      reviewerAr: user?.email ?? 'مشرف المنهج (جلسة معاينة)',
      reviewedAtIso: new Date().toISOString(),
      notesAr,
      sourceIds: [],
    };
    setVerificationRecords((prev) => [rec, ...prev]);

    if (entityType === 'lesson') {
      setLessons((prev) =>
        prev.map((l) => (l.id === entityId ? { ...l, verificationStatus: status } : l))
      );
      const target = lessons.find((l) => l.id === entityId);
      if (target && isAdminUser) {
        await saveCmsLessonToFirestore({ ...target, verificationStatus: status });
      }
    } else {
      setSources((prev) =>
        prev.map((s) => (s.id === entityId ? { ...s, verificationStatus: status } : s))
      );
      const targetSrc = sources.find((s) => s.id === entityId);
      if (targetSrc && isAdminUser) {
        await saveCmsSourceToFirestore({ ...targetSrc, verificationStatus: status });
      }
    }

    if (isAdminUser) {
      await saveVerificationRecordToFirestore(rec);
    }
  };

  const activeLesson =
    lessons.find((l) => l.id === selectedLessonId) ?? lessons[0];
  const activeSubject =
    subjects.find((s) => s.id === activeLesson.subjectId) ?? subjects[0];
  const activeUnit =
    units.find((u) => u.id === activeLesson.unitId) ?? units[0];
  const activeLessonQuestions = questions.filter(
    (q) => q.lessonId === activeLesson.id && q.isPublished
  );

  return (
    <ErrorBoundary>
      <div
        dir="rtl"
        className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
      >
        <Sidebar
          activeRoute={activeRoute}
          onNavigate={(route) => {
            setActiveRoute(route);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          user={user}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          mobileOpen={sidebarMobileOpen}
          onCloseMobile={() => setSidebarMobileOpen(false)}
          onSignOut={() => void handleSignOut()}
        />

        <Topbar
          user={user}
          authLoading={authLoading}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          onToggleMobileMenu={() => setSidebarMobileOpen(true)}
          onOpenNotifications={() => setNotificationModalOpen(true)}
          onSignIn={() => void handleSignIn()}
          collapsed={sidebarCollapsed}
        />

        <div
          className={`flex-1 transition-all duration-300 flex flex-col ${
            sidebarCollapsed ? 'lg:mr-20' : 'lg:mr-72'
          }`}
        >
          {authNotice && (
            <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-8 pt-4">
              <div
                role="alert"
                className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200 shadow-xs"
              >
                {authNotice}
              </div>
            </div>
          )}

          <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-8 py-8">
            {activeRoute === 'dashboard' && (
              <RedesignedDashboard
                subjects={subjects}
                lessons={lessons}
                progressMap={progressMap}
                attempts={attempts}
                onOpenSubject={(id) => {
                  setSelectedSubjectId(id as any);
                  setActiveRoute('subjects');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenLesson={handleOpenLesson}
                onOpenQuestionBank={() => setActiveRoute('question_bank')}
                onNavigateRoute={(route) => setActiveRoute(route as any)}
                displayName={user?.displayName ?? userProfile?.displayName}
              />
            )}

            {activeRoute === 'settings' && (
              <SettingsView
                user={user}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode((prev) => !prev)}
              />
            )}

          {activeRoute === 'subjects' && (
            <SubjectExplorer
              subjects={subjects}
              units={units}
              lessons={lessons}
              questions={questions}
              selectedSubjectId={selectedSubjectId}
              onSelectSubject={setSelectedSubjectId}
              activeSemester={activeSemester}
              onChangeSemester={(sem) => void handleChangeSemester(sem)}
              progressMap={progressMap}
              onOpenLesson={handleOpenLesson}
              onBackDashboard={() => setActiveRoute('dashboard')}
            />
          )}

          {activeRoute === 'lesson' && (
            <LessonReader
              subject={activeSubject}
              unit={activeUnit}
              lesson={activeLesson}
              lessonQuestions={activeLessonQuestions}
              sources={sources}
              progress={progressMap[activeLesson.id]}
              isAuthenticated={Boolean(user)}
              onSignIn={() => void handleSignIn()}
              onBackToSubject={() => {
                setSelectedSubjectId(activeSubject.id);
                setActiveRoute('subjects');
              }}
              onToggleBookmark={async (l) => {
                const curr = Boolean(progressMap[l.id]?.bookmarked);
                await upsertProgress(l, { bookmarked: !curr });
              }}
              onToggleComplete={async (l) => {
                const isDone = progressMap[l.id]?.status === 'completed';
                await upsertProgress(l, {
                  status: isDone ? 'in_progress' : 'completed',
                });
              }}
              onSaveNotes={async (l, notes) => {
                await upsertProgress(l, { notesAr: notes });
              }}
              onServerExamCompleted={handleServerExamCompleted}
              onAskTutorForLesson={(l) => {
                setTutorLessonId(l.id);
                setActiveRoute('tutor');
              }}
            />
          )}

          {activeRoute === 'question_bank' && (
            <QuestionBankView
              subjects={subjects}
              units={units}
              lessons={lessons}
              questions={questions}
              isAuthenticated={Boolean(user)}
              onSignIn={() => void handleSignIn()}
              onServerAttemptRecorded={handleServerAttemptRecorded}
            />
          )}

          {activeRoute === 'tutor' && (
            <AiTutorPanel
              subjects={subjects}
              units={units}
              lessons={lessons}
              initialLessonId={tutorLessonId ?? activeLesson.id}
              isAuthenticated={Boolean(user)}
              isAdminUser={isAdminUser}
              onSignIn={() => void handleSignIn()}
            />
          )}

          {activeRoute === 'google_drive' && (
            <GoogleDriveManager
              user={user}
              lessons={lessons}
              onSignIn={() => void handleSignIn()}
            />
          )}

          {activeRoute === 'diploma_exams' && (
            <DiplomaExamHub
              subjects={subjects}
              isAdminUser={isAdminUser}
              onStartSimulation={(blueprintId) => {
                setActiveRoute('question_bank');
              }}
            />
          )}

          {activeRoute === 'source_quality' && (
            <SourceQualityDashboard
              subjects={subjects}
              lessons={lessons}
            />
          )}

          {activeRoute === 'intelligence' && (
            <StudentIntelligenceDashboard
              userId={user?.uid ?? 'guest-student'}
              subjects={subjects}
              lessons={lessons}
              attempts={attempts}
              progressMap={progressMap}
              objectives={objectives}
              onOpenLesson={handleOpenLesson}
              onOpenQuestionBank={() => setActiveRoute('question_bank')}
              onNavigateTab={(tab) => setActiveRoute(tab as AppRoute)}
            />
          )}

          {activeRoute === 'planner' && (
            <StudyPlannerView
              userId={user?.uid ?? 'guest-student'}
              subjects={subjects}
              lessons={lessons}
              onOpenLesson={handleOpenLesson}
              onOpenQuestionBank={() => setActiveRoute('question_bank')}
            />
          )}

          {activeRoute === 'revision' && (
            <SmartRevisionView
              subjects={subjects}
              lessons={lessons}
              onOpenLesson={handleOpenLesson}
              onOpenQuestionBank={() => setActiveRoute('question_bank')}
            />
          )}

          {activeRoute === 'goals' && (
            <StudentGoalsView userId={user?.uid ?? 'guest-student'} />
          )}

          {activeRoute === 'reports' && (
            <StudentReportsView subjects={subjects} />
          )}

          {activeRoute === 'coverage_cms' && (
            <div className="space-y-6">
              <div
                role="tablist"
                aria-label="تبديل لوحة التغطية ومحرر CMS"
                className="flex w-full sm:w-fit max-w-full items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={coverageCmsMode === 'coverage'}
                  onClick={() => setCoverageCmsMode('coverage')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                    coverageCmsMode === 'coverage'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  لوحة تغطية المنهج والتدقيق
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={coverageCmsMode === 'cms'}
                  onClick={() => setCoverageCmsMode('cms')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                    coverageCmsMode === 'cms'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  نظام إدارة المحتوى (CMS)
                </button>
              </div>

              {coverageCmsMode === 'coverage' ? (
                <CoverageDashboard
                  subjects={subjects}
                  units={units}
                  lessons={lessons}
                  catalog={catalog}
                  sources={sources}
                  verificationRecords={verificationRecords}
                  onOpenLesson={handleOpenLesson}
                  onEditLessonInCms={(lessonId) => {
                    setCmsCatalogDraft(null);
                    setCmsEditLessonId(lessonId);
                    setCoverageCmsMode('cms');
                  }}
                  onCreateMissingLessonInCms={(item) => {
                    setCmsCatalogDraft(item);
                    setCmsEditLessonId(undefined);
                    setCoverageCmsMode('cms');
                  }}
                />
              ) : (
                <AdminCmsView
                  subjects={subjects}
                  units={units}
                  lessons={lessons}
                  sources={sources}
                  objectives={objectives}
                  verificationRecords={verificationRecords}
                  isAdminUser={isAdminUser}
                  initialLessonId={cmsEditLessonId}
                  initialCatalogDraft={cmsCatalogDraft}
                  onSaveLesson={handleSaveCmsLesson}
                  onSaveUnit={handleSaveCmsUnit}
                  onSaveSource={handleSaveCmsSource}
                  onSaveObjective={handleSaveCmsObjective}
                  onRecordVerification={handleRecordVerification}
                  onSeedFirestore={handleSeedFirestore}
                  onQuestionBankUpdated={refreshPublicQuestions}
                  seedingStatus={seedingStatus}
                />
              )}
            </div>
          )}
        </main>

        </div>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-6 mt-12">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <p>
              STUDY CORE · منصة الصف الثاني عشر المسار العلمي — سلطنة عُمان (2026–2027)
            </p>
            <p>محتوى تعليمي مركزي متوافق مع مناهج وزارة التربية والتعليم</p>
          </div>
        </footer>

        <NotificationCenterModal
          isOpen={notificationModalOpen}
          onClose={() => setNotificationModalOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
