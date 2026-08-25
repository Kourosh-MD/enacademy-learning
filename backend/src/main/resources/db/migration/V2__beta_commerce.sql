CREATE SEQUENCE enacademy_invoice_number_seq START WITH 1001;

CREATE TABLE products (
  id UUID PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('COURSE','BOOK')),
  title_en VARCHAR(180) NOT NULL,
  title_fa VARCHAR(180) NOT NULL,
  description_en TEXT NOT NULL,
  description_fa TEXT NOT NULL,
  preview_en TEXT NOT NULL,
  preview_fa TEXT NOT NULL,
  price_toman BIGINT NOT NULL CHECK (price_toman >= 0),
  target_key VARCHAR(120),
  download_resource VARCHAR(240),
  badge VARCHAR(40) NOT NULL DEFAULT 'BETA',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((product_type = 'COURSE' AND target_key IS NOT NULL AND download_resource IS NULL)
      OR (product_type = 'BOOK' AND target_key IS NULL AND download_resource IS NOT NULL))
);

CREATE INDEX idx_products_active_type ON products(active, product_type);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('APPROVED','REFUNDED')),
  currency VARCHAR(10) NOT NULL CHECK (currency = 'TOMAN'),
  subtotal_toman BIGINT NOT NULL CHECK (subtotal_toman >= 0),
  total_toman BIGINT NOT NULL CHECK (total_toman >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_orders_user_created ON purchase_orders(user_id, created_at DESC);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('COURSE','BOOK')),
  title_en VARCHAR(180) NOT NULL,
  title_fa VARCHAR(180) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_toman BIGINT NOT NULL CHECK (unit_price_toman >= 0),
  line_total_toman BIGINT NOT NULL CHECK (line_total_toman >= 0)
);

CREATE INDEX idx_purchase_order_items_order ON purchase_order_items(order_id);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_entitlements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  granted_by_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_product_entitlements_user ON product_entitlements(user_id);

INSERT INTO products(
  id,slug,product_type,title_en,title_fa,description_en,description_fa,preview_en,preview_fa,
  price_toman,target_key,download_resource,badge
) VALUES
(
  '10000000-0000-0000-0000-000000000001','complete-a1','COURSE',
  'Complete A1 Foundations','دوره کامل پایه A1',
  'Eight practical lessons for confident introductions, routines, cafés, shopping, directions, and travel.',
  'هشت درس کاربردی برای معرفی، برنامه روزانه، کافه، خرید، مسیر و سفر با اعتمادبه‌نفس.',
  'Includes four guided units, eight interactive lessons, speaking practice, saved progress, and lifetime beta access.',
  'شامل چهار فصل هدایت‌شده، هشت درس تعاملی، تمرین گفتار، ذخیره پیشرفت و دسترسی دائمی نسخه آزمایشی.',
  1490000,'A1',NULL,'POPULAR'
),
(
  '10000000-0000-0000-0000-000000000002','complete-a2','COURSE',
  'Complete A2 Everyday Fluency','دوره کامل مکالمه A2',
  'Eight connected lessons for plans, stories, work conversations, problem solving, opinions, and goals.',
  'هشت درس پیوسته برای برنامه‌ریزی، داستان، مکالمه کاری، حل مسئله، نظر و هدف.',
  'Unlocks the full A2 level with guided speaking checks, practical dialogues, and durable progress tracking.',
  'تمام سطح A2 را با تمرین گفتار هدایت‌شده، گفت‌وگوهای واقعی و ثبت پایدار پیشرفت باز می‌کند.',
  1990000,'A2',NULL,'BETA'
),
(
  '20000000-0000-0000-0000-000000000001','everyday-english-starter','BOOK',
  'Everyday English Starter Guide','راهنمای انگلیسی روزمره',
  'A polished starter e-book with useful dialogues, vocabulary, pronunciation notes, and short practice tasks.',
  'کتاب الکترونیکی مقدماتی با گفت‌وگوهای کاربردی، واژگان، نکات تلفظ و تمرین‌های کوتاه.',
  'Preview: greetings, cafés, shopping, directions, travel phrases, mini challenges, and a seven-day study plan.',
  'پیش‌نمایش: سلام و معرفی، کافه، خرید، مسیر، عبارت‌های سفر، تمرین کوتاه و برنامه هفت‌روزه.',
  249000,NULL,'everyday-english-starter.pdf','NEW'
),
(
  '20000000-0000-0000-0000-000000000002','practical-grammar-workbook','BOOK',
  'Practical Grammar Workbook','کتاب کار گرامر کاربردی',
  'A focused workbook that turns essential A1-A2 grammar into sentences learners can actually use.',
  'کتاب کاری هدفمند که گرامر ضروری A1 و A2 را به جمله‌های واقعاً کاربردی تبدیل می‌کند.',
  'Preview: present simple, questions, past events, plans, comparisons, guided exercises, and answer keys.',
  'پیش‌نمایش: حال ساده، پرسش، گذشته، برنامه آینده، مقایسه، تمرین هدایت‌شده و پاسخ‌نامه.',
  299000,NULL,'practical-grammar-workbook.pdf','BETA'
);
