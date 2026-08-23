CREATE INDEX `idx_progress_user_completed` ON `lesson_progress` (`user_id`,`completed`);--> statement-breakpoint
CREATE INDEX `idx_profiles_status_created` ON `profiles` (`status`,`created_at`);