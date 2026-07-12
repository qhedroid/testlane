-- Requirements (project-scoped entities) + case<->requirement links (new-tables candidate, Phase D).
CREATE TABLE `requirements` (
	`id` varchar(26) NOT NULL,
	`requirement_ref` varchar(20) NOT NULL,
	`project_id` varchar(26) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('draft','approved','implemented','obsolete') NOT NULL DEFAULT 'draft',
	`created_by` varchar(26),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `requirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `req_project_ref_unique` UNIQUE(`project_id`,`requirement_ref`)
);
--> statement-breakpoint
CREATE TABLE `case_requirements` (
	`id` varchar(26) NOT NULL,
	`test_case_id` varchar(26) NOT NULL,
	`requirement_id` varchar(26) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `case_requirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `cr_case_req_unique` UNIQUE(`test_case_id`,`requirement_id`)
);
--> statement-breakpoint
ALTER TABLE `requirements` ADD CONSTRAINT `requirements_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requirements` ADD CONSTRAINT `requirements_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_requirements` ADD CONSTRAINT `case_requirements_test_case_id_test_cases_id_fk` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `case_requirements` ADD CONSTRAINT `case_requirements_requirement_id_requirements_id_fk` FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `req_project_id_idx` ON `requirements` (`project_id`);--> statement-breakpoint
CREATE INDEX `cr_test_case_id_idx` ON `case_requirements` (`test_case_id`);--> statement-breakpoint
CREATE INDEX `cr_requirement_id_idx` ON `case_requirements` (`requirement_id`);
