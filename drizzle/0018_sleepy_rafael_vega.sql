CREATE TABLE `sync_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggeredBy` enum('manual','scheduled') NOT NULL DEFAULT 'manual',
	`sync_status` enum('success','failed') NOT NULL DEFAULT 'success',
	`totalProducts` int NOT NULL DEFAULT 0,
	`added` int NOT NULL DEFAULT 0,
	`removed` int NOT NULL DEFAULT 0,
	`priceChanged` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_history_id` PRIMARY KEY(`id`)
);
