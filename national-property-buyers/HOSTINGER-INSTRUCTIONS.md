# National Property Buyers — How to Update Your Site on Hostinger

This folder contains your full website as **two self-contained files**. All the
styling (CSS) and scripts are embedded inside each file — there are no separate
CSS or JS files to manage. Just upload these two files.

| File | What it is |
|------|------------|
| `index.html` | Your main homepage (hero, how it works, why us, compare, reviews, contact form) |
| `privacy-policy.html` | The new Privacy Policy page (adapted from yocapitalcash.com for National Property Buyers) |

The homepage links to the privacy policy in **two places**: the form fine print
and the footer. The privacy policy links back to the homepage.

---

## Option A — Upload with Hostinger File Manager (easiest)

1. Log in to **Hostinger** → **hPanel**.
2. Go to **Websites** → select **nationalpropertybuyers.net** → **File Manager**
   (or **Files → File Manager**).
3. Open the **`public_html`** folder (this is where your live site lives).
4. *(Optional but smart)* Back up your current files first: select the old
   `index.html`, click **Download**, and keep a copy on your computer.
5. **Upload** both files from this folder:
   - `index.html`
   - `privacy-policy.html`

   When it asks to overwrite the existing `index.html`, choose **Yes / Overwrite**.
6. Visit **https://nationalpropertybuyers.net** — done. The privacy policy is at
   **https://nationalpropertybuyers.net/privacy-policy.html**.

> Tip: If you don't want to overwrite yet, upload `index.html` as
> `index-new.html` first, preview it at
> `nationalpropertybuyers.net/index-new.html`, and rename it to `index.html`
> once you're happy.

---

## Option B — Copy & paste the code directly

If you'd rather paste the code instead of uploading files:

1. In **File Manager**, navigate to `public_html`.
2. Right-click `index.html` → **Edit**. Select all (Ctrl+A), delete, then paste
   the entire contents of this folder's `index.html`. **Save**.
3. Create a new file named exactly `privacy-policy.html` (right-click → **New
   File**). Open it, paste the contents of this folder's `privacy-policy.html`,
   and **Save**.

That's it — both pages are live.

---

## The contact form

The "Get My Offer" forms currently open the visitor's email app pre-filled with
their details, sent to **offers@nationalpropertybuyers.net**. This works on any
static host with zero setup.

**Want submissions to arrive automatically without the visitor's email app?**
Use a free form service like [Formspree](https://formspree.io):

1. Create a Formspree form and copy your endpoint (looks like
   `https://formspree.io/f/abcdwxyz`).
2. In `index.html`, find the two `<form onsubmit="return sendOffer(...)">` tags
   and replace each with:
   ```html
   <form action="https://formspree.io/f/abcdwxyz" method="POST">
   ```
   (remove the `onsubmit="..."` part). The fields are already named correctly.

---

## What changed in this version

- **Added a full Privacy Policy page** (`privacy-policy.html`), adapted from the
  YO Capital Cash policy with National Property Buyers' name, contact details,
  and cash-home-buyer wording — including the SMS opt-out (STOP/HELP) language
  and the "mobile information will not be shared" clause.
- **Linked the privacy policy** from the homepage footer and from both contact
  forms.
- Rebuilt the homepage as a single clean, mobile-friendly, copy-paste file
  matching your existing content (phone, email, all 50 states, the 4-step
  process, benefits, comparison table, and reviews).

Contact info used throughout: **(614) 382-6380** ·
**offers@nationalpropertybuyers.net**
