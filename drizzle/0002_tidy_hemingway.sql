CREATE TABLE `fantasy_leagues` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`data` text NOT NULL,
	`version` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fantasy_leagues_code_unique` ON `fantasy_leagues` (`code`);--> statement-breakpoint
CREATE TABLE `fantasy_players` (
	`user_id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`position` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fantasy_players_public_id_unique` ON `fantasy_players` (`public_id`);--> statement-breakpoint
CREATE TABLE `fantasy_results` (
	`room_id` text NOT NULL,
	`player_id` text NOT NULL,
	`stats` text NOT NULL,
	`completed` integer NOT NULL,
	PRIMARY KEY(`room_id`, `player_id`)
);
--> statement-breakpoint
CREATE INDEX `fantasy_results_week` ON `fantasy_results` (`completed`);