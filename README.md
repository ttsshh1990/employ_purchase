# Employee Purchase Site

Static site ready for GitHub Pages.

## Deploy

1. Create a new GitHub repository.
2. Upload this folder's contents to the repository root.
3. Push to the `main` branch.
4. In GitHub, open `Settings -> Pages`.
5. Under `Build and deployment`, set `Source` to `GitHub Actions`.
6. Wait for the `Deploy GitHub Pages` workflow to finish.

Your site will then be available at:

- `https://<your-github-username>.github.io/<repo-name>/`

## Notes

- This site is fully static, so GitHub Pages is a good fit.
- `.nojekyll` is included so files are served as-is.
- The workflow deploys the whole repository root, including `assets/`.
