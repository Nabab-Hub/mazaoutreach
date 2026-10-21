# Agentic Client Outreach Platform: Implementation Plan

An AI agent that turns a CSV of leads into personalized emails, handles replies, and keeps the owner informed. Built for freelancing (websites, mobile apps, SaaS, backend APIs, chatbots, custom ML).

---

## 1. Goals

1. Import leads from CSV (clubs, creators, shops, clinics, any profession).
2. Generate a personalized email per lead, based on their niche and the services that fit them.
3. Send through multiple Gmail accounts with safe limits.
4. Read replies, classify them, and draft the right response.
5. **Approval-first**: nothing is auto-sent until the owner trusts the agent. Autonomy is unlocked gradually.
6. Notify the owner about interested leads (instant alert plus daily digest).
7. Web dashboard first; desktop and Android clients later (so the backend must be API-first).

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind | Same stack as the owner's other projects |
| Backend | Next.js API routes + Firebase Cloud Functions (scheduled jobs) | One language, easy to deploy |
| Database | Firestore | Realtime dashboard, simple scaling |
| Auth | Firebase Auth (owner login, Google) | Dashboard security |
| Email | Gmail API (OAuth2) per connected account | Send, read replies, thread tracking |
| AI | Provider-agnostic layer: Gemini, OpenAI, Grok | Switchable from settings |
| Alerts | Gmail (to owner) + Telegram bot | Instant hot-lead notification |
| Queue / jobs | Firestore `jobs` collection + Cloud Scheduler | No extra infra |
| Hosting | Vercel (web) + Firebase (functions) | Free tiers available |

Python alternative: FastAPI backend plus the same Firebase DB. The architecture below stays identical.

---

## 3. System Architecture

```
CSV Upload -> Validate/Dedupe -> Leads (Firestore)
                                   |
                         [Personalization Agent]
                                   |
                           Draft Queue (Approval)
                                   |
                  approve / edit / reject (Dashboard)
                                   |
                        [Sender: Gmail rotation]
                                   |
                         Outbox + Thread tracking
                                   |
                 [Reply Poller: Gmail API every 5 min]
                                   |
                       [Reply Classifier Agent]
          interested / question / not_interested / unsubscribe / other
                                   |
            [Reply Drafter] -> Approval Queue (or auto-send when allowed)
                                   |
              Lead status update -> Notifier (email, Telegram, digest)
```

---

## 4. Data Model (Firestore)

**`leads/{leadId}`**
- name, email, businessName, niche (club | creator | shop | clinic | other), city, website, notes, customFields
- status: `new | drafted | contacted | replied | interested | meeting | won | lost | unsubscribed`
- assignedGmailId, lastContactedAt, followUpCount, nextFollowUpAt
- batchId (which CSV import), createdAt

**`batches/{batchId}`**: filename, totalRows, imported, duplicates, invalid, createdAt

**`emailAccounts/{accountId}`**: gmailAddress, encryptedRefreshToken, dailyLimit, sentToday, status (`active | paused | error`), warmupLevel

**`drafts/{draftId}`**: leadId, type (`initial | followup | reply`), subject, body, aiProvider, model, status (`pending | approved | edited | rejected | sent`), editedBody, confidence, createdAt

**`messages/{messageId}`**: leadId, threadId, direction (`out | in`), subject, body, gmailMessageId, sentAt

**`replyAnalysis/{id}`**: messageId, classification, sentiment, intentSummary, suggestedAction, needsHuman (bool)

**`templates/{niche}`**: pitch angle, services to highlight, tone, example email, banned phrases

**`settings/global`**: aiRouting, sendWindow, autonomy rules, owner email, Telegram chat id, calendar link, signature

**`suppression/{email}`**: unsubscribed or do-not-contact list (checked before **every** send)

**`learningExamples/{id}`**: niche, type, originalDraft, finalApprovedText, wasEdited (used as few-shot examples)

---

## 5. Core Modules

