CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`topupOrderId` int,
	`userId` int,
	`toEmail` varchar(320) NOT NULL,
	`emailType` varchar(64) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`email_log_status` enum('sent','failed') NOT NULL DEFAULT 'sent',
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
