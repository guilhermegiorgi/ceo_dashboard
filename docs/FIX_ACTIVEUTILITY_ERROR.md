# 🔧 Fix: activeUtility is not defined

**Date:** January 21, 2025  
**Error Type:** Runtime ReferenceError  
**Status:** ✅ RESOLVED

---

## 🐛 Problem

### Error Message
```
Runtime ReferenceError: activeUtility is not defined

at ExpandedChatView (src/components/ChatWidget.tsx:157:11)
at ChatWidget (src/components/ChatWidget.tsx:283:13)
```

### Root Cause
The component `ExpandedChatView` was defined as a standalone component outside of `ChatWidget`, but it was trying to access state variables (`activeUtility`, `setActiveUtility`) that were defined inside `ChatWidget`.

**Problematic Code Structure:**
```typescript
// Line 89: ExpandedChatView defined as standalone component
const ExpandedChatView = ({
  onMinimize,
  onClose,
}: {
  onMinimize: () => void;
  onClose: () => void;
}) => (
  // ...
  // Line 157: Trying to use activeUtility (NOT IN SCOPE!)
  activeUtility === "shortcuts"
  // ...
);

// Line 238: activeUtility defined inside ChatWidget (TOO LATE!)
export default function ChatWidget({ className = "" }: ChatWidgetProps) {
  const [activeUtility, setActiveUtility] = useState<"shortcuts" | "history" | null>(null);
  // ...
}
```

---

## ✅ Solution Applied

### Strategy: Props Drilling

Pass the required state and functions as props from `ChatWidget` to `ExpandedChatView`.

### Code Changes

#### 1. Updated `ExpandedChatView` Props Interface
**File:** `src/components/ChatWidget.tsx` (Line 89)

**Before:**
```typescript
const ExpandedChatView = ({
  onMinimize,
  onClose,
}: {
  onMinimize: () => void;
  onClose: () => void;
}) => (
```

**After:**
```typescript
const ExpandedChatView = ({
  onMinimize,
  onClose,
  activeUtility,
  setActiveUtility,
  handleShortcutSelect,
  handleLoadConversation,
  conversations,
}: {
  onMinimize: () => void;
  onClose: () => void;
  activeUtility: "shortcuts" | "history" | null;
  setActiveUtility: (value: "shortcuts" | "history" | null) => void;
  handleShortcutSelect: (action: string) => void;
  handleLoadConversation: (id: string) => void;
  conversations: Array<Record<string, unknown>>;
}) => (
```

#### 2. Updated Component Usage
**File:** `src/components/ChatWidget.tsx` (Line 293)

**Before:**
```typescript
{isExpanded ? (
  <ExpandedChatView
    onMinimize={() => setIsExpanded(false)}
    onClose={() => setIsVisible(false)}
  />
) : (
  <MinimizedChatBar onClick={() => setIsExpanded(true)} />
)}
```

**After:**
```typescript
{isExpanded ? (
  <ExpandedChatView
    onMinimize={() => setIsExpanded(false)}
    onClose={() => setIsVisible(false)}
    activeUtility={activeUtility}
    setActiveUtility={setActiveUtility}
    handleShortcutSelect={handleShortcutSelect}
    handleLoadConversation={handleLoadConversation}
    conversations={conversations}
  />
) : (
  <MinimizedChatBar onClick={() => setIsExpanded(true)} />
)}
```

---

## 🎯 Why This Works

1. **Proper Scope**: `activeUtility` is now properly passed through props
2. **Type Safety**: TypeScript validates all props are correctly typed
3. **Component Isolation**: `ExpandedChatView` is now properly decoupled
4. **Reusability**: Component can now be reused with different state sources

### Data Flow
```
ChatWidget (parent)
  ↓ (defines state)
  const [activeUtility, setActiveUtility] = useState(...)
  ↓ (passes as props)
  <ExpandedChatView 
    activeUtility={activeUtility}
    setActiveUtility={setActiveUtility}
    ...
  />
  ↓ (receives and uses)
  activeUtility === "shortcuts" ✅ WORKS!
```

---

## 🧪 Verification

### Before Fix
```bash
npm run dev
# Error: activeUtility is not defined
```

### After Fix
```bash
npm run dev
# ✓ Compiled successfully
# No activeUtility errors!
```

---

## 📊 Impact

| Aspect | Status |
|--------|--------|
| **Runtime Error** | ✅ Fixed |
| **TypeScript** | ✅ Properly typed |
| **Component Structure** | ✅ Improved |
| **Maintainability** | ✅ Better separation |

---

## 💡 Lessons Learned

### Best Practices
1. **Always pass state as props**: When components are separate, pass state explicitly
2. **Avoid implicit dependencies**: Don't rely on closure scope from parent functions
3. **Component boundaries**: Clearly define component boundaries and prop interfaces
4. **Type safety**: Let TypeScript catch these errors early

### Prevention
To prevent similar issues:
1. Use ESLint rule: `react/prop-types` or TypeScript strict mode
2. Define components inside parent OR pass all dependencies as props
3. Use component composition patterns
4. Consider using Context API for deeply nested state

---

## 🔗 Related Files

- `src/components/ChatWidget.tsx` - Main file modified
- `src/components/workflow/UtilityContentRenderer.tsx` - Used by ExpandedChatView

---

## 📝 Alternative Solutions Considered

### 1. Move `ExpandedChatView` inside `ChatWidget`
**Pros:** Direct access to all state  
**Cons:** Makes `ChatWidget` even larger, harder to test  
**Decision:** Not chosen due to component size concerns

### 2. Use React Context
**Pros:** Avoids props drilling  
**Cons:** Overkill for this use case, adds complexity  
**Decision:** Not chosen - props drilling is acceptable for this depth

### 3. Props Drilling (CHOSEN)
**Pros:** 
- Simple and explicit
- Type-safe
- Easy to understand
- Standard React pattern

**Cons:** Need to pass multiple props  
**Decision:** ✅ CHOSEN - Best balance for this case

---

## ✅ Verification Checklist

- [x] Error no longer appears in dev mode
- [x] TypeScript compilation passes
- [x] All utility buttons work (F1/F2)
- [x] Shortcuts panel displays correctly
- [x] History panel displays correctly
- [x] No runtime errors in console
- [x] Props are properly typed

---

## 🚀 Deployment Status

**Status:** ✅ Ready for testing

The fix has been applied. All state is now properly passed through props.

---

**Fixed by:** Agent Runtime Error Fix  
**Date:** January 21, 2025  
**Severity:** High (blocking runtime)  
**Resolution Time:** ~10 minutes  
**Status:** ✅ RESOLVED

---

🎉 **Issue Resolved - Chat Widget Working!**
