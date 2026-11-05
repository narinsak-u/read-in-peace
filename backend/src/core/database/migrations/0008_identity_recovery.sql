CREATE UNIQUE INDEX "account_central_identity_subject_unique" ON "account" USING btree ("account_id") WHERE "provider_id" = 'central-identity';--> statement-breakpoint
CREATE UNIQUE INDEX "account_central_identity_user_unique" ON "account" USING btree ("user_id") WHERE "provider_id" = 'central-identity';
