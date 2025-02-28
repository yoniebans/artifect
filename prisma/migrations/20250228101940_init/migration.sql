-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_phases" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "lifecycle_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "syntax" TEXT NOT NULL DEFAULT 'markdown',
    "lifecycle_phase_id" INTEGER NOT NULL,

    CONSTRAINT "artifact_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_type_dependencies" (
    "dependent_type_id" INTEGER NOT NULL,
    "dependency_type_id" INTEGER NOT NULL,

    CONSTRAINT "artifact_type_dependencies_pkey" PRIMARY KEY ("dependent_type_id","dependency_type_id")
);

-- CreateTable
CREATE TABLE "artifact_states" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "artifact_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_transitions" (
    "id" SERIAL NOT NULL,
    "from_state_id" INTEGER NOT NULL,
    "to_state_id" INTEGER NOT NULL,

    CONSTRAINT "state_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "artifact_type_id" INTEGER NOT NULL,
    "current_version_id" INTEGER,
    "state_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_versions" (
    "id" SERIAL NOT NULL,
    "artifact_id" INTEGER NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifact_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_interactions" (
    "id" SERIAL NOT NULL,
    "artifact_id" INTEGER NOT NULL,
    "version_id" INTEGER,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifact_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reasoning_summaries" (
    "id" SERIAL NOT NULL,
    "artifact_id" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reasoning_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "summary_versions" (
    "summary_id" INTEGER NOT NULL,
    "version_id" INTEGER NOT NULL,

    CONSTRAINT "summary_versions_pkey" PRIMARY KEY ("summary_id","version_id")
);

-- CreateTable
CREATE TABLE "reasoning_points" (
    "id" SERIAL NOT NULL,
    "summary_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "point" TEXT NOT NULL,
    "importance_score" INTEGER NOT NULL,

    CONSTRAINT "reasoning_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artifact_types_slug_key" ON "artifact_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "artifacts_current_version_id_key" ON "artifacts"("current_version_id");

-- AddForeignKey
ALTER TABLE "artifact_types" ADD CONSTRAINT "artifact_types_lifecycle_phase_id_fkey" FOREIGN KEY ("lifecycle_phase_id") REFERENCES "lifecycle_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_type_dependencies" ADD CONSTRAINT "artifact_type_dependencies_dependent_type_id_fkey" FOREIGN KEY ("dependent_type_id") REFERENCES "artifact_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_type_dependencies" ADD CONSTRAINT "artifact_type_dependencies_dependency_type_id_fkey" FOREIGN KEY ("dependency_type_id") REFERENCES "artifact_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state_transitions" ADD CONSTRAINT "state_transitions_from_state_id_fkey" FOREIGN KEY ("from_state_id") REFERENCES "artifact_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state_transitions" ADD CONSTRAINT "state_transitions_to_state_id_fkey" FOREIGN KEY ("to_state_id") REFERENCES "artifact_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_artifact_type_id_fkey" FOREIGN KEY ("artifact_type_id") REFERENCES "artifact_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "artifact_states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "artifact_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_versions" ADD CONSTRAINT "artifact_versions_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_interactions" ADD CONSTRAINT "artifact_interactions_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "artifact_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_interactions" ADD CONSTRAINT "artifact_interactions_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reasoning_summaries" ADD CONSTRAINT "reasoning_summaries_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_versions" ADD CONSTRAINT "summary_versions_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "reasoning_summaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summary_versions" ADD CONSTRAINT "summary_versions_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "artifact_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reasoning_points" ADD CONSTRAINT "reasoning_points_summary_id_fkey" FOREIGN KEY ("summary_id") REFERENCES "reasoning_summaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
