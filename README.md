# Open Sky

A personal photography site: static HTML/CSS/JS, Supabase for photos and login, Vercel for hosting.

## Set up

**1. Supabase**
1. Create a project at supabase.com.
2. SQL Editor > New query > paste `supabase/schema.sql` > Run. This creates the `photos` table, the public `photos` storage bucket and the access rules.
3. Authentication > Users > Add user. Create your own email and password.
4. Authentication > Sign In / Providers > turn off "Allow new users to sign up". Only you can then publish.
5. Project Settings > API. Copy the Project URL and the anon key.

**2. Configure**

Open `js/config.js` and paste in the URL and anon key. Change `SITE.name`, `SITE.tagline` and `SITE.intro` to your own, and add your contact email to `SITE.email`. The email then appears in the footer and on the privacy and terms pages.

**3. Try it locally**

```
npx serve .
```

Open the address it prints. Use a server rather than double-clicking the files, because the pages use absolute paths and ES modules.

**4. Publish**
1. Push this folder to a new GitHub repository.
2. In Vercel: Add New > Project > import the repository. Framework preset "Other", no build command, no output directory. Deploy.
3. Visit `/admin` on your site, sign in and publish your first photograph.

## How it works

| Page | Address |
| --- | --- |
| Home | `/` |
| Gallery with category filters and full-screen viewer | `/gallery` |
| One photograph | `/photo?id=...` |
| About (edit the text in `about.html`) | `/about` |
| Privacy policy | `/privacy` |
| Terms of use | `/terms` |
| Private upload page | `/admin` |

On `/admin` the browser resizes each photo to a 2560px version and a 900px thumbnail, uploads both to Supabase Storage, and saves the title, description, category, date, location and public URLs to the database. The photo then appears in the gallery with no code changes. Change the sizes in `js/config.js`.

**Install `/admin` as a phone app.** Open `/admin` in Chrome on your phone, then use the menu > Install app (or Add to home screen). It opens full-screen with its own icon.

**Views.** Run `supabase/views.sql` once in the Supabase SQL Editor. The site then counts views of the homepage, the gallery and each photograph (a total per page per day, nothing personal), and the Views panel on `/admin` shows the last 7 and 30 days and your most viewed photographs.

`/admin` is a public address but does nothing without your login: the database rules only allow a signed-in user to add, change or delete.

The free Supabase plan includes 1 GB of storage, which is roughly a thousand photos at these sizes.
