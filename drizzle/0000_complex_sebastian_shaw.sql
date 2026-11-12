CREATE TABLE `social_friends` (
	`a` text NOT NULL,
	`b` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`a`, `b`)
);
--> statement-breakpoint
CREATE TABLE `social_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text NOT NULL,
	`track` integer NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `invites_recipient` ON `social_invites` (`recipient`,`status`);--> statement-breakpoint
CREATE TABLE `social_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`seen` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_profiles_code_unique` ON `social_profiles` (`code`);--> statement-breakpoint
CREATE TABLE `social_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`guest` text NOT NULL,
	`data` text NOT NULL,
	`version` integer NOT NULL,
	`updated` integer NOT NULL
);
