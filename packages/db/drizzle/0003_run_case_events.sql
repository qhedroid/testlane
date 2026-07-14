-- Append-only per-case execution transition log (new-tables candidate, Phase B).
CREATE TABLE `run_case_events` (
	`id` varchar(26) NOT NULL,
	`test_run_case_id` varchar(26) NOT NULL,
	`actor_id` varchar(26),
	`event` enum('created','result') NOT NULL,
	`from_status` enum('not_run','pass','fail','blocked','skip'),
	`to_status` enum('not_run','pass','fail','blocked','skip'),
	`at` datetime NOT NULL,
	CONSTRAINT `run_case_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `run_case_events` ADD CONSTRAINT `run_case_events_test_run_case_id_test_run_cases_id_fk` FOREIGN KEY (`test_run_case_id`) REFERENCES `test_run_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `run_case_events` ADD CONSTRAINT `run_case_events_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `rce_test_run_case_id_idx` ON `run_case_events` (`test_run_case_id`);
