# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal academic website for **Tom Hilder**, PhD Candidate at the School of Physics & Astronomy, Monash University. Research focus: the ionised interstellar medium using computational statistics, particularly scalable Gaussian Process methods.

Built with Hugo + PaperMod theme, deployed to GitHub Pages via GitHub Actions.

## Commands

```bash
# Local development server (live reload at http://localhost:1313)
hugo server

# Build site for production
hugo --minify
```

Hugo must be installed (`brew install hugo` on macOS). The project uses Hugo v0.147.2.

## Architecture

**Content sections** (defined in `config.yml` as `MainSections`):

- `content/research/` - Research papers and publications
- `content/software/` - Software projects and tools
- `content/talks/` - Conference talks and presentations
- `content/blog/` - Blog posts

**Key configuration:**

- `config.yml` - Site metadata, menu structure, theme parameters, social links
- `layouts/` - Custom Hugo templates overriding PaperMod theme defaults
- `static/` - Static assets (favicon, profile photo as `picture.jpeg`, CV as `cv.pdf`)

**Adding content:**

Create a new subdirectory with `index.md` for each item. Templates are in `archetypes/`:

```bash
# Research paper
mkdir -p content/research/my-paper
cp archetypes/research.md content/research/my-paper/index.md

# Software project
mkdir -p content/software/my-package
cp archetypes/software.md content/software/my-package/index.md

# Talk
mkdir -p content/talks/my-talk
cp archetypes/talk.md content/talks/my-talk/index.md

# Blog post
mkdir -p content/blog/my-post
cp archetypes/blog.md content/blog/my-post/index.md
```

Place associated files (PDFs, images) in the same directory as `index.md`.

## Site Owner

- **Name:** Tom Hilder
- **Email:** thomas.hilder@monash.edu
- **GitHub:** [tomhilder](https://github.com/tomhilder)
- **Google Scholar:** [Profile](https://scholar.google.com/citations?user=q0Ol5jsAAAAJ&hl=en)
- **ORCID:** [0000-0001-7641-5235](https://orcid.org/0000-0001-7641-5235)
- **Bluesky:** [@tom-hilder.bsky.social](https://bsky.app/profile/tom-hilder.bsky.social)

**Deployment:**

- Push to `main` branch triggers `.github/workflows/hugo.yml`
- GitHub Actions builds with Hugo and deploys to GitHub Pages
