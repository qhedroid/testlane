-- Migrate legacy business-title roles to platform capability roles.
-- MySQL requires expanding ENUMs before remapping values, then shrinking.

ALTER TABLE `users` MODIFY COLUMN `global_role` enum('super_admin','admin','qa_lead','qa_engineer','contributor','viewer') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `project_roles` MODIFY COLUMN `role` enum('admin','qa_lead','qa_engineer','contributor','viewer') NOT NULL;--> statement-breakpoint
UPDATE `users` SET `global_role` = 'admin' WHERE `global_role` = 'qa_lead';--> statement-breakpoint
UPDATE `users` SET `global_role` = 'contributor' WHERE `global_role` = 'qa_engineer';--> statement-breakpoint
UPDATE `project_roles` SET `role` = 'admin' WHERE `role` = 'qa_lead';--> statement-breakpoint
UPDATE `project_roles` SET `role` = 'contributor' WHERE `role` = 'qa_engineer';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `global_role` enum('super_admin','admin','contributor','viewer') NOT NULL DEFAULT 'viewer';--> statement-breakpoint
ALTER TABLE `project_roles` MODIFY COLUMN `role` enum('admin','contributor','viewer') NOT NULL;
