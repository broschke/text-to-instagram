# Text to Instagram

Text your Twilio number and the message is posted to Instagram as white text on a navy background (1080x1350 JPEG). Only phone numbers you list can post.

## 1. Prepare Instagram
Your Instagram account must be a professional account (Business or Creator). You can switch in the Instagram app under account settings.

## 2. Get an Instagram access token
1. At developers.facebook.com, create an app and add the Instagram API ("API setup with Instagram login").
2. Add your Instagram account in that setup screen and generate an access token for it. It needs the `instagram_business_content_publish` permission.
3. Copy the token. The app can stay in development mode since it only posts to your own account.

The code refreshes the token weekly, so it keeps working as long as you post at least once every ~60 days. If it ever expires, generate a new one and update `IG_ACCESS_TOKEN`.

## 3. Deploy to Netlify
Push this folder to a GitHub repo, then in Netlify: Add new site > Import an existing project > pick the repo > Deploy.

## 4. Set environment variables in Netlify
Site configuration > Environment variables, then redeploy.

| Variable | Required | What it does |
|---|---|---|
| `IG_ACCESS_TOKEN` | Yes | Token from step 2. |
| `ALLOWED_NUMBERS` | Yes | Numbers allowed to post, comma-separated, e.g. `+13015551234,+12405559876`. If empty, nobody can post. |
| `TWILIO_AUTH_TOKEN` | Strongly recommended | From the Twilio console. Rejects requests that didn't come from Twilio, so nobody can fake an allowed number. |
| `CAPTION` | No | Caption added to every post (e.g. hashtags). Default: none. |
| `BG_COLOR` / `TEXT_COLOR` | No | Defaults `#14213D` (navy) and `#FFFFFF`. |
| `IG_USER_ID` | No | Looked up automatically if not set. |
| `WEBHOOK_URL` | No | Only if Twilio signature checks fail on a custom domain: the exact URL entered in Twilio. |

## 5. Connect Twilio
In the Twilio console, open your number's settings. Under Messaging, set "A message comes in" to Webhook, HTTP POST:
`https://YOUR-SITE.netlify.app/api/sms`

## Notes
- Texts are cut off at 500 characters. Long texts shrink to fit.
- Emoji won't render correctly; only the bundled font (Poppins, SIL Open Font License) is available on the server.
- Instagram limits how many posts an app can publish per day (currently 50–100 per 24 hours).
- Nothing is texted back to you. If a post doesn't appear, check the `sms` function log in Netlify for the error.
