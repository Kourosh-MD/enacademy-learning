import type { Locale } from '@/lib/i18n';

export type ExamAvailability='OPEN'|'LOCKED'|'UPCOMING'|'CLOSED'|'HIDDEN';
export type AttemptStatus='IN_PROGRESS'|'SUBMITTED'|'AUTO_SUBMITTED';

export type ExamSummary={
  id:string;slug:string;titleEn:string;titleFa:string;descriptionEn:string;descriptionFa:string;
  level:string;durationMinutes:number;passingScore:number;startsAt:string;endsAt:string;
  availability:ExamAvailability;entitled:boolean;questionCount:number;attemptId:string|null;
  attemptStatus:AttemptStatus|null;percentage:number|null;passed:boolean|null;
};

export type ExamOption={id:string;textEn:string;textFa:string};
export type ExamQuestion={
  id:string;position:number;promptEn:string;promptFa:string;options:ExamOption[];points:number;
  correctOption:string|null;explanationEn:string|null;explanationFa:string|null;
};

export type ExamAttempt={
  attemptId:string;exam:ExamSummary;status:AttemptStatus;startedAt:string;deadlineAt:string;
  submittedAt:string|null;serverTime:string;remainingSeconds:number;version:number;
  scorePoints:number|null;maxPoints:number|null;percentage:number|null;passed:boolean|null;
  questions:ExamQuestion[];answers:Record<string,string>;
};

export type AttemptState={
  attemptId:string;status:AttemptStatus;serverTime:string;deadlineAt:string;remainingSeconds:number;
  lastSavedAt:string|null;version:number;scorePoints:number|null;maxPoints:number|null;
  percentage:number|null;passed:boolean|null;
};

export function examTitle(exam:ExamSummary,locale:Locale){return locale==='fa'?exam.titleFa:exam.titleEn;}
export function examDescription(exam:ExamSummary,locale:Locale){return locale==='fa'?exam.descriptionFa:exam.descriptionEn;}
export function questionPrompt(question:ExamQuestion,locale:Locale){return locale==='fa'?question.promptFa:question.promptEn;}
export function optionText(option:ExamOption,locale:Locale){return locale==='fa'?option.textFa:option.textEn;}
export function explanation(question:ExamQuestion,locale:Locale){return locale==='fa'?question.explanationFa:question.explanationEn;}

export function formatClock(seconds:number,locale:Locale){
  const safe=Math.max(0,Math.floor(seconds));
  const value=`${String(Math.floor(safe/60)).padStart(2,'0')}:${String(safe%60).padStart(2,'0')}`;
  return locale==='fa'?value.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]):value;
}
