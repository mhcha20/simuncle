ALTER TABLE `orders` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `guestEmail` varchar(255);