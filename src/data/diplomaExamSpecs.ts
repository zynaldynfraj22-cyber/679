import { OfficialExaminationSourceRef, ExamBlueprint, OfficialPastPaper } from '../types/diplomaExam';

export const OFFICIAL_EXAMINATION_SOURCES: OfficialExaminationSourceRef[] = [
  {
    id: 'src-science-2026-2027',
    titleAr: 'وثيقة تقويم تعلم الطلبة في مواد العلوم (11-12) للعام 2026-2027',
    publisherAr: 'وزارة التربية والتعليم — سلطنة عُمان',
    url: 'https://site.moe.gov.om/images/library/file/Book331821.pdf',
    publicationYear: 2026,
    documentCode: 'MOE-SCI-11-12-2026',
    version: '1.0',
    verifiedAtIso: '2026-11-25',
  },
  {
    id: 'src-math-sep-2026',
    titleAr: 'وثيقة تقويم تعلم الطلبة في مادة الرياضيات للصفوف (11-12) — سبتمبر 2026',
    publisherAr: 'وزارة التربية والتعليم — سلطنة عُمان',
    url: 'https://site.moe.gov.om/images/library/file/Book911217.pdf',
    publicationYear: 2026,
    documentCode: 'MOE-MATH-11-12-SEP2026',
    version: '1.0',
    verifiedAtIso: '2026-11-25',
  },
  {
    id: 'src-moe-archive',
    titleAr: 'أرشيف امتحانات دبلوم التعليم العام — وزارة التربية والتعليم',
    publisherAr: 'بوابة سلطنة عُمان التعليمية',
    url: 'https://home.moe.gov.om/ar/zawity/212',
    publicationYear: 2026,
    documentCode: 'MOE-ARCHIVE-DIPLOMA',
    version: '2026',
    verifiedAtIso: '2026-11-25',
  },
];

