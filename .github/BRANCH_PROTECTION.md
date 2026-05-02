# Branch protection — recommended settings for `main`

This file documents the GitHub branch-protection settings the maintainer
should apply via the repo Settings UI (or `gh api`). Some of these
require admin access and can't be set from a PR's code changes.

The current state and the gaps are explained inline so you can adopt
them incrementally.

## Apply via GitHub UI

Settings → Branches → Branch protection rules → `main` → Edit

| Setting                                          | Recommended            | Current  | Why                                                                    |
| ------------------------------------------------ | ---------------------- | -------- | ---------------------------------------------------------------------- |
| Require a pull request before merging            | **on**                 | off      | Forces every change through a PR; no surprise direct pushes to `main`. |
| ↳ Require approvals                              | **1**                  | 0        | At minimum a self-review checkbox; pairs with CODEOWNERS for routing.  |
| ↳ Dismiss stale approvals on new commits         | **on**                 | off      | Re-review when the diff changes after approval.                        |
| ↳ Require review from Code Owners                | **on**                 | off      | The new `.github/CODEOWNERS` routes auth/db/CI changes to you.         |
| Require status checks to pass before merging     | **on**                 | on       | Already on.                                                            |
| ↳ Require branches to be up to date              | **on**                 | on       | Already on.                                                            |
| ↳ Required check                                 | **`ci`**               | `ci`     | Already required. The new umbrella job in `ci.yml` now actually emits this check (previously the rule waited on a check name that no job reported, hence the `Bypassed rule violations` warnings on every push). |
| Require conversation resolution before merging   | **on**                 | off      | Stops "merged with unresolved comments" mistakes.                      |
| Require signed commits                           | optional               | off      | Worth enabling if you set up a signing key; not required for safety.   |
| Require linear history                           | **on**                 | off      | Forces squash/rebase; merge-commit clutter is real.                    |
| Do not allow bypassing the above settings        | **on**                 | off      | This is `enforce_admins`. Without it, you (admin) silently bypass everything. |
| Restrict who can push to matching branches       | optional               | off      | If `Require PR` is on, this is largely redundant.                      |
| Allow force pushes                               | **off**                | off      | Already off.                                                           |
| Allow deletions                                  | **off**                | off      | Already off.                                                           |

## Apply via `gh api` (one shot)

If you'd rather flip everything at once:

```bash
gh api -X PUT repos/hudsor01/ink37-tattoos/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [{ "context": "ci", "app_id": 15368 }]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "required_conversation_resolution": true,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_signatures": false,
  "restrictions": null
}
JSON
```

`enforce_admins: true` and `required_pull_request_reviews.required_approving_review_count: 1` are the two settings that close the "admin direct-push to main with no review" loophole. As a solo maintainer you can self-approve via the GitHub UI; the friction is intentional and surfaces in code review when a second person eventually joins.

## Verifying the new `ci` umbrella check

After this PR merges, the next push or PR will trigger the updated workflow. Confirm the new umbrella works:

```bash
# Latest run on main
gh run list --branch main --limit 1

# Inspect the jobs of that run -- there should be a `ci` job alongside changes/lint/test/build
gh run view <run-id> --json jobs --jq '.jobs[].name'

# Confirm branch protection sees `ci` as the satisfied required check
gh api repos/hudsor01/ink37-tattoos/branches/main/protection/required_status_checks --jq '.checks'
```

If `gh run view` shows `ci` and it's `success`, branch protection's required check is genuinely met for the first time. The `Bypassed rule violations for refs/heads/main` warnings should stop appearing on subsequent pushes.

## Why this didn't surface earlier

Every prior merge to `main` went through a PR (PRs #12, #13, #14). The PR UI blocks the "merge" button until required checks pass, but it surfaces required checks by name — and since `ci` was never reported by any job, the PR UI showed it as "Expected — Waiting for status" indefinitely. The PRs were merged anyway because:

1. `enforce_admins: false` lets admins click the merge button despite missing checks (the `Bypassed rule violations` line in the push response is GitHub logging that bypass).
2. The actual workflow `lint`/`test`/`build` jobs all passed each time, so it *looked* like CI was green even though the branch protection rule was never actually satisfied.

The umbrella `ci` job + `enforce_admins: true` combination closes this loop: the required check exists for real, and admins can no longer bypass it.
