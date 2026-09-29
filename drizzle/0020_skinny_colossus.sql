ALTER TABLE `orders` ADD `order_supplier` enum('vizlync','tgt') DEFAULT 'vizlync' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `supplierOrderId` varchar(128);--> statement-breakpoint
ALTER TABLE `products_cache` ADD `supplier` enum('vizlync','tgt') DEFAULT 'vizlync' NOT NULL;