### 5.1 CSV Import
- Required columns: `name, email`. Optional: `business, niche, city, website, notes`.
- Steps: parse (PapaParse) -> validate email format -> dedupe (against existing leads and suppression list) -> save with `status = new`.
- Show an import summary (imported, duplicates, invalid) with a downloadable error report.
- If `niche` is missing, the AI infers it from business name, website and notes.

### 5.2 Personalization Agent
Input: lead row + niche template + owner's service list.
Output: `{ subject, body }`.

Rules in the prompt:
- Short (90-150 words), human tone, one clear call to action (a 15-minute call).
- Mention 1-2 specific, relevant ideas for **that** business (not a generic list of services).
- No fake claims, no invented facts about the lead, no spammy words.
- Include the unsubscribe line.

Niche pitch angles (starting point, editable in dashboard):
| Niche | Angle |
|---|---|
| Club / community | Membership/registration website, event pages, payment collection, member app |
| Content creator | Personal brand website, course/membership platform, community app, automation tools |
| Shop / retail | Online store, inventory/billing software, WhatsApp/Instagram ordering chatbot |
| Clinic | Appointment booking system, patient reminders, simple records dashboard |
| Other business | AI chatbot for support, custom dashboard, workflow automation |

### 5.3 Gmail Sender (multi-account rotation)
- Connect each Gmail via OAuth2 (scopes: `gmail.send`, `gmail.readonly`, `gmail.modify`).
- Rotation: pick the active account with the lowest `sentToday / dailyLimit`.
- **Safe limits for cold outreach**: start at 20-30/day per account, increase slowly (warm-up). The hard Gmail limit is about 500/day, but cold emails at that volume risk getting the account flagged.
- Random delay of 60-180 seconds between sends, sending only inside the allowed time window (for example 10:00-17:00 in the lead's timezone).
- Keep one lead tied to one Gmail account for the whole thread, so replies and follow-ups come from the same address.
- Pause an account automatically on errors or bounce spikes.

### 5.4 Reply Poller and Classifier
- Cloud Scheduler runs every 5 minutes: fetch new messages per account, match by `threadId`.
- Classifier returns JSON:
  ```json
  {
    "classification": "interested | question | not_interested | unsubscribe | out_of_office | other",
    "sentiment": "positive | neutral | negative",
    "summary": "one line",
    "needsHuman": true,
    "suggestedAction": "send_reply | schedule_meeting | stop | wait"
  }
  ```
- Automatic handling:
  - `unsubscribe` -> add to suppression list, set status `unsubscribed`, send no further mail.
  - `not_interested` -> status `lost`, polite one-line acknowledgement (after approval).
  - `interested` -> status `interested`, **instant alert** to the owner, draft a reply with the booking link.
  - `question` -> draft an answer, flag `needsHuman` if it involves pricing, timeline, or technical commitments.
  - `out_of_office` -> reschedule follow-up.

### 5.5 Reply Drafter
- Uses the full thread plus the lead info plus the owner's service knowledge.
- Never quotes final prices or deadlines. It proposes a meeting instead ("deal discussions happen on a call").
- Includes the Calendly/Google Calendar link when the lead is interested.

### 5.6 Approval Queue (dashboard)
- Cards showing the lead, thread context, the AI draft, and the classification.
- Actions: **Approve & Send**, **Edit then Send**, **Regenerate** (with an instruction), **Reject**.
- Bulk approve for initial emails.
- Every decision is stored in `learningExamples`.

### 5.7 Autonomy Ladder (approval first, auto later)
| Level | Behavior |
|---|---|
| L0 (default) | Everything needs approval |
| L1 | Auto-send acknowledgements for `not_interested`, `unsubscribe`, `out_of_office` |
| L2 | Auto-send initial emails and follow-ups for niches with a good approval history |
| L3 | Auto-reply to simple `question` / `interested` replies when confidence is high and no pricing/commitment is involved |

- Suggest an upgrade when a category has, for example, 20+ drafts approved with no edits. The owner must accept it manually in settings.
- Anything with `needsHuman = true` is **never** auto-sent, regardless of level.

### 5.8 Learning from the Owner
- Store original vs. edited text for each draft.
- Inject the 3-5 most recent approved examples for the same niche and type into the prompt as few-shot examples.
- Track the "edit rate" per niche to show improvement over time.

### 5.9 Follow-ups
- Day 3 and day 7 after no reply (configurable), max 2 follow-ups.
- Each follow-up is a new angle, not a repeat. Goes through the same approval flow.
- Stops immediately on any reply or unsubscribe.

### 5.10 Notifications and Reports
- **Instant alert** (email to the owner plus Telegram) when a lead becomes `interested` or `needsHuman`.
- **Daily digest** (for example 8 PM): sent, replies, interested leads (with name, business, one-line summary), pending approvals, bounces.
- **Weekly report**: reply rate and interest rate per niche, best-performing subject lines, account health.

### 5.11 AI Provider Router
One interface, three adapters (Gemini, OpenAI, Grok via the OpenAI-compatible xAI endpoint).

```ts
interface AIProvider {
  generate(opts: { system: string; prompt: string; json?: boolean }): Promise<string>;
}
```

Settings page: choose the provider and model **per task**.

| Task | Example default |
|---|---|
| Personalized email writing | Gemini or OpenAI (best quality) |
| Reply classification | Cheaper/faster model |
| Reply drafting | Best-quality model |
| Lead niche inference | Cheap model |

- Fallback: if the primary provider fails or rate-limits, automatically retry on the next provider in the list.
- API keys are stored server-side only (environment variables / Secret Manager), never in the browser.

---

## 6. Dashboard Pages

1. **Overview**: today's sends, replies, interested leads, pending approvals, account health.
2. **Import**: upload CSV, preview, run summary.
3. **Leads**: table with filters (niche, status, batch), lead detail with the full thread.
4. **Approval Queue**: described above.
5. **Interested Leads**: pipeline board (Contacted -> Replied -> Interested -> Meeting -> Won/Lost).
6. **Email Accounts**: connect Gmail, set limits, see usage and status.
7. **Templates**: niche pitch angles, services list, tone, banned phrases.
8. **Settings**: AI routing, send window, autonomy level, owner email, Telegram, calendar link, signature.
9. **Reports**: charts for sends/replies/interest by niche.

---

## 7. Compliance and Deliverability (important)

- Every email has a clear sender identity and a simple opt-out line ("Reply STOP to stop receiving emails").
- Honor opt-outs permanently via the suppression list; check it before every send.
- Only use business contact details that are publicly listed for business purposes; keep a note of the lead source.
- Follow local rules (India's DPDP Act, CAN-SPAM, GDPR for EU leads).
- Avoid spam triggers: no all caps, no excessive links, no attachments in the first email.
- Warm up new Gmail accounts slowly; monitor bounces and stop on high bounce/complaint rates.
- Never send more than the account's `dailyLimit`.

---

## 8. Security

- Encrypt Gmail refresh tokens at rest (AES-256, key in Secret Manager).
- Firestore rules: only the authenticated owner can read/write.
- AI keys only on the server. No keys in client code.
- Log AI inputs/outputs for debugging, with lead personal data minimized.
- Rate-limit the API routes and verify Firebase ID tokens on every request.

---

## 9. Project Structure

```
agentic-client/
├─ app/                      # Next.js pages (dashboard)
│  ├─ (dashboard)/overview
│  ├─ import/
│  ├─ leads/
│  ├─ approvals/
│  ├─ pipeline/
│  ├─ accounts/
│  ├─ templates/
│  ├─ settings/
│  └─ reports/
├─ app/api/
│  ├─ import/route.ts
│  ├─ drafts/route.ts
│  ├─ send/route.ts
│  ├─ gmail/oauth/route.ts
│  └─ telegram/webhook/route.ts
├─ functions/                # Firebase Cloud Functions (scheduled)
│  ├─ pollReplies.ts         # every 5 min
│  ├─ sendQueue.ts           # every 2 min, respects limits/windows
│  ├─ followUps.ts           # hourly
│  └─ digest.ts              # daily
├─ lib/
│  ├─ ai/{provider.ts,gemini.ts,openai.ts,grok.ts,router.ts}
│  ├─ agents/{personalize.ts,classify.ts,reply.ts}
│  ├─ gmail/{client.ts,send.ts,read.ts,rotation.ts}
│  ├─ csv/parse.ts
│  ├─ notify/{email.ts,telegram.ts}
│  └─ firestore.ts
└─ prompts/{personalize.md,classify.md,reply.md}
```

---

## 10. Prompts (starting versions)

**Personalize**
> You write short, friendly, honest cold emails for a freelance developer. Services: websites, mobile apps, SaaS, backend APIs, chatbots, custom ML. Given the lead details and niche pitch angle, write a 90-150 word email with a relevant subject line, one or two specific ideas for this business, and a single call to action for a short call. Do not invent facts, prices or claims. Match the tone examples. Return JSON: `{"subject": "...", "body": "..."}`.

**Classify**
> Classify the reply into one of: interested, question, not_interested, unsubscribe, out_of_office, other. Return JSON with classification, sentiment, one-line summary, needsHuman (true if pricing, contracts, complaints, legal, or anything unclear), and suggestedAction.

**Reply**
> Draft a polite, concise reply. Answer only what you know from the service list. Never quote prices or deadlines; suggest a call using this link: {calendarLink}. If the lead is not interested, thank them in one line and stop.

---

## 11. Build Phases

**Phase 1: Foundation (Days 1-3)**
- Next.js + Firebase setup, auth, Firestore rules
- CSV import with validation and dedupe
- Leads table

**Phase 2: AI and Drafting (Days 4-6)**
- AI provider router with Gemini/OpenAI/Grok adapters and settings UI
- Personalization agent and niche templates
- Approval queue (approve/edit/reject/regenerate)

**Phase 3: Gmail (Days 7-10)**
- OAuth connect for multiple accounts
- Sender with rotation, limits, delays, send window
- Suppression list and unsubscribe handling

**Phase 4: Replies (Days 11-14)**
- Reply poller, classifier, reply drafter
- Lead status pipeline and thread view
- Instant alerts (email and Telegram)

**Phase 5: Automation and Reports (Days 15-18)**
- Follow-ups, daily digest, weekly report
- Learning examples and autonomy ladder (L0-L3)
- Dashboard charts

**Phase 6: Polish and Scale**
- Bounce handling, account health, retry logic
- Attachments (portfolio PDF), calendar booking
- Later: Electron desktop app and Android app using the same API

---

## 12. Environment Variables

```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
TOKEN_ENCRYPTION_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
GROK_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
OWNER_EMAIL=
CALENDAR_BOOKING_LINK=
```

---

## 13. Testing Checklist

- [ ] CSV with duplicates, bad emails and missing niche imports correctly
- [ ] Draft for each niche looks relevant and contains no invented facts
- [ ] Approval flow works: approve, edit, regenerate, reject
- [ ] Emails rotate across Gmail accounts and respect daily limits and send window
- [ ] Reply lands in the same thread and is classified correctly (all 5 classes)
- [ ] "Unsubscribe" reply stops all future emails to that lead
- [ ] Interested lead triggers an instant alert and appears in the digest
- [ ] Pricing questions are flagged `needsHuman` and never auto-sent
- [ ] AI provider switch in settings works, with fallback when one fails
- [ ] Autonomy level changes behave as defined
- [ ] Tokens and API keys never appear in client code or logs

---

## 14. Future Ideas

- Lead scoring (hot, warm, cold) based on reply speed and wording
- Auto-enrich leads from their website (what they do, what they're missing)
- WhatsApp/Instagram DM follow-up channel
- Proposal and quotation generator after a meeting
- A/B test subject lines per niche
- Voice-note meeting summaries into CRM notes
- Multi-user (team) mode and a SaaS version for other freelancers

---

## 15. Always-On Autopilot (works even if the dashboard stays closed for a month)

The website is only a **control panel**. All real work runs on the server on a schedule, so closing the browser changes nothing.

### 15.1 Where the jobs run
| Job | Schedule | Runs on |
|---|---|---|
| `sendQueue` | every 2-5 min | Firebase Cloud Functions (Cloud Scheduler) |
| `pollReplies` | every 5 min | same |
| `followUps` | hourly | same |
| `digest` | daily, 8 PM IST | same |
| `healthCheck` | every 30 min | same |

- Cloud Scheduler needs the Firebase **Blaze (pay-as-you-go)** plan. For this volume (20-50 leads) the cost is usually near zero because the free quota covers it.
- Alternatives if Blaze is not wanted: a free-tier VPS or a small always-on Python worker with cron, or GitHub Actions cron (5-minute minimum, slightly unreliable). Vercel Hobby cron only runs once per day, so it is not enough for reply polling.

### 15.2 Gmail tokens must not expire (critical)
- In Google Cloud Console, set the OAuth consent screen to **"In production"**. If it stays in "Testing", refresh tokens expire after **7 days** and the whole system silently stops after a week.
- Store the refresh token encrypted; refresh access tokens automatically on every job run.
- If a token fails (revoked or password changed), mark the account `error`, stop using it, and alert the owner on Telegram and by email.

### 15.3 What happens when the owner is away
- Items at autonomy levels that allow it are handled automatically (replies, follow-ups, acknowledgements).
- Items that need a human (pricing, contracts, complaints, unclear replies, meeting requests) are **not** answered by the AI. They wait in the queue, and the owner gets an instant alert plus a reminder every 24 hours.
- For `interested` leads, the AI may send a safe holding reply with the booking link ("Happy to discuss, here is a link to pick a time"), so the lead is never left hanging.
- Pending **initial-email drafts** never auto-send unless the niche is at autonomy level L2 or higher.

### 15.4 Autonomy settings for hands-off mode
Add a settings section **"Autopilot"**:
- Master switch: Autopilot ON / OFF (OFF pauses all sending instantly).
- Per category autonomy level (initial, follow-up, reply-simple, reply-interested), each defaulting to L0.
- Auto-promotion suggestion after N approved-without-edit drafts (for example 20). The owner accepts it once; after that it stays on.
- **Confidence gate**: the AI returns a confidence score; below the threshold (for example 0.8) the draft goes to the approval queue instead of being sent.
- **Away mode**: when ON, only allowed categories auto-send and everything else queues with alerts.

### 15.5 Safety rails that keep it working unattended
- Hard daily cap per Gmail account and a global daily cap.
- Auto-pause an account if the bounce rate exceeds about 5% or Gmail returns sending errors.
- Auto-pause the whole system if the AI provider fails on all fallbacks (and alert the owner).
- Never auto-send to anyone on the suppression list; check it right before every send.
- Maximum 2 follow-ups per lead; then mark the lead `cold`.
- Idempotent jobs: a message is marked `sending` before it is sent, so a retry never sends it twice.
- Quarterly review reminder: a digest line like "Autopilot sent X emails this month; Y replies were auto-handled; Z need you."

### 15.6 Monitoring (so you know it is alive)
- `healthCheck` writes a `lastHeartbeat` timestamp. If no heartbeat for 2 hours, a separate tiny watcher (for example a free uptime monitor hitting `/api/health`) sends a Telegram/email alert.
- Store a log of every automatic action (sent, classified, replied, paused) viewable in an **Activity Log** page, so a month later you can see exactly what the agent did.
- Weekly summary email even if you never open the dashboard.

### 15.7 Reply detection without the dashboard
- Polling every 5 minutes is enough and the simplest. Optional upgrade: Gmail `watch` + Google Pub/Sub for near-instant replies (requires re-registering the watch every 7 days via a scheduled job).

### 15.8 Updated testing checklist (autopilot)
- [ ] Close the browser for 24 hours; sends, replies and digest still happen
- [ ] Revoke a Gmail token on purpose; the account is paused and an alert arrives
- [ ] Simulate an AI provider outage; fallback provider is used, then system pauses if all fail
- [ ] Pricing question arrives while away; no auto-reply is sent, an alert is sent, and a reminder follows after 24 hours
- [ ] Turning Autopilot OFF stops all sending within one scheduler cycle
- [ ] Restart the jobs mid-send; no duplicate emails go out
