# tomhilder.github.io

Personal academic website for Tom Hilder.

## Development

```bash
# Install Hugo (macOS)
brew install hugo

# Local development server
hugo server
```

Preview at http://localhost:1313

## Deployment

Push to `main` branch. GitHub Actions builds and deploys to https://tomhilder.github.io automatically.

## Adding Content

Content templates are in `archetypes/`. To add new content:

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

## Built With

- [Hugo](https://gohugo.io/) - Static site generator
- [PaperMod](https://github.com/adityatelange/hugo-PaperMod) - Theme
- Template from [pascal michaillat/hugo-website](https://github.com/pmichaillat/hugo-website)
