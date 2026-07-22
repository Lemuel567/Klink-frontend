# Klink QA Test Plan

**Tester:** works on a branch (`<name>/qa-pass-1`), fills the Result columns below,
opens a **GitHub Issue for every failure** (steps + screenshot + phone model), and
puts the issue number in the Notes column. Commit updated results one module at a
time and open a Pull Request when a full pass is complete.

Test accounts (pastor / member / financial secretary) are provided by the team lead.

---

## 1 · Registration & Sign-in

| # | Test | Steps | Expected | iPhone | Android | Notes / Issue # |
|---|------|-------|----------|--------|---------|-----------------|
| 1.1 | Register with email | Register → join code + email + password (12+ chars) | Verification code arrives by email; code screen opens | | | |
| 1.2 | Register with phone only | Register with phone `0XX XXX XXXX`, no email | SMS code arrives; number shown as +233… | | | |
| 1.3 | Short password rejected | Try a 8-char password | Clear error before submitting | | | |
| 1.4 | Wrong code | Enter a wrong 6-digit code | Friendly error, can retry | | | |
| 1.5 | Resend code | Tap resend | New code arrives and works | | | |
| 1.6 | Login with email | Sign out, sign in with email | Lands on Home | | | |
| 1.7 | Login with phone | Sign in with `0XX…` local format | Works (auto +233) | | | |
| 1.8 | Wrong password | Wrong password 2× | Error appears within seconds — no long spinner | | | |
| 1.9 | Forgot password | Full reset flow via email code | Can sign in with new password | | | |
| 1.10 | Session persists | Kill the app, reopen | Still signed in, no login screen | | | |

## 2 · Home & Navigation

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 2.1 | Entrance animation | Open Home, switch tabs and return | Content glides in smoothly, replays on return, nothing stays invisible | | | |
| 2.2 | All 8 quick tiles | Tap each tile on Home | Each opens the right screen with a back path | | | |
| 2.3 | Stat cards | Tap attendance / giving / pledges / projects cards | Each opens its screen; numbers look correct | | | |
| 2.4 | Pull to refresh | Pull down on Home | Spinner appears; content refreshes | | | |
| 2.5 | Tab bar | Switch all 5 tabs quickly, many times | Gold pill slides; no blank screens ever | | | |

## 3 · Church Hub

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 3.1 | Meet-in-center animation | Open Church tab | Left tiles come from left, right tiles from right, in pairs | | | |
| 3.2 | All 15 feature tiles | Tap every tile | Each opens; back button returns | | | |

## 4 · Attendance

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 4.1 | Leader session | As pastor: Start QR session | Big QR renders | | | |
| 4.2 | Member scan | As member: Scan to Check In → scan leader's QR | Celebration animation; marked present | | | |
| 4.3 | Double scan | Scan again same service | "Already checked in" message, no crash | | | |
| 4.4 | Manual marking | As pastor: mark a member manually | Appears in records | | | |
| 4.5 | Own history | As member: view my attendance | Today's record listed | | | |

## 5 · Giving & Payments (Paystack SANDBOX — no real money)

Test card: `4084 0840 8408 4081` · CVV `408` · any future expiry · PIN `0000` · OTP `123456`

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 5.1 | Give Now (member) | Give tab → Give Now → Tithe → small amount → test card | Success screen with gold celebration; receipt email arrives | | | |
| 5.2 | History updates | Check Giving history + This Month total | New payment listed; total went up | | | |
| 5.3 | Fin-Sec personal give | As fin-sec: Give Now | Fin-sec pays personally like anyone; shows in THEIR history | | | |
| 5.4 | Fin-Sec record button | As fin-sec: Record Member Payment | Recorder opens with member search | | | |
| 5.5 | Invalid amount | Try 0 and blank | Inline error, cannot submit | | | |
| 5.6 | Online payments list | Open "Online payments" | The test payment appears with status | | | |

