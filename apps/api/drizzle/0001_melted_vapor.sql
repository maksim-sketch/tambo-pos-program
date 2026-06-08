CREATE TABLE `pos_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`tenant_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`created_at` text NOT NULL,
	`closed_at` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pos_sessions_token_unique` ON `pos_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `pos_sessions_tenant+branch_ids` ON `pos_sessions` (`tenant_id`,`branch_id`);