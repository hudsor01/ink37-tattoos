# Branch protection — recommended setup for `main`

This file documents the recommended GitHub-side configuration for the
`main` branch. Some of these settings can't be set from a PR's code
changes — they live in GitHub's own database and require API or UI
access.

The recommendation here is to use **Repository Rulesets** rather than
classic branch protection rules. Rulesets are GitHub's modern path
forward (see Research below) and avoid a hard footgun specific to
solo-maintainer repositories.

## The solo-maintainer footgun

GitHub does NOT allow a pull-request author to approve their own PR
under any configuration:

> Pull request authors can't approve their own pull request — even
> when they are repository owners/admins.
> — [Graphite — PR approval permissions and rules](https://graphite.com/guides/pull-request-approval-permissions-rules-github)

> Self-approval remains impossible. GitHub will not count owners as
> automatic reviewers or allow them to approve their own PRs under
> any configuration.
> — [GitHub Community Discussion #150545](https://github.com/orgs/community/discussions/150545)

For a single-maintainer repository this means: if you set
`required_approving_review_count: 1` (or higher), you lock yourself
out of merging your own PRs forever. There is no second reviewer.

The clean solution is `required_approving_review_count: 0` — the PR
flow is still mandatory (so direct-to-`main` pushes are blocked, CI
must pass, conversation threads must resolve), but no approval is
required for merge.

## Why rulesets, not classic branch protection

> Multiple rulesets can apply at the same time, so you can be
> confident that every rule targeting a branch in your repository
> will be evaluated. In contrast, only a single branch protection
> rule can apply at a time.
> — [GitHub Docs: About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

Rulesets:

- Stack (multiple can apply simultaneously)
- Cover more rule types (commit metadata, branch naming, file paths)
- Apply to tags and wildcards, not just single branches
- Have a status (active / disabled / evaluate) so you can experiment
- Don't need an `enforce_admins` flag — the bypass list is the
  explicit allowlist, and an empty list means nobody bypasses

Classic branch protection still works but is the legacy path. You
shouldn't need both. Apply the ruleset, then delete the classic rule
to avoid two-rules-stacking confusion.

## Apply the ruleset

Run this once. Creates the ruleset on `main` with PR-required +
CI-required + force-push-blocked + deletion-blocked + merge-commits-
only, with no bypass actors:

```bash
gh api -X POST repos/hudsor01/ink37-tattoos/rulesets \
  --input - <<'JSON'
{
  "name": "main protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["merge"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "ci", "integration_id": 15368 }
        ]
      }
    }
  ],
  "bypass_actors": []
}
JSON
```

Then delete the legacy branch protection so two rules don't stack:

```bash
gh api -X DELETE repos/hudsor01/ink37-tattoos/branches/main/protection
```

Then enable auto-merge on the repo (one-time, required for the
dependabot-auto-merge workflow to function):

```bash
gh api -X PATCH repos/hudsor01/ink37-tattoos -f allow_auto_merge=true
```

## What each rule enforces

| Rule                                  | Effect                                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `deletion`                            | Branch can't be deleted.                                                                                            |
| `non_fast_forward`                    | Force-pushes blocked.                                                                                               |
| `pull_request`                        | All changes must come through a PR (no direct-push to `main`, even by you).                                         |
| `required_approving_review_count: 0`  | No approval required for merge — solves the self-approval impossibility.                                            |
| `dismiss_stale_reviews_on_push: true` | If a future contributor adds reviews, they're dismissed when a new push lands.                                      |
| `require_code_owner_review: false`    | CODEOWNERS still auto-assigns reviewers (visibility/routing) but doesn't block — required because you can't be your own code-owner reviewer. |
| `required_review_thread_resolution`   | Conversation threads must resolve before merge — no "merged with unresolved comments."                              |
| `allowed_merge_methods: [merge]`      | Only true merge commits allowed — squash and rebase are explicitly disabled per maintainer preference. Preserves per-PR commit history. |
| `required_status_checks` (`ci`)       | The umbrella `ci` job from `.github/workflows/ci.yml` must pass before merge.                                       |
| `strict_required_status_checks_policy`| Branch must be up-to-date with `main` before merge.                                                                  |
| `bypass_actors: []` + `enforcement: active` | Nobody bypasses, including you. The lack of an `enforce_admins` toggle is intentional — rulesets enforce on everyone except listed bypass actors. |

## Available bypass actors (for future reference)

The `bypass_actors` array can include the following per the
[GitHub REST API: Repository rules](https://docs.github.com/en/rest/repos/rules?apiVersion=2022-11-28):

- `Integration` — a GitHub App, by `actor_id`
- `OrganizationAdmin` — N/A for personal repos
- `RepositoryRole` — by numeric role ID (built-in or custom)
- `Team` — by team `actor_id`
- `DeployKey`

`bypass_mode` can be `always` (bypass on every action), `pull_request`
(must still open a PR but can self-merge), or `exempt`.

**Individual users cannot be bypass actors directly.** This is by
design — bypass is granted to roles or apps, not specific people.

## Verifying the new `ci` umbrella check

After PR #15 merges, the next push or PR will trigger the updated
workflow. Confirm the new umbrella works:

```bash
# Latest run on main
gh run list --branch main --limit 1

# Inspect the jobs of that run -- you should see changes/lint/typecheck/test/build/ci
gh run view <run-id> --json jobs --jq '.jobs[].name'

# Confirm the active ruleset's required check
gh api repos/hudsor01/ink37-tattoos/rulesets --jq '.[] | select(.name == "main protection") | .id' \
  | xargs -I {} gh api repos/hudsor01/ink37-tattoos/rulesets/{} --jq '.rules[] | select(.type == "required_status_checks")'
```

If `gh run view` shows `ci` and it's `success`, branch protection's
required check is genuinely met.

## Why this didn't surface earlier

Every prior merge to `main` went through a PR (PRs #12, #13, #14). The
PR UI blocks the "merge" button until required checks pass, but it
surfaces required checks by name — and since `ci` was never reported
by any job, the PR UI showed it as "Expected — Waiting for status"
indefinitely. The PRs were merged anyway because:

1. `enforce_admins: false` lets admins click the merge button despite
   missing checks. The `Bypassed rule violations` line in the push
   response is GitHub logging that bypass.
2. The actual workflow `lint`/`test`/`build` jobs all passed each
   time, so it *looked* like CI was green even though the branch
   protection rule was never actually satisfied.

The umbrella `ci` job + the rulesets-based config above closes this
loop: the required check exists for real, and there's no bypass list
for the ruleset, so even an admin direct-push would fail.

## Dependabot auto-merge

The `.github/workflows/dependabot-auto-merge.yml` workflow auto-enables
merge on dependabot PRs once CI passes, gated by the bump's
update-type and dep-type:

| Bump shape                            | Action                  |
| ------------------------------------- | ----------------------- |
| Patch (any dep type, any ecosystem)   | Auto-merge              |
| Dev-dep minor                         | Auto-merge              |
| github-actions minor                  | Auto-merge              |
| Production minor                      | Human review            |
| Major (any ecosystem, any dep type)   | Human review            |

This pairs with `.github/dependabot.yml`'s grouping strategy
(development-dependencies / production-patches / production-minor /
actions) to converge on ~1-3 review-worthy PRs per week instead of
the 10+ individual bumps the original config generated.

The auto-merge mechanism uses `gh pr merge --auto --merge` which
queues the merge to fire when all branch-protection requirements
are satisfied (the `ci` umbrella check + conversation resolution +
0 approvals). It respects the same ruleset as a manual merge — no
bypass involved.

## Research / citations

- [GitHub Docs — About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub Docs — Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [GitHub Docs — Creating rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [GitHub REST API — Repository rules](https://docs.github.com/en/rest/repos/rules?apiVersion=2022-11-28)
- [GitHub Community Discussion #150545 — Repository owner merging own PRs](https://github.com/orgs/community/discussions/150545)
- [Graphite — PR approval permissions and rules](https://graphite.com/guides/pull-request-approval-permissions-rules-github)
- [DEV Community — Branch Protection Rules vs Rulesets](https://dev.to/piyushgaikwaad/branch-protection-rules-vs-rulesets-the-right-way-to-protect-your-git-repos-305m)
