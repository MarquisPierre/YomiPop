-- Stops the same dictionary entry from being saved twice.
CREATE UNIQUE INDEX "Card_entryId_key" ON "Card"("entryId");
