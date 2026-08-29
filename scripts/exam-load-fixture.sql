-- LOCAL/STAGING LOAD-TEST DATA ONLY.
-- Recreates exactly 100 approved A1 students with password ExamLoad123! and
-- grants the A1 course entitlement required by the seeded A1 exam.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DELETE FROM exam_answers
WHERE attempt_id IN (
  SELECT a.id FROM exam_attempts a JOIN users u ON u.id=a.user_id
  WHERE u.email LIKE 'exam-load-%@enacademy.loadtest'
);
DELETE FROM exam_attempts
WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'exam-load-%@enacademy.loadtest');
DELETE FROM product_entitlements
WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'exam-load-%@enacademy.loadtest');
DELETE FROM purchase_orders
WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'exam-load-%@enacademy.loadtest');
DELETE FROM users WHERE email LIKE 'exam-load-%@enacademy.loadtest';

WITH shared_password AS MATERIALIZED (
  SELECT crypt('ExamLoad123!',gen_salt('bf',12)) AS password_hash
)
INSERT INTO users(id,email,full_name,password_hash,role,status,email_verified_at)
SELECT md5('enacademy-exam-user-'||student)::uuid,
       'exam-load-'||lpad(student::text,3,'0')||'@enacademy.loadtest',
       'Exam Load Student '||lpad(student::text,3,'0'),
       shared_password.password_hash,'STUDENT','APPROVED',now()
FROM generate_series(1,100) student CROSS JOIN shared_password;

INSERT INTO purchase_orders(id,user_id,status,currency,subtotal_toman,total_toman)
SELECT md5('enacademy-exam-order-'||student)::uuid,
       md5('enacademy-exam-user-'||student)::uuid,
       'APPROVED','TOMAN',0,0
FROM generate_series(1,100) student;

INSERT INTO product_entitlements(id,user_id,product_id,granted_by_order_id)
SELECT md5('enacademy-exam-entitlement-'||student)::uuid,
       md5('enacademy-exam-user-'||student)::uuid,
       '10000000-0000-0000-0000-000000000001',
       md5('enacademy-exam-order-'||student)::uuid
FROM generate_series(1,100) student;

SELECT count(*) AS prepared_exam_students
FROM users WHERE email LIKE 'exam-load-%@enacademy.loadtest';
