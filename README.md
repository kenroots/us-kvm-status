# KVM Weekly Bug Report

A GitHub Pages site that displays the IBM US KVM team's open Bugzilla bugs as a weekly status report.

**Live site:** https://cheruiyo.github.io/us-kvm-status/

## Features

- Summary cards by priority (P2, P3, P5)
- Filterable by priority, component, and assignee
- Full-text search across bug summaries
- Sortable columns
- Direct links to each bug in Bugzilla

## Updating

The bug data is embedded in `index.html` in the `BUGS` array. To refresh it weekly, update that array with the latest output from the Bugzilla scraper and redeploy.

## Deployment

This site is deployed via GitHub Pages from the `main` branch root.

```bash
git add index.html
git commit -m "chore: weekly bug report update $(date +%Y-%m-%d)"
git push origin main
```
