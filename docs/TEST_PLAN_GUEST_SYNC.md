# 🧪 Manual Test Plan — Guest-to-Account Cloud Sync & Sign-Out Guard

This document describes the 3 end-to-end manual test cases for verifying Guest Mode persistence, atomic cloud migration, race-condition guards, and duplicate prevention in **MealPulse.AI**.

---

### Test Case 1: End-to-End Guest -> Sign In -> Sign Out -> Sign In (Idempotency & Zero Duplicates)

**Objective**: Verify that guest meal logs & water intake are migrated cleanly to Supabase upon sign in, that Sign Out resets UI to 0 meals / 0 water, and that a second Sign In reloads cloud data with **zero duplicates**.

**Steps**:
1. Open the app as an unauthenticated **Guest user**.
2. Log a meal manually or via AI Scan (e.g. "Chicken Salad", 450 kcal, 35g protein).
3. Log +500 ml water in the Water Tracker Card.
4. Tap **Sign In** (e.g., via Google OAuth or Email).
5. **Verification 1**: Check Supabase Dashboard (`meal_logs` & `water_logs` tables) -> Confirm "Chicken Salad" and 500 ml water log exist under the user's `user_id`.
6. Tap **Sign Out** in Profile / Settings.
7. **Verification 2**: Check Home Screen UI -> Confirm Meals = 0, Water = 0 ml, Macro Targets = default values, and Profile = Guest User.
8. Log another meal as Guest (e.g. "Protein Shake", 250 kcal).
9. Tap **Sign In** again with the **same account**.
10. **Verification 3**: Confirm Home Screen displays both "Chicken Salad" and "Protein Shake" **without any duplicate entries**.

---

### Test Case 2: Race Condition Guard During In-Flight Save & Instant Sign-Out

**Objective**: Verify that clicking Sign Out while an AI vision meal scan or water update is actively writing does NOT lose data or corrupt state.

**Steps**:
1. Open the app as a logged-in or Guest user.
2. Snap/select a meal photo and tap **Save Meal to Account/Local**.
3. **IMMEDIATELY** (within < 100ms) open settings and tap **Sign Out**.
4. **Verification**:
   - The sign-out sequence checks `signOutSafe()`, waiting for `activeWritesCount` to reach 0 (`waitMs`).
   - The meal save completes cleanly to disk/cloud BEFORE the session reset executes.
   - The logged meal is preserved in history and not lost or corrupted.

---

### Test Case 3: Atomic Sync Failure Recovery (Simulated Network Interruption)

**Objective**: Verify that if a network drop occurs mid-sync, local guest keys are **NOT** deleted, ensuring a full retry on the next session without data loss.

**Steps**:
1. Log 3 meals and +750 ml water in Guest mode.
2. Enable Airplane mode or disconnect network midway through OAuth sign in callback.
3. Observe console logs: `[CloudSync ATOMIC GUARD] Sync incomplete (...) NO guest keys deleted. Will retry on next session.`
4. Re-enable network connectivity and re-open the app or trigger sync.
5. **Verification**: Confirm `syncLocalCacheToCloud()` retries atomically, uploads all 3 meals and water log to Supabase, and purges local guest keys ONLY after 100% upload confirmation.
