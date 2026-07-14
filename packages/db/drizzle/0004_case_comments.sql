-- Case comments (step-level + general) on the test-case definition (new-tables candidate, Phase C).
CREATE TABLE `case_comments` (
	`id` varchar(26) NOT NULL,
	`test_case_id` varchar(26) NOT NULL,
	`test_case_step_id` varchar(26),
	`author_id` varchar(26),
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `case_comments` ADD CONSTRAINT `case_comments_test_case_id_test_cases_id_fk` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_comments` ADD CONSTRAINT `case_comments_test_case_step_id_test_case_steps_id_fk` FOREIGN KEY (`test_case_step_id`) REFERENCES `test_case_steps`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_comments` ADD CONSTRAINT `case_comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cc_test_case_id_idx` ON `case_comments` (`test_case_id`);--> statement-breakpoint
CREATE INDEX `cc_test_case_step_id_idx` ON `case_comments` (`test_case_step_id`);
