# Deploy to Vercel Production

You are responsible for deploying the application to Vercel production with comprehensive validation and testing.

## CRITICAL: Detailed Status Reporting

You MUST provide detailed, structured status updates throughout the entire deployment process. After EACH step, provide a clear summary with:
- ✅ Success indicator OR ❌ Failure indicator
- Specific details about what happened
- Metrics (error counts, file counts, timing, etc.)
- Next action being taken

At the END of the deployment, provide a comprehensive summary of ALL steps.

## Your Tasks (Execute in Order)

### 1. Check and Fix TypeScript Errors

**Before Starting:**
- Output: "🔍 Step 1/5: Checking TypeScript errors..."

**During Execution:**
- Run `pnpm tsc --noEmit` to check for TypeScript errors
- If NO errors found:
  - Output: "✅ Step 1 Complete: TypeScript check passed - 0 errors found"
  - Proceed to Step 2
- If errors ARE found:
  - Output: "⚠️ Found X TypeScript errors in Y files"
  - List each file with error count
  - Read the affected files
  - Fix ALL TypeScript errors
  - Re-run `pnpm tsc --noEmit` after each fix
  - Output progress: "Fixed errors in [filename] - Z errors remaining"
  - Continue until zero TypeScript errors remain
  - Output: "✅ Step 1 Complete: Fixed X TypeScript errors across Y files"

**If Step Fails:**
- Output: "❌ Step 1 Failed: Unable to resolve TypeScript errors after multiple attempts"
- Provide detailed error information
- Ask user for guidance

### 2. Check and Fix Build Errors

**Before Starting:**
- Output: "🔨 Step 2/5: Running production build..."

**During Execution:**
- Run `pnpm build` to check for build errors
- If build SUCCEEDS:
  - Output: "✅ Step 2 Complete: Build successful (time: Xs)"
  - Proceed to Step 3
- If build FAILS:
  - Output: "⚠️ Build failed with X errors"
  - Analyze and display the error messages
  - Fix ALL build errors
  - Re-run `pnpm build` after fixes
  - Output progress: "Applied fix for [issue] - retrying build..."
  - Continue until the build completes successfully
  - Output: "✅ Step 2 Complete: Build successful after fixing X issues"

**If Step Fails:**
- Output: "❌ Step 2 Failed: Build errors persist after multiple fix attempts"
- Provide detailed error logs
- Ask user for guidance

### 3. Deploy to Vercel Production

**Before Starting:**
- Output: "🚀 Step 3/5: Deploying to Vercel production..."

**During Execution:**
- Run `vercel --prod` to deploy to production
- Monitor the deployment process in real-time
- Output deployment progress updates
- Wait for the deployment to complete
- Capture the deployment URL
- If deployment SUCCEEDS:
  - Output: "✅ Step 3 Complete: Successfully deployed to production"
  - Output: "   📍 URL: [deployment URL]"
  - Output: "   ⏱️ Deploy time: Xs"
- If deployment FAILS:
  - Output: "⚠️ Deployment failed: [error summary]"
  - Analyze the error messages in detail
  - Fix any issues identified
  - Retry the deployment
  - Output: "Retrying deployment after fixes..."
  - Output: "✅ Step 3 Complete: Deployment successful after retry"

**If Step Fails:**
- Output: "❌ Step 3 Failed: Vercel deployment unsuccessful"
- Provide complete error logs
- Ask user for guidance

### 4. Commit and Push Changes

**Before Starting:**
- Output: "📝 Step 4/5: Committing and pushing changes..."

**During Execution:**
- Run `git status` to see what will be committed
- Output: "Changes to commit: X files modified/added"
- Stage all changes with `git add .`
- Create a commit with a descriptive message about what was deployed/fixed
- **IMPORTANT**: Do NOT use co-authoring in the commit message
- Format commit message to summarize the deployment and fixes
- Push to the GitHub repository with `git push`
- Verify the push was successful
- If push SUCCEEDS:
  - Output: "✅ Step 4 Complete: Changes committed and pushed to GitHub"
  - Output: "   📦 Commit: [commit hash]"
  - Output: "   📄 Files: X files changed"
