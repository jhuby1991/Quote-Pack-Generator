# Document Compiler

Chrome extension that reads an open Odoo quotation from staff.rakocontrols.com and builds **Sales Pack** or **Tech Pack** PDFs from Google Drive documents.

## What it does

1. **Load quotation** – With a quote open at staff.rakocontrols.com, click “Load current quotation” to scrape company name, RQ reference, date, and product lines (name, qty, cost, total).
2. **Generate sales pack** – Uses the template Google Doc in the configured Drive folder, fills `{{projectName}}` and `{{rakoQuote}}`, then appends product documents (matched by product code, e.g. `[RAK8-MB]` → `rak8-mb`) and downloads one PDF.
3. **Generate tech pack** – Same idea but uses the **datasheets** subfolder and its own template doc.

Drive folder ID used: `1hx5Ui1fpNLD_VknHC2C3MC-tPxG3AEVe`.

---

## Google OAuth 2.0 setup (so others can use it)

The extension uses **Chrome identity** with Google OAuth. Each user signs in with their own Google account; no keys are stored in the extension.

### 1. Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. Enable these APIs:
   - **Google Drive API**
   - **Google Docs API**

### 2. OAuth consent screen

You’re in the right place. Use the **tabs/sections** on the consent screen as follows.

#### Overview
- Just a summary. You can ignore it until the rest is done.

#### Branding
1. Click **Branding** in the left (or top) menu on the consent screen.
2. Fill in:
   - **App name**: e.g. `Document Compiler`
   - **User support email**: your work email (required)
   - **App logo**: optional
   - **Application home page**, **Privacy policy**, **Terms of service**: optional for testing; you can leave blank or use placeholders if the form allows it.
3. Click **Save**.

#### Audience
1. Click **Audience**.
2. Choose **External** so anyone with a Google account can use the app (or only people you add as test users until you publish).
3. If you see **Publishing status**, leave it as **Testing** for now. In Testing mode only people you add can sign in.
4. If there’s an **Add users** or **Test users** section, add your email (and any colleagues who will try the extension). Save.

#### Data access (scopes)
1. Click **Data access** (sometimes under “Scopes” or “App registration”).
2. Find **Add or remove scopes** / **Edit app registration** / **Scopes** and add these three:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/documents`
3. If you pick from a list of APIs instead, enable **Google Drive API** and **Google Docs API** and select the scopes that match the URLs above. Save.

#### Verification centre / Settings
- Leave as default for now. You only need verification if you take the app out of Testing and publish to everyone.

---

### 3. Create the Chrome extension OAuth client (Credentials)

You need to create an **OAuth 2.0 client** of type **Chrome app** and set its **Application ID** to your extension ID.

- **Option A:** In the **left-hand menu**, open **APIs & Services** → **Credentials**, then **+ Create credentials** → **OAuth client ID**.
- **Option B:** If the consent screen has a **Clients** section, open it and look for **Create client** or **Add OAuth 2.0 Client ID**; it may take you to the same flow.

Then:

1. Click **+ Create credentials** → **OAuth client ID** (or **Create client** if you came from the Clients section).
2. If it says “Configure consent screen”, you’ve already done that in step 2; go back to Credentials and create the client again.
3. **Application type**: choose **Chrome app** (or **Chrome extension** if that’s the only option).
4. **Name**: e.g. `Document Compiler Extension`.
5. **Application ID**: must be your **extension ID** from Chrome.
   - In Chrome open `chrome://extensions`, turn on **Developer mode**, **Load unpacked** → select the `packgenerator` folder.
   - Copy the **ID** under the extension (e.g. `abcdefghijklmnopqrstuvwxyz123456`).
   - Paste that exact ID into **Application ID** in Google Cloud.
6. Click **Create**, then copy the **Client ID** (e.g. `123456789-abc...xyz.apps.googleusercontent.com`). You’ll put it in `manifest.json` in step 4.

### 4. Put the Client ID in the extension

1. Open `manifest.json`.
2. Replace `YOUR_CLIENT_ID.apps.googleusercontent.com` in the `oauth2.client_id` field with your real Client ID.
3. Reload the extension in `chrome://extensions`.

### 5. Optional: restrict to your organisation

If only your org should use the app:

- In **OAuth consent screen**, set **Publishing status** to **Testing** and add test users, **or**
- Publish the app and then in **Configure** add your Google Workspace domain so only that domain can approve the app.

No service account or embedded keys are needed; each user’s token is obtained via Chrome’s `identity` API when they use “Generate sales pack” or “Generate tech pack”.

---

## Loading the extension

1. Open Chrome → `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `packgenerator` folder (the one that contains `manifest.json`).
4. Complete the OAuth setup above and set `oauth2.client_id` in `manifest.json`, then reload the extension.

---

## Drive folder layout

- **Sales pack folder** (ID `1hx5Ui1fpNLD_VknHC2C3MC-tPxG3AEVe`):
  - One **template** Google Doc (name contains “template”) with placeholders `{{projectName}}` and `{{rakoQuote}}`.
  - One Google Doc per product, named to match the product code (e.g. `rak8-mb` for `[RAK8-MB]`).

- **Tech pack**: same folder, with a subfolder named **datasheets**:
  - A **template** Google Doc (name contains “template”) with the same placeholders.
  - Product docs named to match product codes (e.g. `rak8-mb`).

Product names from the quote are normalized to lowercase with spaces as hyphens (e.g. `[RAK8-MB]` → `rak8-mb`) for matching.

---

## Permissions

- **identity** – Google sign-in.
- **activeTab** – Know which tab is active.
- **storage** – Store last loaded quote in the extension.
- **downloads** – Save the generated PDF.
- **host_permissions** – staff.rakocontrols.com (scrape quote), Google APIs (Drive/Docs).
