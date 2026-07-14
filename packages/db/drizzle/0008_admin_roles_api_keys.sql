-- Admin settings: role definitions + API keys (new-tables candidate, Phase G).
-- Org-scoped (the Admin panel is global/org-level, not project-scoped), mirroring
-- the `users` table. Backs the frontend AdminRole + AdminApiKey models.
-- Roles + API keys only this phase; automation stays local, custom fields are
-- out of scope (mvp-custom-fields owns them). Hand-authored to match the
-- 0002-0007 convention (no drizzle-kit generate — see progress.md Phase A note).
CREATE TABLE `role_definitions` (
	`id` varchar(26) NOT NULL,
	`org_id` varchar(26) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`is_project_level` boolean NOT NULL DEFAULT false,
	`is_built_in` boolean NOT NULL DEFAULT false,
	`permissions` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_definitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_def_org_name_unique` UNIQUE(`org_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` varchar(26) NOT NULL,
	`org_id` varchar(26) NOT NULL,
	`name` varchar(255) NOT NULL,
	`key_masked` varchar(255) NOT NULL,
	`project` varchar(255) NOT NULL,
	`permissions` varchar(255) NOT NULL,
	`expiration` varchar(100) NOT NULL,
	`created_by` varchar(26),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `role_definitions` ADD CONSTRAINT `role_definitions_org_id_organisations_id_fk` FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_org_id_organisations_id_fk` FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `role_def_org_id_idx` ON `role_definitions` (`org_id`);--> statement-breakpoint
CREATE INDEX `api_key_org_id_idx` ON `api_keys` (`org_id`);
