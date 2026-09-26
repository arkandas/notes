-- AlterTable
ALTER TABLE "users" ADD COLUMN     "oidc_sub" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_oidc_sub_key" ON "users"("oidc_sub");
