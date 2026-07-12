-- Defects (project-scoped entities) + nullable defect_id FK on run_defect_links
-- (new-tables candidate, Phase E). Internal ("Local") defects become first-class
-- rows here; run_defect_links.defect_id points at them for internal links while
-- defect_ref carries the DEF-<n> key. External refs keep defect_id NULL and only
-- fill the free-text defect_ref — external linking is untouched by this phase.
CREATE TABLE `defects` (
	`id` varchar(26) NOT NULL,
	`defect_ref` varchar(20) NOT NULL,
	`project_id` varchar(26) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`created_by` varchar(26),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `defects_id` PRIMARY KEY(`id`),
	CONSTRAINT `def_project_ref_unique` UNIQUE(`project_id`,`defect_ref`)
);
--> statement-breakpoint
ALTER TABLE `run_defect_links` ADD `defect_id` varchar(26);--> statement-breakpoint
ALTER TABLE `defects` ADD CONSTRAINT `defects_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `defects` ADD CONSTRAINT `defects_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_defect_links` ADD CONSTRAINT `run_defect_links_defect_id_defects_id_fk` FOREIGN KEY (`defect_id`) REFERENCES `defects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `def_project_id_idx` ON `defects` (`project_id`);
