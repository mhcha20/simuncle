CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message` text NOT NULL,
	`messageZhTW` text,
	`messageZhCN` text,
	`link` varchar(512),
	`linkText` varchar(128),
	`bgColor` varchar(32) NOT NULL DEFAULT '#16a34a',
	`textColor` varchar(32) NOT NULL DEFAULT '#ffffff',
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