export const OFFICIAL_DIPLOMA_BLUEPRINTS: ExamBlueprint[] = [
  // 1. PHYSICS SEMESTER 1
  {
    id: 'bp-physics-sem1',
    subjectId: 'physics',
    semester: 1,
    gradeAr: 'الصف الثاني عشر',
    academicYear: '2026–2027',
    titleAr: 'امتحان تجريبي دبلوم التعليم العام في الفيزياء — الفصل الدراسي الأول',
    examRole: 'OFFICIAL_FORMAT_SIMULATION',
    totalMarks: 70,
    durationMinutes: 180, // 3 hours
    questionCountRange: { min: 35, max: 45 },
    mcqCount: 12,
    shortResponseCount: 24,
    extendedResponseCount: 4,
    assessmentObjectives: {
      ao1Marks: 24,
      ao2Marks: 46,
    },
    demandDistribution: {
      lowDemandMarks: 28, // 40%
      mediumDemandMarks: 28, // 40%
      highDemandMarks: 14, // 20%
    },
    unitWeights: [
      { unitId: 'u-phys-1', unitNumber: 1, titleAr: 'المجال الجذبي', weightPercent: 18, allocatedMarks: 12 },
      { unitId: 'u-phys-2', unitNumber: 2, titleAr: 'المجال الكهربائي', weightPercent: 19, allocatedMarks: 13 },
      { unitId: 'u-phys-3', unitNumber: 3, titleAr: 'المكثفات', weightPercent: 23, allocatedMarks: 16 },
      { unitId: 'u-phys-4', unitNumber: 4, titleAr: 'المغناطيسية والكاثود', weightPercent: 17, allocatedMarks: 12 },
      { unitId: 'u-phys-5', unitNumber: 5, titleAr: 'الحث الكهرومغناطيسي', weightPercent: 23, allocatedMarks: 17 },
    ],
    calculatorPolicyAr: 'يُسمح بالآلات الحاسبة غير القابلة للبرمجة أو رسم البياني أو تخزين المعلومات.',
    permittedReferencesAr: ['الثوابت الفيزيائية الأساسية', 'قوانين الفيزياء المقررة'],
    officialSourceId: 'src-science-2026-2027',
    isPublished: true,
    version: '1.0',
    createdAtIso: '2026-11-25',
  },

  // 2. CHEMISTRY SEMESTER 1
  {
    id: 'bp-chemistry-sem1',
    subjectId: 'chemistry',
    semester: 1,
    gradeAr: 'الصف الثاني عشر',
    academicYear: '2026–2027',
    titleAr: 'امتحان تجريبي دبلوم التعليم العام في الكيمياء — الفصل الدراسي الأول',
    examRole: 'OFFICIAL_FORMAT_SIMULATION',
    totalMarks: 70,
    durationMinutes: 180,
    questionCountRange: { min: 35, max: 45 },
    mcqCount: 12,
    shortResponseCount: 24,
    extendedResponseCount: 4,
    assessmentObjectives: {
      ao1Marks: 24,
      ao2Marks: 46,
    },
    demandDistribution: {
      lowDemandMarks: 28,
      mediumDemandMarks: 28,
      highDemandMarks: 14,
    },
    unitWeights: [
      { unitId: 'u-chem-1', unitNumber: 1, titleAr: 'طاقة الشبكة البلورية والتغيرات الحرارية', weightPercent: 32, allocatedMarks: 22 },
      { unitId: 'u-chem-2', unitNumber: 2, titleAr: 'الحموض والقواعد', weightPercent: 24, allocatedMarks: 17 },
      { unitId: 'u-chem-3', unitNumber: 3, titleAr: 'الخلائط المخففة وتطاير السوائل', weightPercent: 19, allocatedMarks: 13 },
      { unitId: 'u-chem-4', unitNumber: 4, titleAr: 'حسابات الاتزان الكيميائي', weightPercent: 25, allocatedMarks: 18 },
    ],
    calculatorPolicyAr: 'يُسمح بالآلات الحاسبة العلمية غير القابلة للبرمجة.',
    permittedReferencesAr: ['الجدول الدوري للعناصر', 'قيم الثوابت الكيميائية'],
    officialSourceId: 'src-science-2026-2027',
    isPublished: true,
    version: '1.0',
    createdAtIso: '2026-11-25',
  },

  // 3. BIOLOGY SEMESTER 1
  {
    id: 'bp-biology-sem1',
    subjectId: 'biology',
    semester: 1,
    gradeAr: 'الصف الثاني عشر',
    academicYear: '2026–2027',
    titleAr: 'امتحان تجريبي دبلوم التعليم العام في الأحياء — الفصل الدراسي الأول',
    examRole: 'OFFICIAL_FORMAT_SIMULATION',
    totalMarks: 70,
    durationMinutes: 180,
    questionCountRange: { min: 35, max: 45 },
    mcqCount: 12,
    shortResponseCount: 24,
    extendedResponseCount: 4,
    assessmentObjectives: {
      ao1Marks: 24,
      ao2Marks: 46,
    },
    demandDistribution: {
      lowDemandMarks: 28,
      mediumDemandMarks: 28,
      highDemandMarks: 14,
    },
    unitWeights: [
      { unitId: 'u-bio-1', unitNumber: 1, titleAr: 'التنفس الخلوي وإنتاج الطاقة', weightPercent: 20, allocatedMarks: 14 },
      { unitId: 'u-bio-2', unitNumber: 2, titleAr: 'التمثيل الضوئي والتثبيت', weightPercent: 23, allocatedMarks: 16 },
      { unitId: 'u-bio-3', unitNumber: 3, titleAr: 'الاستجابة للمثيرات في النباتات', weightPercent: 20, allocatedMarks: 14 },
      { unitId: 'u-bio-4', unitNumber: 4, titleAr: 'التنظيم العصبي والهرموني في الإنسان', weightPercent: 20, allocatedMarks: 14 },
      { unitId: 'u-bio-5', unitNumber: 5, titleAr: 'التكاثر في النباتات المزهرة', weightPercent: 17, allocatedMarks: 12 },
    ],
    calculatorPolicyAr: 'يُسمح بالآلات الحاسبة العلمية.',
    permittedReferencesAr: ['رسوم وتخطيطات العمليات الحيوية'],
    officialSourceId: 'src-science-2026-2027',
    isPublished: true,
    version: '1.0',
    createdAtIso: '2026-11-25',
  },

  // 4. ADVANCED MATHEMATICS SEMESTER 1
  {
    id: 'bp-math-sem1',
    subjectId: 'math',
    semester: 1,
    gradeAr: 'الصف الثاني عشر',
    academicYear: '2026–2027',
    titleAr: 'امتحان تجريبي دبلوم التعليم العام في الرياضيات المتقدمة — الفصل الدراسي الأول',
    examRole: 'OFFICIAL_FORMAT_SIMULATION',
    totalMarks: 70,
    durationMinutes: 180,
    questionCountRange: { min: 25, max: 30 },
    mcqCount: 12,
    shortResponseCount: 14,
    extendedResponseCount: 2,
    assessmentObjectives: {
      ao1Marks: 35, // 50%
      ao2Marks: 35, // 50%
    },
    demandDistribution: {
      lowDemandMarks: 28, // 40% per AO
      mediumDemandMarks: 28,
      highDemandMarks: 14,
    },
    unitWeights: [
      { unitId: 'u-math-1', unitNumber: 1, titleAr: 'القياس الدائري', weightPercent: 18.5, allocatedMarks: 13 },
      { unitId: 'u-math-2', unitNumber: 2, titleAr: 'حساب المثلثات', weightPercent: 31.4, allocatedMarks: 22 },
      { unitId: 'u-math-3', unitNumber: 3, titleAr: 'النهايات والاتصال', weightPercent: 22.8, allocatedMarks: 16 },
      { unitId: 'u-math-4', unitNumber: 4, titleAr: 'التفاضل', weightPercent: 27.3, allocatedMarks: 19 },
    ],
    calculatorPolicyAr: 'يُسمح باستخدام الآلة الحاسبة العلمية المعتمدة.',
    permittedReferencesAr: ['قوانين وحسابات الرياضيات المتقدمة'],
    officialSourceId: 'src-math-sep-2026',
    isPublished: true,
    version: '1.0',
    createdAtIso: '2026-11-25',
  },
];

