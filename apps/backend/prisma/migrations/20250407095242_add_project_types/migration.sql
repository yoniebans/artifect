/*
  Warnings:

  - A unique constraint covering the columns `[name,project_type_id]` on the table `lifecycle_phases` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `project_type_id` to the `lifecycle_phases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_type_id` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "lifecycle_phases" ADD COLUMN     "project_type_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "project_type_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "project_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_types_name_key" ON "project_types"("name");

-- CreateIndex
CREATE INDEX "lifecycle_phases_project_type_id_idx" ON "lifecycle_phases"("project_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "lifecycle_phases_name_project_type_id_key" ON "lifecycle_phases"("name", "project_type_id");

-- CreateIndex
CREATE INDEX "projects_project_type_id_idx" ON "projects"("project_type_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_project_type_id_fkey" FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_phases" ADD CONSTRAINT "lifecycle_phases_project_type_id_fkey" FOREIGN KEY ("project_type_id") REFERENCES "project_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
