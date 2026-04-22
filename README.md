# Krishi Draft

## Git setup troubleshooting

If you run `git remote -v` and see:

```bash
fatal: not a git repository (or any of the parent directories): .git
```

you are currently in a folder that does **not** have Git metadata.

### Why this happens

Most commonly, the project was downloaded as a ZIP (`...-main`) instead of cloned with Git. ZIP downloads do not include the hidden `.git` folder.

### Fix options

1. **Recommended: clone the repository again**

   ```bash
   git clone <your-repo-url>
   cd <repo-folder>
   git remote -v
   ```

2. **If this folder should already be a repo:**

   ```bash
   ls -la
   ```

   Confirm a `.git` directory exists at the project root.

3. **If you only have ZIP content and need to reconnect it to Git:**

   ```bash
   git init
   git remote add origin <your-repo-url>
   git fetch origin
   git checkout -b <branch-name> origin/<branch-name>
   ```

   > Note: this reconstructs Git history linkages, but cloning fresh is cleaner and less error-prone.

### Quick verification checklist

From your project root, all of these should work:

```bash
git rev-parse --is-inside-work-tree
git branch --show-current
git remote -v
git status
```

## Keep all post-noon work intact (safe workflow)

Before any further merge/rebase/conflict resolution, create a safety snapshot so nothing from today is lost:

```bash
# 1) Confirm you are in a real repo root
pwd
git rev-parse --is-inside-work-tree

# 2) Save everything currently on your branch
git add -A
git commit -m "WIP snapshot before merge" || true

# 3) Create a permanent backup pointer
git tag backup-noon-$(date +%Y%m%d-%H%M)

# 4) Verify all expected CMS/admin files still exist
ls frontend/src/pages/admin/PageEditorPage.js frontend/src/pages/admin/PagesListPage.js
ls frontend/src/hooks/useCMSPage.js frontend/src/pages/CMSPage.js

# 5) See exactly what changed since noon
git log --since="today 12:00" --oneline --decorate
git diff --name-status HEAD~1..HEAD
```

If you are working from a ZIP folder (`...-main`), clone the repository first so Git history and branches are preserved.
