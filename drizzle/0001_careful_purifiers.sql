CREATE TABLE `itemNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`authorName` varchar(80),
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itemNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wishlistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wishlistId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`priceCents` int,
	`externalUrl` varchar(2048),
	`status` enum('wanted','planned','purchased','completed') NOT NULL DEFAULT 'wanted',
	`position` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wishlistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(32) NOT NULL,
	`ownerToken` varchar(64) NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`),
	CONSTRAINT `wishlists_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `wishlists_owner_token_unique` UNIQUE(`ownerToken`)
);
--> statement-breakpoint
ALTER TABLE `itemNotes` ADD CONSTRAINT `itemNotes_itemId_wishlistItems_id_fk` FOREIGN KEY (`itemId`) REFERENCES `wishlistItems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlistItems` ADD CONSTRAINT `wishlistItems_wishlistId_wishlists_id_fk` FOREIGN KEY (`wishlistId`) REFERENCES `wishlists`(`id`) ON DELETE cascade ON UPDATE no action;