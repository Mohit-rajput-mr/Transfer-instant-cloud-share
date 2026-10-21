#!/usr/bin/env bash
# Vercel "Ignored Build Step" (vercel.json ignoreCommand): exit 0 = skip this build, exit 1 = build.
# The free plan allows ~100 builds a day for the whole team; agent branches and notes-only commits used them up
# (2026-10-21: "Deployment rate limited — retry in 24 hours"). So: only the live branch builds, and only when
# something the site is made of changed.
[ "$VERCEL_GIT_COMMIT_REF" = "claude/festive-keller-rln4jk" ] || { echo "skip: not the live branch ($VERCEL_GIT_COMMIT_REF)"; exit 0; }
base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"
git cat-file -e "$base^{commit}" 2>/dev/null || { echo "build: no previous commit to compare"; exit 1; }
if git diff --quiet "$base" HEAD -- . ':(exclude)*.md' ':(exclude)media' ':(exclude)docs' ':(exclude)live' ':(exclude)supabase' ':(exclude)scripts' ':(exclude).github'; then
  echo "skip: only notes, media, the live Worker, migrations or scripts changed"; exit 0
fi
echo "build: site code changed"; exit 1
