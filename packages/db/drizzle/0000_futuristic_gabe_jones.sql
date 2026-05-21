CREATE TABLE `attachments_metadata` (
	`id` varchar(26) NOT NULL,
	`org_id` varchar(26),
	`project_id` varchar(26),
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(26) NOT NULL,
	`filename` varchar(500) NOT NULL,
	`content_type` varchar(255) NOT NULL,
	`size_bytes` bigint unsigned NOT NULL,
	`s3_bucket` varchar(255) NOT NULL,
	`s3_key` varchar(1000) NOT NULL,
	`uploaded_by` varchar(26),
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	`deleted_by` varchar(26),
	CONSTRAINT `attachments_metadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(26) NOT NULL,
	`org_id` varchar(26),
	`project_id` varchar(26),
	`entity_type` varchar(50) NOT NULL,
	`entity_id` varchar(26) NOT NULL,
	`action` varchar(100) NOT NULL,
	`actor_id` varchar(26),
	`old_value` json,
	`new_value` json,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` varchar(26) NOT NULL,
	`project_id` varchar(26) NOT NULL,
	`parent_id` varchar(26),
	`name` varchar(255) NOT NULL,
	`description` text,
	`position` int NOT NULL DEFAULT 0,
	`created_by` varchar(26),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organisations` (
	`id` varchar(26) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organisations_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `project_roles` (
	`id` varchar(26) NOT NULL,
	`project_id` varchar(26) NOT NULL,
	`user_id` varchar(26) NOT NULL,
	`role` enum('admin','qa_lead','qa_engineer','viewer') NOT NULL,
	`granted_by` varchar(26),
	`granted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_role_unique` UNIQUE(`project_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(26) NOT NULL,
	`org_id` varchar(26) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_by` varchar(26),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_org_slug_unique` UNIQUE(`org_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `recent_views` (
	`id` varchar(26) NOT NULL,
	`user_id` varchar(26) NOT NULL,
	`entity_type` enum('test_case','test_run','test_plan') NOT NULL,
	`entity_id` varchar(26) NOT NULL,
	`project_id` varchar(26),
	`display_title` varchar(500) NOT NULL,
	`viewed_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recent_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `rv_user_entity_unique` UNIQUE(`user_id`,`entity_type`,`entity_id`)
);
--> statement-breakpoint
CREATE TABLE `run_assignees` (
	`id` varchar(26) NOT NULL,
	`test_run_id` varchar(26) NOT NULL,
	`user_id` varchar(26) NOT NULL,
	`assigned_by` varchar(26),
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `run_assignees_id` PRIMARY KEY(`id`),
	CONSTRAINT `ra_run_user_unique` UNIQUE(`test_run_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `run_case_step_snapshots` (
	`id` varchar(26) NOT NULL,
	`test_run_case_id` varchar(26) NOT NULL,
	`original_step_id` varchar(26),
	`position` tinyint NOT NULL,
	`action` text NOT NULL,
	`expected_result` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `run_case_step_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `run_defect_links` (
	`id` varchar(26) NOT NULL,
	`test_run_case_id` varchar(26) NOT NULL,
	`defect_ref` varchar(100) NOT NULL,
	`defect_url` varchar(500),
	`linked_by` varchar(26),
	`linked_at` timestamp NOT NULL DEFAULT (now()),
	`unlinked_at` datetime,
	`unlinked_by` varchar(26),
	CONSTRAINT `run_defect_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `run_execution_comments` (
	`id` varchar(26) NOT NULL,
	`test_run_case_id` varchar(26) NOT NULL,
	`user_id` varchar(26),
	`content` text NOT NULL,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `run_execution_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `run_step_results` (
	`id` varchar(26) NOT NULL,
	`test_run_case_id` varchar(26) NOT NULL,
	`step_snapshot_id` varchar(26) NOT NULL,
	`status` enum('not_run','pass','fail','blocked','skip') NOT NULL DEFAULT 'not_run',
	`comment` text,
	`executed_by` varchar(26),
	`executed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `run_step_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `rsr_run_case_step_unique` UNIQUE(`test_run_case_id`,`step_snapshot_id`)
);
--> statement-breakpoint
CREATE TABLE `saved_filters` (
	`id` varchar(26) NOT NULL,
	`user_id` varchar(26) NOT NULL,
	`project_id` varchar(26),
	`view_context` enum('cases','runs','plans','audit') NOT NULL,
	`name` varchar(255) NOT NULL,
	`filter_state` json NOT NULL,
	`is_pinned` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_filters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `test_case_steps` (
	`id` varchar(26) NOT NULL,
	`test_case_id` varchar(26) NOT NULL,
	`position` tinyint NOT NULL,
	`action` text NOT NULL,
	`expected_result` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `test_case_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `test_cases` (
	`id` varchar(26) NOT NULL,
	`case_ref` varchar(20) NOT NULL,
	`project_id` varchar(26) NOT NULL,
	`folder_id` varchar(26),
	`title` varchar(500) NOT NULL,
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`type` enum('functional','smoke','regression','integration','security') NOT NULL DEFAULT 'functional',
	`preconditions` text,
	`description` text,
	`automation_status` enum('manual','automated','semi_automated') NOT NULL DEFAULT 'manual',
	`tags` json DEFAULT ('[]'),
	`assigned_to` varchar(26),
	`created_by` varchar(26),
	`is_archived` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL DEFAULT 0,
	`indexed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `test_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `tc_project_ref_unique` UNIQUE(`project_id`,`case_ref`)
);
--> statement-breakpoint
CREATE TABLE `test_plan_cases` (
	`id` varchar(26) NOT NULL,
	`test_plan_id` varchar(26) NOT NULL,
	`test_case_id` varchar(26) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`added_by` varchar(26),
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `test_plan_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `tpc_plan_case_unique` UNIQUE(`test_plan_id`,`test_case_id`)
);
--> statement-breakpoint
CREATE TABLE `test_plans` (
	`id` varchar(26) NOT NULL,
	`plan_ref` varchar(20) NOT NULL,
	`project_id` varchar(26) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`environment` varchar(100),
	`owner_id` varchar(26),
	`created_by` varchar(26),
	`assignee_ids` json DEFAULT ('[]'),
	`indexed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `test_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_project_ref_unique` UNIQUE(`project_id`,`plan_ref`)
);
--> statement-breakpoint
CREATE TABLE `test_run_cases` (
	`id` varchar(26) NOT NULL,
	`test_run_id` varchar(26) NOT NULL,
	`test_case_id` varchar(26) NOT NULL,
	`snapshot_case_ref` varchar(20) NOT NULL,
	`snapshot_title` varchar(500) NOT NULL,
	`snapshot_preconditions` text,
	`snapshot_description` text,
	`snapshot_priority` enum('critical','high','medium','low') NOT NULL,
	`snapshot_type` enum('functional','smoke','regression','integration','security') NOT NULL,
	`snapshot_folder_name` varchar(255),
	`snapshot_tags` json DEFAULT ('[]'),
	`assigned_to` varchar(26),
	`status` enum('not_run','pass','fail','blocked','skip') NOT NULL DEFAULT 'not_run',
	`comment` text,
	`executed_by` varchar(26),
	`executed_at` datetime,
	`position` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `test_run_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `trc_run_case_unique` UNIQUE(`test_run_id`,`test_case_id`)
);
--> statement-breakpoint
CREATE TABLE `test_runs` (
	`id` varchar(26) NOT NULL,
	`run_ref` varchar(20) NOT NULL,
	`project_id` varchar(26) NOT NULL,
	`test_plan_id` varchar(26),
	`title` varchar(500) NOT NULL,
	`status` enum('active','stalled','sealed','archived') NOT NULL DEFAULT 'active',
	`environment` varchar(100),
	`due_date` date,
	`is_stalled` boolean NOT NULL DEFAULT false,
	`sealed_at` datetime,
	`sealed_by` varchar(26),
	`created_by` varchar(26),
	`indexed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `test_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `run_project_ref_unique` UNIQUE(`project_id`,`run_ref`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(26) NOT NULL,
	`org_id` varchar(26) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`global_role` enum('super_admin','admin','qa_lead','qa_engineer','viewer') NOT NULL DEFAULT 'viewer',
	`is_active` boolean NOT NULL DEFAULT true,
	`last_login_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `attachments_metadata` ADD CONSTRAINT `attachments_metadata_org_id_organisations_id_fk` FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments_metadata` ADD CONSTRAINT `attachments_metadata_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments_metadata` ADD CONSTRAINT `attachments_metadata_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments_metadata` ADD CONSTRAINT `attachments_metadata_deleted_by_users_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_org_id_organisations_id_fk` FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `folders` ADD CONSTRAINT `folders_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `folders` ADD CONSTRAINT `folders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_roles` ADD CONSTRAINT `project_roles_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_roles` ADD CONSTRAINT `project_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_roles` ADD CONSTRAINT `project_roles_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_org_id_organisations_id_fk` FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recent_views` ADD CONSTRAINT `recent_views_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recent_views` ADD CONSTRAINT `recent_views_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_assignees` ADD CONSTRAINT `run_assignees_test_run_id_test_runs_id_fk` FOREIGN KEY (`test_run_id`) REFERENCES `test_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_assignees` ADD CONSTRAINT `run_assignees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_assignees` ADD CONSTRAINT `run_assignees_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_case_step_snapshots` ADD CONSTRAINT `run_case_step_snapshots_test_run_case_id_test_run_cases_id_fk` FOREIGN KEY (`test_run_case_id`) REFERENCES `test_run_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_case_step_snapshots` ADD CONSTRAINT `run_case_step_snapshots_original_step_id_test_case_steps_id_fk` FOREIGN KEY (`original_step_id`) REFERENCES `test_case_steps`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_defect_links` ADD CONSTRAINT `run_defect_links_test_run_case_id_test_run_cases_id_fk` FOREIGN KEY (`test_run_case_id`) REFERENCES `test_run_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_defect_links` ADD CONSTRAINT `run_defect_links_linked_by_users_id_fk` FOREIGN KEY (`linked_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_defect_links` ADD CONSTRAINT `run_defect_links_unlinked_by_users_id_fk` FOREIGN KEY (`unlinked_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_execution_comments` ADD CONSTRAINT `run_execution_comments_test_run_case_id_test_run_cases_id_fk` FOREIGN KEY (`test_run_case_id`) REFERENCES `test_run_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_execution_comments` ADD CONSTRAINT `run_execution_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_step_results` ADD CONSTRAINT `run_step_results_test_run_case_id_test_run_cases_id_fk` FOREIGN KEY (`test_run_case_id`) REFERENCES `test_run_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_step_results` ADD CONSTRAINT `run_step_results_step_snapshot_id_run_case_step_snapshots_id_fk` FOREIGN KEY (`step_snapshot_id`) REFERENCES `run_case_step_snapshots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_step_results` ADD CONSTRAINT `run_step_results_executed_by_users_id_fk` FOREIGN KEY (`executed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_filters` ADD CONSTRAINT `saved_filters_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_filters` ADD CONSTRAINT `saved_filters_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_case_steps` ADD CONSTRAINT `test_case_steps_test_case_id_test_cases_id_fk` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_folder_id_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_cases` ADD CONSTRAINT `test_cases_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_plan_cases` ADD CONSTRAINT `test_plan_cases_test_plan_id_test_plans_id_fk` FOREIGN KEY (`test_plan_id`) REFERENCES `test_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_plan_cases` ADD CONSTRAINT `test_plan_cases_test_case_id_test_cases_id_fk` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_plan_cases` ADD CONSTRAINT `test_plan_cases_added_by_users_id_fk` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_plans` ADD CONSTRAINT `test_plans_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_plans` ADD CONSTRAINT `test_plans_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_plans` ADD CONSTRAINT `test_plans_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_run_cases` ADD CONSTRAINT `test_run_cases_test_run_id_test_runs_id_fk` FOREIGN KEY (`test_run_id`) REFERENCES `test_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_run_cases` ADD CONSTRAINT `test_run_cases_test_case_id_test_cases_id_fk` FOREIGN KEY (`test_case_id`) REFERENCES `test_cases`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_run_cases` ADD CONSTRAINT `test_run_cases_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_run_cases` ADD CONSTRAINT `test_run_cases_executed_by_users_id_fk` FOREIGN KEY (`executed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_runs` ADD CONSTRAINT `test_runs_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_runs` ADD CONSTRAINT `test_runs_test_plan_id_test_plans_id_fk` FOREIGN KEY (`test_plan_id`) REFERENCES `test_plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_runs` ADD CONSTRAINT `test_runs_sealed_by_users_id_fk` FOREIGN KEY (`sealed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `test_runs` ADD CONSTRAINT `test_runs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_org_id_organisations_id_fk` FOREIGN KEY (`org_id`) REFERENCES `organisations`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `am_entity_idx` ON `attachments_metadata` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `am_project_idx` ON `attachments_metadata` (`project_id`);--> statement-breakpoint
CREATE INDEX `am_s3_key_idx` ON `attachments_metadata` (`s3_bucket`);--> statement-breakpoint
CREATE INDEX `am_active_attachments_idx` ON `attachments_metadata` (`entity_type`,`entity_id`,`is_deleted`);--> statement-breakpoint
CREATE INDEX `al_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `al_project_created_idx` ON `audit_log` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `al_actor_created_idx` ON `audit_log` (`actor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `al_org_created_idx` ON `audit_log` (`org_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `al_created_at_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `folder_project_id_idx` ON `folders` (`project_id`);--> statement-breakpoint
CREATE INDEX `folder_parent_id_idx` ON `folders` (`parent_id`);--> statement-breakpoint
CREATE INDEX `folder_project_position_idx` ON `folders` (`project_id`,`position`);--> statement-breakpoint
CREATE INDEX `pr_project_id_idx` ON `project_roles` (`project_id`);--> statement-breakpoint
CREATE INDEX `pr_user_id_idx` ON `project_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_org_id_idx` ON `projects` (`org_id`);--> statement-breakpoint
CREATE INDEX `project_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `rv_user_viewed_at_idx` ON `recent_views` (`user_id`,`viewed_at`);--> statement-breakpoint
CREATE INDEX `ra_test_run_id_idx` ON `run_assignees` (`test_run_id`);--> statement-breakpoint
CREATE INDEX `ra_user_id_idx` ON `run_assignees` (`user_id`);--> statement-breakpoint
CREATE INDEX `rcss_test_run_case_id_idx` ON `run_case_step_snapshots` (`test_run_case_id`);--> statement-breakpoint
CREATE INDEX `rcss_test_run_case_pos_idx` ON `run_case_step_snapshots` (`test_run_case_id`,`position`);--> statement-breakpoint
CREATE INDEX `rdl_test_run_case_id_idx` ON `run_defect_links` (`test_run_case_id`);--> statement-breakpoint
CREATE INDEX `rdl_defect_ref_idx` ON `run_defect_links` (`defect_ref`);--> statement-breakpoint
CREATE INDEX `rdl_active_links_idx` ON `run_defect_links` (`test_run_case_id`,`unlinked_at`);--> statement-breakpoint
CREATE INDEX `rec_test_run_case_id_idx` ON `run_execution_comments` (`test_run_case_id`);--> statement-breakpoint
CREATE INDEX `rec_user_id_idx` ON `run_execution_comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `rec_active_comments_idx` ON `run_execution_comments` (`test_run_case_id`,`is_deleted`);--> statement-breakpoint
CREATE INDEX `rsr_test_run_case_id_idx` ON `run_step_results` (`test_run_case_id`);--> statement-breakpoint
CREATE INDEX `sf_user_context_idx` ON `saved_filters` (`user_id`,`view_context`);--> statement-breakpoint
CREATE INDEX `sf_project_context_idx` ON `saved_filters` (`project_id`,`view_context`);--> statement-breakpoint
CREATE INDEX `step_test_case_id_idx` ON `test_case_steps` (`test_case_id`);--> statement-breakpoint
CREATE INDEX `step_test_case_pos_idx` ON `test_case_steps` (`test_case_id`,`position`);--> statement-breakpoint
CREATE INDEX `tc_project_folder_idx` ON `test_cases` (`project_id`,`folder_id`);--> statement-breakpoint
CREATE INDEX `tc_project_archived_idx` ON `test_cases` (`project_id`,`is_archived`);--> statement-breakpoint
CREATE INDEX `tc_priority_idx` ON `test_cases` (`priority`);--> statement-breakpoint
CREATE INDEX `tc_assigned_to_idx` ON `test_cases` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `tc_updated_at_idx` ON `test_cases` (`updated_at`);--> statement-breakpoint
CREATE INDEX `tpc_test_plan_id_idx` ON `test_plan_cases` (`test_plan_id`);--> statement-breakpoint
CREATE INDEX `tpc_test_case_id_idx` ON `test_plan_cases` (`test_case_id`);--> statement-breakpoint
CREATE INDEX `plan_project_status_idx` ON `test_plans` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `plan_owner_id_idx` ON `test_plans` (`owner_id`);--> statement-breakpoint
CREATE INDEX `plan_updated_at_idx` ON `test_plans` (`updated_at`);--> statement-breakpoint
CREATE INDEX `trc_run_id_idx` ON `test_run_cases` (`test_run_id`);--> statement-breakpoint
CREATE INDEX `trc_run_status_idx` ON `test_run_cases` (`test_run_id`,`status`);--> statement-breakpoint
CREATE INDEX `trc_run_priority_pos_idx` ON `test_run_cases` (`test_run_id`,`snapshot_priority`,`position`);--> statement-breakpoint
CREATE INDEX `trc_assigned_to_idx` ON `test_run_cases` (`test_run_id`,`assigned_to`);--> statement-breakpoint
CREATE INDEX `run_project_status_idx` ON `test_runs` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `run_project_plan_idx` ON `test_runs` (`project_id`,`test_plan_id`);--> statement-breakpoint
CREATE INDEX `run_project_stalled_idx` ON `test_runs` (`project_id`,`is_stalled`);--> statement-breakpoint
CREATE INDEX `run_updated_at_idx` ON `test_runs` (`updated_at`);--> statement-breakpoint
CREATE INDEX `user_org_id_idx` ON `users` (`org_id`);--> statement-breakpoint
CREATE INDEX `user_org_role_idx` ON `users` (`org_id`,`global_role`);