-- Plan query definitions (new-tables candidate, Phase F / GAP-01, Option a).
-- Persists the frontend's TestQuery[] authoring model (condition/folder/static
-- groups) as JSON so authored dynamic queries survive a fresh browser/device
-- and a reseed. Resolution stays client-side: the resolved case list is still
-- written to test_plan_cases (the run-spawn source of truth) — this column only
-- makes the *definitions* durable. NULL = no stored definition (seeded/legacy
-- plans fall back to a synthesized static group from test_plan_cases).
ALTER TABLE `test_plans` ADD `query_definition` json;