export const OFFICIAL_PAST_PAPERS_LIBRARY: OfficialPastPaper[] = [
  {
    id: 'past-phys-2025-1',
    subjectId: 'physics',
    academicYear: '2024–2025',
    semester: 1,
    sessionAr: 'الدور الأول (مسائي)',
    examPaperUrl: 'https://home.moe.gov.om/ar/zawity/212',
    answerKeyUrl: 'https://home.moe.gov.om/ar/zawity/212',
    officialSourceId: 'src-moe-archive',
    verificationStatus: 'VERIFIED',
  },
  {
    id: 'past-chem-2025-1',
    subjectId: 'chemistry',
    academicYear: '2024–2025',
    semester: 1,
    sessionAr: 'الدور الأول (صباحي)',
    examPaperUrl: 'https://home.moe.gov.om/ar/zawity/212',
    answerKeyUrl: 'https://home.moe.gov.om/ar/zawity/212',
    officialSourceId: 'src-moe-archive',
    verificationStatus: 'VERIFIED',
  },
  {
    id: 'past-math-2025-1',
    subjectId: 'math',
    academicYear: '2024–2025',
    semester: 1,
    sessionAr: 'الدور الأول',
    examPaperUrl: 'https://home.moe.gov.om/ar/zawity/212',
    answerKeyUrl: 'https://home.moe.gov.om/ar/zawity/212',
    officialSourceId: 'src-moe-archive',
    verificationStatus: 'VERIFIED',
  },
];
