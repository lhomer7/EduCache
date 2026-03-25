# QR Code Hunt Website

This is a static website, which means it can be hosted for free on services like GitHub Pages or Netlify and will work on phones, tablets, and computers.

## Edit the hunt

Change your questions, answers, and clues in:

- `hunt-data.js`

Each item has:

- `number`: which page it belongs to
- `question`: the question shown on the page
- `answers`: accepted answers for that question
- `clueTitle`: the heading shown when the answer is correct
- `clue`: the clue text for the next QR code location

## Best publishing option: GitHub Pages

GitHub Pages is a good fit for this project because the site is plain HTML, CSS, and JavaScript.

### 1. Create a GitHub repository

Create a new public repository on GitHub. A simple name like `qr-code-hunt` works well.

### 2. Upload these files

Upload everything in this folder to your repository:

- `index.html`
- `q1.html` to `q10.html`
- `hunt-data.js`
- `script.js`
- `styles.css`
- `.nojekyll`

### 3. Turn on GitHub Pages

In your repository on GitHub:

1. Open `Settings`
2. Open `Pages`
3. Under `Build and deployment`, choose `Deploy from a branch`
4. Choose your main branch
5. Choose the `/ (root)` folder
6. Click `Save`

### 4. Find your public site URL

After GitHub Pages finishes publishing, your site URL will usually be:

`https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`

Your QR code page links will then be:

- `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/q1.html`
- `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/q2.html`
- `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/q3.html`
- ...
- `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/q10.html`

Use those exact page URLs when generating your QR codes.

## Fastest no-Git fallback: Netlify

If you want the quickest possible launch, you can drag this whole folder into Netlify Drop. Netlify will publish it as a static site and give you a public URL.

For a hunt where you may need to update questions later, GitHub Pages is usually easier to manage long-term.

## Important note about phones

This website already uses a mobile-friendly layout. Once it is hosted on a public HTTPS URL, anyone who scans a QR code with internet access should be able to open the page on their phone.
