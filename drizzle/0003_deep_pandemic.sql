CREATE TABLE `chart_plays` (
	`user_id` text NOT NULL,
	`game` text NOT NULL,
	`day` integer NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`user_id`, `game`, `day`)
);
--> statement-breakpoint
CREATE INDEX `chart_plays_day_game` ON `chart_plays` (`day`,`game`);--> statement-breakpoint
CREATE TABLE `chart_progress` (
	`user_id` text NOT NULL,
	`game` text NOT NULL,
	`run` text NOT NULL,
	`event` text NOT NULL,
	`progress` integer NOT NULL,
	PRIMARY KEY(`user_id`, `game`, `run`, `event`)
);
--> statement-breakpoint
CREATE TABLE `chart_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game` text NOT NULL,
	`session_id` text NOT NULL,
	`event` text NOT NULL,
	`run` text NOT NULL,
	`progress` integer NOT NULL,
	`amount` integer NOT NULL,
	`points` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chart_scores_game_time_user` ON `chart_scores` (`game`,`created`,`user_id`);--> statement-breakpoint
CREATE INDEX `chart_scores_session` ON `chart_scores` (`session_id`);--> statement-breakpoint
CREATE TABLE `chart_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game` text NOT NULL,
	`started` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chart_sessions_user_time` ON `chart_sessions` (`user_id`,`started`);