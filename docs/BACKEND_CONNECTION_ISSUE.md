# 🔌 Backend Connection Issue - Failed to Fetch

**Date:** January 21, 2025  
**Error Type:** Console TypeError  
**Status:** ⚠️ **BACKEND NOT RUNNING**

---

## 🐛 Problem

### Error Messages
```
Console TypeError: Failed to fetch

at APIClient.request (src/services/apiClient.ts:609:28)
at APIClient.getDecisions (src/services/apiClient.ts:1221:33)
at loadDecisions (src/views/DecisionJournalPage.tsx:43:36)
```

**Occurring multiple times (4x) in DecisionJournalPage**

---

## 🔍 Root Cause Analysis

### Investigation Results

```bash
# Check if backend is running on port 3002
lsof -i:3002
# Result: No process listening on port 3002

# Check for node/nodemon processes
ps aux | grep -E "node.*server|nodemon"
# Result: nodemon process exists BUT not listening on any port
```

### Diagnosis
✅ **Frontend running** on port 3000  
❌ **Backend NOT running** on port 3002  
⚠️ **nodemon zombie process** exists but not functional

---

## ✅ Solution

### Quick Fix: Restart Backend

```bash
# 1. Kill any zombie processes
pkill -f "nodemon"
pkill -f "node server"

# 2. Start backend properly
npm run dev:backend
# OR start both together
npm run dev
```

### Expected Output
```
✅ Workflow Manager inicializado
✅ Workflow Scheduler inicializado
🚀 Servidor rodando em http://localhost:3002
```

---

## 🔧 Complete Restart Process

If problems persist, do a full restart:

```bash
# 1. Kill all processes
pkill -f "next dev"
pkill -f "nodemon"
pkill -f "node server"
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null

# 2. Wait for cleanup
sleep 3

# 3. Restart everything
npm run dev
```

---

## 📊 Impact

### What Fails When Backend is Down

| Feature | Status | Impact |
|---------|--------|--------|
| **Decision Journal** | ❌ Broken | Cannot load decisions |
| **Projects** | ❌ Broken | Cannot load project data |
| **Knowledge Graph** | ❌ Broken | Cannot fetch graph data |
| **Analytics** | ❌ Broken | No metrics data |
| **Workflows** | ❌ Broken | Cannot list/execute workflows |
| **Brain Cloud** | ❌ Broken | No MCP integration |
| **Chat** | ⚠️ Partial | Frontend works, no backend tools |
| **UI** | ✅ Works | Static UI loads fine |

---

## 🎯 Why This Happened

### Possible Causes

1. **Port Conflict**
   - Another process was using port 3002
   - Backend failed to start but nodemon kept running

2. **Crash on Startup**
   - Backend started but crashed immediately
   - Error in initialization code (Workflow, DB, etc.)

3. **Previous Kill Command**
   - Backend was killed but frontend kept running
   - Only partial restart occurred

4. **Environment Issue**
   - Missing environment variables
   - Database connection failed

---

## 🔍 Diagnostic Commands

### Check if backend is healthy:

```bash
# 1. Check port usage
lsof -i:3002

# 2. Check process
ps aux | grep -E "node.*server|nodemon"

# 3. Test backend endpoint
curl http://localhost:3002/api/health 2>&1

# 4. Check logs
tail -50 /tmp/server.log 2>/dev/null

# 5. Check backend console output
# (look in terminal where npm run dev was started)
```

---

## 📝 Prevention

### Best Practices

1. **Always start with `npm run dev`**
   - Starts both frontend and backend together
   - Uses `concurrently` to manage both processes

2. **Check both ports before starting**
   ```bash
   lsof -i:3000  # Frontend
   lsof -i:3002  # Backend
   ```

3. **Monitor startup logs**
   - Wait for "✅ Servidor rodando" message
   - Check for errors in red

4. **Use proper shutdown**
   - Ctrl+C in terminal (sends SIGINT)
   - Allows graceful shutdown
   - Avoid `kill -9` unless necessary

---

## 🚨 Quick Health Check

Run this to verify everything is working:

```bash
# Check both services
echo "Frontend:" && curl -s http://localhost:3000 | head -1
echo "Backend:" && curl -s http://localhost:3002/api/health

# Should output:
# Frontend: <!DOCTYPE html> (or similar HTML)
# Backend: {"status":"ok"} (or similar JSON)
```

---

## 🔄 Related Errors

### Symptoms of Backend Down
- ❌ "Failed to fetch" in console
- ❌ "Network error" toasts in UI
- ❌ Empty lists (projects, decisions, workflows)
- ❌ Analytics showing no data
- ❌ Chat tools not working

### Not Related to Backend Down
- ✅ TypeScript compilation errors
- ✅ React component errors
- ✅ "Cannot access X before initialization" errors
- ✅ Props/state errors

---

## ✅ Verification After Fix

After restarting backend, check:

1. **Console output shows:**
   ```
   ✅ Pool PostgreSQL (Supabase) pronto
   ✅ Cache inicializado
   ✅ Workflow Manager inicializado
   ✅ Workflow Scheduler inicializado
   🚀 Servidor rodando em http://localhost:3002
   ```

2. **Port is listening:**
   ```bash
   lsof -i:3002 | grep LISTEN
   # Should show node process
   ```

3. **API responds:**
   ```bash
   curl http://localhost:3002/api/health
   # Should return JSON
   ```

4. **No "Failed to fetch" errors in browser console**

5. **Decision Journal page loads data**

---

## 📚 Related Documentation

- **Start Guide:** `NEXT_STEPS.md`
- **Development Setup:** `README.md`
- **API Documentation:** Check server/routes/ folder

---

## 🎯 Current Status

**Backend Status:** ❌ **NOT RUNNING**

**Action Required:** 
1. ✅ Restart backend with `npm run dev:backend`
2. ✅ Verify port 3002 is listening
3. ✅ Check for "Failed to fetch" errors are gone

---

**Diagnosed by:** Agent Runtime Error Fix  
**Date:** January 21, 2025  
**Next Action:** Restart backend server

---

⚠️ **Backend needs to be restarted!** Run `npm run dev` or `npm run dev:backend`
