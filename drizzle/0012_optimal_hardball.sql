CREATE TABLE `topup_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentOrderId` int NOT NULL,
	`userId` int,
	`topupProductId` varchar(64) NOT NULL,
	`topupProductName` varchar(255) NOT NULL,
	`priceHkd` int NOT NULL,
	`stripeSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`vizlyncTopupOrderId` varchar(64),
	`topup_status` enum('pending_payment','paid','completed','failed') NOT NULL DEFAULT 'pending_payment',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topup_orders_id` PRIMARY KEY(`id`)
);
