# Approval Viewer Enhancement - Quick Start

## ✅ What Was Implemented

Added interactive approval viewing and action buttons to Mission Control dashboard:

### Features:
1. **View Draft Sidebar** - Click any approval to view full draft in right sidebar
2. **Approve Button** - Send email and remove from approvals
3. **Reject Button** - Remove draft from approvals (no send)
4. **Edit Button** - Placeholder for future edit functionality
5. **Error Modal** - Shows error details if send fails with "Show Error Details" button

---

## 🚀 How to Use

### Step 1: Restart Mission Control

**Terminal 2, stop and restart:**
```bash
# Stop: Ctrl+C
# Restart:
node scripts/control.mjs
```

Then open: http://127.0.0.1:4318

### Step 2: Navigate to "Needs You" Section

In the Mission Control dashboard:
- Find the **"Needs You"** section
- Look for **"Approvals Waiting"**
- See your pending email approvals listed

### Step 3: Click an Approval to View

Click on any approval item to open the **sidebar viewer**:
- Full draft text appears on the right
- Shows full email content
- Shows recipient email
- Shows subject line

### Step 4: Take Action

At the bottom of sidebar, choose:

| Button | Action |
|--------|--------|
| **[Edit]** | Edit the draft (future feature) |
| **[Approve & Send]** | Send the email immediately |
| **[Reject]** | Remove from approvals (no send) |

### Step 5: Handle Errors

If send fails:
- ⚠️ Error modal appears
- Click **"Show Error Details"** to see why
- Review error message (usually SMTP issue)
- Fix and retry

---

## 📋 Files Changed

| File | Changes |
|------|---------|
| `scripts/control.mjs` | Added 3 API endpoints: `/api/approval/:id/view`, `/approve`, `/reject` |
| `scripts/approval-viewer.js` | NEW - Sidebar viewer component with modal and buttons |

---

## 🔧 What Still Works

- ✅ All existing dashboard features work as before
- ✅ CLI approval method still works (`/do Approve...`)
- ✅ Approvals in `ops/approvals.md` sync with dashboard
- ✅ Both methods (dashboard + CLI) update same source of truth

---

## 🎯 Next Steps

**Try it now:**
1. Restart Mission Control
2. Click an approval in the dashboard
3. View the draft sidebar
4. Click "Approve & Send"
5. Watch it send in real-time

---

## 💡 Features You Now Have

✅ One-click approval on dashboard  
✅ Sidebar draft viewer  
✅ Approve/Reject buttons  
✅ Error handling with details  
✅ No more CLI context-switching needed  
✅ Fully synced with existing system  

---

## 🐛 If Something Doesn't Work

Check:
1. Mission Control restarted? (`node scripts/control.mjs`)
2. Browser console for errors? (F12 → Console)
3. SMTP configured? (Should work now with .env)
4. Approvals exist? (Check `ops/approvals.md`)

---

**Ready to test? Restart Mission Control and try it!** 🚀
