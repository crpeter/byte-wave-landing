# ByteWave Site Setup Guide
## GitHub Pages + GoDaddy DNS (takes ~20 minutes)

---

## STEP 1: Create a GitHub Account (skip if you have one)

1. Go to **github.com** → click **Sign Up**
2. Use your LLC email if you have one
3. Free plan is all you need

---

## STEP 2: Create a Repository

1. Click the **+** button (top right) → **New repository**
2. Repository name: **bytewaveai.com** (or whatever you prefer)
3. Set it to **Public** (required for free GitHub Pages)
4. Check **"Add a README file"**
5. Click **Create repository**

---

## STEP 3: Upload the Site Files

You have two options:

### Option A: Upload via GitHub.com (easiest, no terminal needed)

1. In your new repo, click **"Add file"** → **"Upload files"**
2. Drag the entire contents of the **bytewave-site** folder I gave you:
   ```
   index.html          ← landing page (homepage)
   CNAME               ← tells GitHub your domain
   blog/
     index.html         ← blog listing page
     free-capcut-alternative-2026.html
     best-free-video-editor-no-watermark.html
     capcut-privacy-video-upload.html
     custom-video-filters-ai-tutorial.html
     video-editing-app-comparison-2026.html
   ```
3. Click **"Commit changes"**

### Option B: Git command line (if you're comfortable with terminal)

```bash
cd bytewave-site
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bytewaveai.com.git
git push -u origin main
```

---

## STEP 4: Enable GitHub Pages

1. In your repo, go to **Settings** (tab at the top)
2. Scroll down to **Pages** in the left sidebar
3. Under **Source**, select:
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**
5. You should see: "Your site is live at https://YOUR_USERNAME.github.io/bytewaveai.com/"

---

## STEP 5: Connect Your GoDaddy Domain

### 5A: Add your domain in GitHub

1. Still in **Settings → Pages**
2. Under **Custom domain**, type: **bytewaveai.com**
3. Click **Save**
4. Check **"Enforce HTTPS"** (may take a few minutes to appear)

### 5B: Set up DNS in GoDaddy

1. Log in to **GoDaddy** → go to **My Products** → find **bytewaveai.com**
2. Click **DNS** or **Manage DNS**
3. **Delete** any existing A records pointing to GoDaddy's parking page
4. **Add these 4 A records** (these are GitHub's IP addresses):

| Type | Name | Value             | TTL    |
|------|------|-------------------|--------|
| A    | @    | 185.199.108.153   | 1 Hour |
| A    | @    | 185.199.109.153   | 1 Hour |
| A    | @    | 185.199.110.153   | 1 Hour |
| A    | @    | 185.199.111.153   | 1 Hour |

5. **Add this CNAME record** (for www):

| Type  | Name | Value                                      | TTL    |
|-------|------|--------------------------------------------|--------|
| CNAME | www  | YOUR_USERNAME.github.io                     | 1 Hour |

   Replace YOUR_USERNAME with your actual GitHub username.

6. Click **Save**

---

## STEP 6: Set Up Your Other Domains (Redirects)

For **bytewaveai.app** and **bytewavepro.com**, you want them to redirect to bytewaveai.com (not host a separate site).

### In GoDaddy for each extra domain:

1. Go to **My Products** → find the domain → **Manage**
2. Click **Forwarding** (under the domain settings)
3. Set up forwarding:
   - Forward to: **https://bytewaveai.com**
   - Forward type: **Permanent (301)**
   - Forward settings: **Forward only**
4. Save

This means anyone typing bytewaveai.app or bytewavepro.com lands on your main site, and search engines treat bytewaveai.com as the real one.

---

## STEP 7: Wait & Verify

- **DNS propagation** takes 10 minutes to 48 hours (usually under 1 hour)
- **HTTPS certificate** from GitHub takes up to 24 hours (usually ~15 minutes)
- Test by visiting **https://bytewaveai.com** in your browser
- Test the blog at **https://bytewaveai.com/blog/**

### Troubleshooting

**"Site not found"** → DNS hasn't propagated yet. Wait 30 minutes and try again.

**"Not secure" warning** → HTTPS certificate hasn't been issued yet. Go to GitHub Settings → Pages and make sure "Enforce HTTPS" is checked. Wait 15 minutes.

**Blog pages 404** → Make sure the blog/ folder was uploaded correctly with all HTML files inside it.

**Wrong site showing** → Make sure you deleted GoDaddy's default A records before adding GitHub's.

---

## You're Done!

Your site structure is:

```
bytewaveai.com                              → Landing page
bytewaveai.com/blog/                        → Blog index
bytewaveai.com/blog/free-capcut-alternative-2026.html
bytewaveai.com/blog/best-free-video-editor-no-watermark.html
bytewaveai.com/blog/capcut-privacy-video-upload.html
bytewaveai.com/blog/custom-video-filters-ai-tutorial.html
bytewaveai.com/blog/video-editing-app-comparison-2026.html
bytewaveai.app                              → Redirects to bytewaveai.com
bytewavepro.com                             → Redirects to bytewaveai.com
```

**Total cost: $0/month** (GitHub Pages is free, domains are your only cost)

---

## Future Updates

To update the site, just edit files in your GitHub repo:
1. Go to the file on github.com
2. Click the pencil icon (edit)
3. Make changes
4. Click "Commit changes"
5. Site updates automatically in ~30 seconds
