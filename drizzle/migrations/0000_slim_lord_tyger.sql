CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"file_type" text NOT NULL,
	"file_path" text NOT NULL,
	"file_hash" text NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error_message" text,
	"metadata" jsonb,
	CONSTRAINT "documents_file_hash_unique" UNIQUE("file_hash"),
	CONSTRAINT "check_status" CHECK ("documents"."status" IN ('uploaded', 'processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "enrichment_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"content" text NOT NULL,
	"relevance_score" numeric(3, 2),
	"mandatory" boolean DEFAULT false NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "check_source_type" CHECK ("enrichment_sources"."source_type" IN (
        'ios_hig',
        'android_material',
        'apple_store',
        'google_play',
        'wcag',
        'owasp',
        'gdpr',
        'ccpa',
        'edge_case',
        'legal',
        'other'
      )),
	CONSTRAINT "check_relevance_score" CHECK ("enrichment_sources"."relevance_score" >= 0 AND "enrichment_sources"."relevance_score" <= 1)
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"raw_data" jsonb,
	"embedding" vector(3072),
	"obsolete" boolean DEFAULT false NOT NULL,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_evidence_type" CHECK ("evidence"."type" IN (
        'ui_element',
        'flow',
        'endpoint',
        'payload',
        'requirement',
        'edge_case',
        'acceptance_criteria',
        'bug',
        'constraint'
      ))
);
--> statement-breakpoint
CREATE TABLE "feature_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"strength" numeric(3, 2),
	"reasoning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_feature_evidence" UNIQUE("feature_id","evidence_id"),
	CONSTRAINT "check_relationship_type" CHECK ("feature_evidence"."relationship_type" IN ('implements', 'supports', 'constrains', 'extends')),
	CONSTRAINT "check_strength_range" CHECK ("feature_evidence"."strength" >= 0 AND "feature_evidence"."strength" <= 1)
);
--> statement-breakpoint
CREATE TABLE "feature_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"output_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "check_output_type" CHECK ("feature_outputs"."output_type" IN (
        'epic',
        'story',
        'acceptance_criteria',
        'api_contract',
        'requirements'
      ))
);
--> statement-breakpoint
CREATE TABLE "features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"confidence_score" numeric(3, 2),
	"status" text DEFAULT 'candidate' NOT NULL,
	"inferred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"enrichment_status" text DEFAULT 'pending',
	"enriched_at" timestamp with time zone,
	"enrichment_error" text,
	"metadata" jsonb,
	CONSTRAINT "check_feature_status" CHECK ("features"."status" IN ('candidate', 'confirmed', 'rejected')),
	CONSTRAINT "check_confidence_range" CHECK ("features"."confidence_score" >= 0 AND "features"."confidence_score" <= 1),
	CONSTRAINT "check_enrichment_status" CHECK ("features"."enrichment_status" IN ('pending', 'enriching', 'completed', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "guideline_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"job_type" text DEFAULT 'extract' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_job_status" CHECK ("processing_jobs"."status" IN ('pending', 'processing', 'completed', 'failed')),
	CONSTRAINT "check_job_type" CHECK ("processing_jobs"."job_type" IN ('extract', 'embed', 'infer'))
);
--> statement-breakpoint
ALTER TABLE "enrichment_sources" ADD CONSTRAINT "enrichment_sources_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_evidence" ADD CONSTRAINT "feature_evidence_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_evidence" ADD CONSTRAINT "feature_evidence_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_outputs" ADD CONSTRAINT "feature_outputs_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;