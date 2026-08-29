CREATE TABLE exams (
  id UUID PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title_en VARCHAR(180) NOT NULL,
  title_fa VARCHAR(180) NOT NULL,
  description_en TEXT NOT NULL,
  description_fa TEXT NOT NULL,
  level VARCHAR(10) NOT NULL CHECK (level IN ('A1','A2')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 240),
  passing_score INTEGER NOT NULL CHECK (passing_score BETWEEN 0 AND 100),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_exams_published_window ON exams(published, starts_at, ends_at);

CREATE TABLE exam_questions (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  prompt_en TEXT NOT NULL,
  prompt_fa TEXT NOT NULL,
  options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  correct_option VARCHAR(20) NOT NULL,
  explanation_en TEXT NOT NULL,
  explanation_fa TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1 CHECK (points BETWEEN 1 AND 100),
  UNIQUE(exam_id, position)
);

CREATE INDEX idx_exam_questions_exam_position ON exam_questions(exam_id, position);

CREATE TABLE exam_attempts (
  id UUID PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  score_points INTEGER,
  max_points INTEGER,
  percentage INTEGER CHECK (percentage BETWEEN 0 AND 100),
  passed BOOLEAN,
  last_saved_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 0,
  UNIQUE(exam_id, user_id),
  CHECK (
    (status = 'IN_PROGRESS' AND submitted_at IS NULL AND score_points IS NULL AND percentage IS NULL AND passed IS NULL)
    OR
    (status IN ('SUBMITTED','AUTO_SUBMITTED') AND submitted_at IS NOT NULL AND score_points IS NOT NULL
      AND max_points IS NOT NULL AND percentage IS NOT NULL AND passed IS NOT NULL)
  )
);

CREATE INDEX idx_exam_attempts_user_started ON exam_attempts(user_id, started_at DESC);
CREATE INDEX idx_exam_attempts_exam_status ON exam_attempts(exam_id, status);
CREATE INDEX idx_exam_attempts_deadline ON exam_attempts(status, deadline_at) WHERE status = 'IN_PROGRESS';

CREATE TABLE exam_answers (
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE RESTRICT,
  selected_option VARCHAR(20) NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(attempt_id, question_id)
);

CREATE INDEX idx_exam_answers_question ON exam_answers(question_id);

INSERT INTO exams(
  id,slug,title_en,title_fa,description_en,description_fa,level,duration_minutes,passing_score,
  starts_at,ends_at,published
) VALUES
(
  '30000000-0000-0000-0000-000000000001','a1-foundations-exam',
  'A1 Foundations Online Exam','آزمون آنلاین پایه A1',
  'A timed assessment of introductions, routines, cafés, shopping, directions, and essential A1 grammar.',
  'ارزیابی زمان‌دار معرفی، برنامه روزانه، کافه، خرید، مسیر و گرامر ضروری سطح A1.',
  'A1',25,70,'2025-01-01T00:00:00Z','2035-01-01T00:00:00Z',TRUE
),
(
  '30000000-0000-0000-0000-000000000002','a2-everyday-fluency-exam',
  'A2 Everyday Fluency Online Exam','آزمون آنلاین مکالمه A2',
  'A timed assessment of past events, plans, comparisons, work conversations, opinions, and problem solving.',
  'ارزیابی زمان‌دار گذشته، برنامه‌ها، مقایسه، مکالمه کاری، بیان نظر و حل مسئله در سطح A2.',
  'A2',30,70,'2025-01-01T00:00:00Z','2035-01-01T00:00:00Z',TRUE
);

INSERT INTO exam_questions(
  id,exam_id,position,prompt_en,prompt_fa,options,correct_option,explanation_en,explanation_fa,points
) VALUES
('31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',1,
 'Choose the best introduction: “Hello, ___ Kourosh.”','بهترین معرفی را انتخاب کنید: «سلام، ___ کوروش.»',
 '[{"id":"a","textEn":"I am","textFa":"من هستم"},{"id":"b","textEn":"I have","textFa":"من دارم"},{"id":"c","textEn":"I do","textFa":"من انجام می‌دهم"}]'::jsonb,
 'a','Use “I am” before your name.','پیش از نام خود از «I am» استفاده می‌کنیم.',2),
('31000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001',2,
 'Which sentence describes a daily routine?','کدام جمله یک برنامه روزانه را توصیف می‌کند؟',
 '[{"id":"a","textEn":"I wake up at seven.","textFa":"من ساعت هفت بیدار می‌شوم."},{"id":"b","textEn":"I woke up tomorrow.","textFa":"من فردا بیدار شدم."},{"id":"c","textEn":"I am wake at seven.","textFa":"من ساعت هفت بیدار هستم."}]'::jsonb,
 'a','The present simple describes routines.','حال ساده برای برنامه‌های روزانه استفاده می‌شود.',2),
('31000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001',3,
 'At a café, what is the most polite request?','در کافه، کدام درخواست مؤدبانه‌تر است؟',
 '[{"id":"a","textEn":"Coffee now.","textFa":"قهوه همین الان."},{"id":"b","textEn":"Could I have a coffee, please?","textFa":"ممکن است لطفاً یک قهوه داشته باشم؟"},{"id":"c","textEn":"You give coffee.","textFa":"تو قهوه بده."}]'::jsonb,
 'b','“Could I have …, please?” is a polite request.','عبارت «Could I have …, please?» یک درخواست مؤدبانه است.',2),
('31000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000001',4,
 'Choose the correct shopping question.','پرسش درست برای خرید را انتخاب کنید.',
 '[{"id":"a","textEn":"How much is this?","textFa":"قیمت این چقدر است؟"},{"id":"b","textEn":"How many is this?","textFa":"تعداد این چقدر است؟"},{"id":"c","textEn":"How price this?","textFa":"چگونه قیمت این؟"}]'::jsonb,
 'a','Use “How much” to ask about price.','برای پرسیدن قیمت از «How much» استفاده می‌کنیم.',2),
('31000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000001',5,
 '“The bank is ___ the pharmacy.” Choose the location word meaning روبه‌روی.','برای معنی «روبه‌روی» واژه مناسب را انتخاب کنید.',
 '[{"id":"a","textEn":"between","textFa":"بین"},{"id":"b","textEn":"opposite","textFa":"روبه‌روی"},{"id":"c","textEn":"under","textFa":"زیر"}]'::jsonb,
 'b','“Opposite” means facing something across a space or street.','«Opposite» یعنی روبه‌روی یک مکان یا در سمت دیگر خیابان.',2),
('31000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001',6,
 'Choose the correct question form.','ساختار پرسشی درست را انتخاب کنید.',
 '[{"id":"a","textEn":"Where you live?","textFa":"کجا تو زندگی می‌کنی؟"},{"id":"b","textEn":"Where do you live?","textFa":"کجا زندگی می‌کنی؟"},{"id":"c","textEn":"Where does you live?","textFa":"کجا زندگی می‌کند تو؟"}]'::jsonb,
 'b','Present-simple questions with “you” use “do”.','پرسش حال ساده با «you» از «do» استفاده می‌کند.',2),

('32000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',1,
 'Choose the correct past sentence.','جمله درست در زمان گذشته را انتخاب کنید.',
 '[{"id":"a","textEn":"I visit my friend yesterday.","textFa":"من دیروز دوستم را ملاقات می‌کنم."},{"id":"b","textEn":"I visited my friend yesterday.","textFa":"من دیروز دوستم را ملاقات کردم."},{"id":"c","textEn":"I am visited my friend.","textFa":"من دوستم را ملاقات شده‌ام."}]'::jsonb,
 'b','A finished past event uses the past form “visited”.','رویداد تمام‌شده در گذشته از شکل گذشته «visited» استفاده می‌کند.',2),
('32000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',2,
 'Which sentence expresses a future plan?','کدام جمله یک برنامه آینده را بیان می‌کند؟',
 '[{"id":"a","textEn":"I am going to study tonight.","textFa":"امشب قصد دارم درس بخوانم."},{"id":"b","textEn":"I studied tonight.","textFa":"امشب درس خواندم."},{"id":"c","textEn":"I going study tonight.","textFa":"امشب قصد درس خواندن."}]'::jsonb,
 'a','“Be going to” expresses an intention or plan.','ساختار «be going to» قصد یا برنامه را بیان می‌کند.',2),
('32000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002',3,
 'Complete the comparison: “This route is ___ than the other one.”','مقایسه را کامل کنید: «این مسیر از مسیر دیگر ___ است.»',
 '[{"id":"a","textEn":"short","textFa":"کوتاه"},{"id":"b","textEn":"shorter","textFa":"کوتاه‌تر"},{"id":"c","textEn":"shortest","textFa":"کوتاه‌ترین"}]'::jsonb,
 'b','Use the comparative “shorter” with “than”.','همراه «than» از صفت مقایسه‌ای «shorter» استفاده می‌کنیم.',2),
('32000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000002',4,
 'Choose the best professional clarification.','بهترین درخواست توضیح در محیط کاری را انتخاب کنید.',
 '[{"id":"a","textEn":"Could you explain that again, please?","textFa":"ممکن است لطفاً دوباره توضیح دهید؟"},{"id":"b","textEn":"Say again.","textFa":"دوباره بگو."},{"id":"c","textEn":"I no understand.","textFa":"من متوجه نیست."}]'::jsonb,
 'a','The modal question is clear and polite.','پرسش با فعل وجهی، روشن و مؤدبانه است.',2),
('32000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002',5,
 'Which phrase introduces an opinion?','کدام عبارت یک نظر را آغاز می‌کند؟',
 '[{"id":"a","textEn":"In my opinion, …","textFa":"به نظر من، ..."},{"id":"b","textEn":"At the station, …","textFa":"در ایستگاه، ..."},{"id":"c","textEn":"For two hours, …","textFa":"برای دو ساعت، ..."}]'::jsonb,
 'a','“In my opinion” clearly signals a viewpoint.','عبارت «In my opinion» دیدگاه شخصی را مشخص می‌کند.',2),
('32000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000002',6,
 'A colleague says the file is missing. What is the best solution-focused response?','همکار می‌گوید فایل پیدا نمی‌شود. بهترین پاسخ راه‌حل‌محور چیست؟',
 '[{"id":"a","textEn":"That is not my problem.","textFa":"این مشکل من نیست."},{"id":"b","textEn":"Let us check the shared folder first.","textFa":"بیایید ابتدا پوشه مشترک را بررسی کنیم."},{"id":"c","textEn":"The file missing yesterday.","textFa":"فایل دیروز گم."}]'::jsonb,
 'b','The response proposes a clear collaborative next step.','این پاسخ یک گام بعدی روشن و مشارکتی پیشنهاد می‌دهد.',2);
