import { LESSONS_PART_1 } from './lessonsPart1';
import { LESSONS_PART_2 } from './lessonsPart2';
import { LESSONS_PART_3 } from './lessonsPart3';
import { PUBLIC_QUESTION_BANK } from './questionBankPublic';

export const PRELOADED_LESSONS = [...LESSONS_PART_1, ...LESSONS_PART_2, ...LESSONS_PART_3];

// Client-safe public question projection only (answer keys and grading metadata live strictly on the server).
export const CENTRAL_QUESTION_BANK = PUBLIC_QUESTION_BANK;
