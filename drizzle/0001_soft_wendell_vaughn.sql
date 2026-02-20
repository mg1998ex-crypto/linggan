CREATE TABLE `inspirations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`word1` varchar(50) NOT NULL,
	`word2` varchar(50) NOT NULL,
	`word3` varchar(50) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspirations_id` PRIMARY KEY(`id`)
);
