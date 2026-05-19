CREATE TABLE "scan_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"product_name" text DEFAULT 'REPLAICED' NOT NULL,
	"product_url" text DEFAULT 'https://replaiced.co' NOT NULL,
	"product_description" text DEFAULT 'A tool that scores how at-risk your job is from AI replacement, suggests skills to learn to stay ahead, and recommends potential career pivots based on your resume.' NOT NULL,
	"product_keywords" text[] DEFAULT '{"AI replacement","job displacement","career pivot","AI-proofing"}' NOT NULL,
	"icp_titles" text[] DEFAULT '{"knowledge worker","software engineer","marketer","designer","product manager","analyst"}' NOT NULL,
	"search_queries" text[] NOT NULL,
	"scans_paused" boolean DEFAULT false,
	"last_edited_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_results_count" integer,
	"scored_results_count" integer,
	"apify_run_id" text,
	"error_message" text,
	"cost_cents" integer,
	"triggered_by" text
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"tweet_id" text NOT NULL,
	"tweet_url" text NOT NULL,
	"tweet_text" text NOT NULL,
	"tweet_posted_at" timestamp with time zone NOT NULL,
	"tweet_likes" integer DEFAULT 0,
	"tweet_replies" integer DEFAULT 0,
	"tweet_retweets" integer DEFAULT 0,
	"author_username" text NOT NULL,
	"author_display_name" text,
	"author_url" text,
	"author_bio" text,
	"author_followers" integer,
	"author_following" integer,
	"author_account_age_days" integer,
	"author_verified" boolean DEFAULT false,
	"intent_score" integer NOT NULL,
	"intent_reason" text,
	"intent_flavor" text,
	"relevance_score" integer NOT NULL,
	"relevance_reason" text,
	"recency_score" integer NOT NULL,
	"recency_reason" text,
	"total_score" integer NOT NULL,
	"tier" text NOT NULL,
	"match_explanation" text,
	"auto_disqualified" boolean DEFAULT false,
	"disqualification_reason" text,
	"draft_reply" text,
	"draft_dm" text,
	"user_marked_irrelevant" boolean DEFAULT false,
	"user_saved" boolean DEFAULT false,
	"feedback_text" text
);
--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."scans"("id") ON DELETE cascade ON UPDATE no action;