-- Reset every post to members-only.
--
-- Audience model: a post is members-only when exclude_from_public = true, and
-- public (visible to logged-out readers / the web front page) when false.
-- At one point posts were mass-set to public, which was never the intention —
-- this reverts all of them to members-only. NSFW posts are already forced to
-- exclude_from_public = true, so this is a safe superset.

UPDATE posts
SET exclude_from_public = true
WHERE exclude_from_public IS DISTINCT FROM true;