## 6 · Polls

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 6.1 | Create (pastor) | Pastor: + New poll, 2+ options | Poll appears | | | |
| 6.2 | Create hidden (member) | Member opens Polls | No create button anywhere | | | |
| 6.3 | Vote once | Member votes | Options lock instantly; ✓ You voted | | | |
| 6.4 | Results for everyone | After voting | Animated bars + "N MEMBERS HAVE VOTED" + % per option | | | |
| 6.5 | Independent votes | Vote on phone A; check phone B (different member) | Phone B can still vote — NOT marked as voted | | | |
| 6.6 | Freeze while creating | Create poll on slow network, tap + Add option while spinner runs | Everything disabled during submit | | | |

## 7 · Members Directory

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 7.1 | Member view privacy | As member: open a person | Name/phone/photo only — no email, role, records | | | |
| 7.2 | Leader view | As pastor: open same person | Full record + role controls | | | |
| 7.3 | Search | Search by partial name and by phone | Correct matches | | | |

## 8 · Content (Announcements · Events · Sermons · Devotionals)

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 8.1 | Post announcement | Pastor posts; member checks inbox | Appears with unread dot; dot clears on open | | | |
| 8.2 | Create event | Pastor creates; member sees countdown | Correct date and countdown | | | |
| 8.3 | Sermon audio | Play a sermon with background music on | Music ducks; resumes after pause | | | |
| 8.4 | Silent switch (iPhone) | Physical mute ON, play sermon | Audio still plays | | | |
| 8.5 | Devotional | Open devotional; check Home verse | Latest devotional featured | | | |

## 9 · Groups

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 9.1 | Admin posts | Group admin posts a message | Other members notified / see it | | | |
| 9.2 | Non-admin blocked | Regular group member | No composer shown | | | |
| 9.3 | Dues recording | Group fin-sec records dues | Paid list updates | | | |

## 10 · Prayer Wall

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 10.1 | Private request | Member posts PRIVATE; second member checks | Second member cannot see it; pastor can | | | |
| 10.2 | Leader response | Pastor responds | Marked Answered with the reply | | | |

## 11 · Facilities & Projects

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 11.1 | Facility detail | Member taps a facility | Detail opens: photos, About, Details | | | |
| 11.2 | Multi-photo upload | Pastor adds 3+ photos at once | All appear; first-ever becomes COVER | | | |
| 11.3 | Cover change | Long-press a photo → Set as cover | Hero image changes | | | |
| 11.4 | Full-screen viewer | Tap a photo | Full-screen; ✕ closes | | | |
| 11.5 | Project lifecycle | Pastor approves a proposed project | Status changes; timeline updates | | | |

## 12 · Store

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 12.1 | Buy item | Member buys with a MoMo reference | Purchase recorded; stock decreases | | | |
| 12.2 | Sold out | Buy the last unit | Item shows SOLD OUT; further buying blocked | | | |

## 13 · Profile

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 13.1 | Photo change | Change profile photo (library) | Uploads (may take ~1 min on tunnel); avatar updates | | | |
| 13.2 | Edit details | Change name; save | Reflected on Profile immediately | | | |
| 13.3 | Change password | Full flow | Signed out everywhere; new password works | | | |
| 13.4 | Account switch | Sign out; sign in as a DIFFERENT member | NO data from the previous account visible anywhere | | | |

## 14 · Resilience

| # | Test | Steps | Expected | iPhone | Android | Notes |
|---|------|-------|----------|--------|---------|-------|
| 14.1 | Airplane mode | Enable mid-use, navigate | Offline banner; friendly errors; recovers when back | | | |
| 14.2 | Backend down | (Ask lead to stop it briefly) | Clear error messages, no crash; recovers on restart | | | |
| 14.3 | Slow network | Use on weak signal | Skeletons shown, nothing hangs forever | | | |

---

**Sign-off:** date of pass, phone models + OS versions used, total issues filed.