- If push FAILS:
  - Output: "⚠️ Git push failed: [error]"
  - Attempt to resolve (e.g., pull first if needed)
  - Retry the push
  - Output: "✅ Step 4 Complete: Push successful after retry"

**If Step Fails:**
- Output: "❌ Step 4 Failed: Unable to push to GitHub"
- Provide git error details
- Ask user for guidance

### 5. Validate Deployment with Browser Testing

**Before Starting:**
- Output: "🧪 Step 5/5: Testing live deployment at uvala.ai..."

**During Execution:**
- Use `browser_navigate` to go to https://uvala.ai
- Output: "Opening https://uvala.ai..."
- Wait for page to load
- Use `browser_snapshot` to capture the page state
- Check if page loaded correctly
- Use `browser_console_messages` to check for console errors
- Analyze console output for errors/warnings
- Navigate through key pages if applicable
- Test critical functionality

**Reporting Results:**
- If NO issues found:
  - Output: "✅ Step 5 Complete: Site validation passed"
  - Output: "   🌐 Site loaded successfully"
  - Output: "   ✓ No console errors detected"
  - Output: "   ✓ Page rendered correctly"

- If issues ARE found:
  - Output: "⚠️ Step 5 Partial: Site loaded but issues detected"
  - Output detailed breakdown:
    - "Console Errors (X found):"
    - List each error with severity and source
    - "Visual Issues:"
    - Describe any rendering problems
    - "Functionality Issues:"
    - Describe any broken features
  - Provide recommendations for fixes

**If Step Fails:**
- Output: "❌ Step 5 Failed: Site did not load or has critical errors"
- Provide detailed error information
- Include screenshots/snapshots if available
- Recommend rollback or immediate fixes

### 6. Final Deployment Summary

**ALWAYS provide this comprehensive summary at the end:**

```
═══════════════════════════════════════════════
        DEPLOYMENT SUMMARY
═══════════════════════════════════════════════

Step 1: TypeScript Check............[✅ PASSED / ❌ FAILED]
  • Errors found: X
  • Errors fixed: X
  • Status: [details]

Step 2: Production Build............[✅ PASSED / ❌ FAILED]
  • Build time: Xs
  • Issues found: X
  • Status: [details]

Step 3: Vercel Deployment...........[✅ PASSED / ❌ FAILED]
  • URL: [deployment URL]
  • Deploy time: Xs
  • Status: [details]

Step 4: Git Commit & Push...........[✅ PASSED / ❌ FAILED]
  • Commit: [hash]
  • Files changed: X
  • Status: [details]

Step 5: Live Site Testing...........[✅ PASSED / ⚠️ WARNINGS / ❌ FAILED]
  • Console errors: X
  • Page load: [status]
  • Status: [details]

───────────────────────────────────────────────
OVERALL RESULT: [✅ SUCCESS / ⚠️ SUCCESS WITH WARNINGS / ❌ FAILED]
───────────────────────────────────────────────

Total Time: Xm Ys
Changes Deployed: [summary of what was deployed]

[If warnings or failures, provide:]
⚠️ RECOMMENDED ACTIONS:
• [Action item 1]
• [Action item 2]
```

## Important Guidelines

- **Use TodoWrite** to track progress through all 5 tasks
- Mark each task as `in_progress` when starting and `completed` when finished
- **Be thorough** - all errors must be fixed before proceeding to deployment
- **Provide real-time updates** - don't wait until the end to report what happened
- **Use visual indicators** - ✅ ❌ ⚠️ 🔍 🔨 🚀 📝 🧪 make status clear at a glance
- **Include metrics** - error counts, timing, file counts help quantify the deployment
- **If any step fails repeatedly**, ask the user for guidance rather than continuing indefinitely
- **The deployment is only fully successful** if ALL steps complete without errors

## Success Criteria
✅ Zero TypeScript errors
✅ Build completes successfully
✅ Vercel deployment succeeds
✅ Changes committed and pushed to GitHub
✅ Site loads correctly at uvala.ai with no console errors
