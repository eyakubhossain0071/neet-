# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default Deny Catch-All**: Any path not explicitly matched in `firestore.rules` is unconditionally denied (`allow read, write: if false;`).
2. **Email Verification & Identity Integrity**: All write operations (`create`, `update`, `delete`) require an authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`). All ownership fields (`uid`, `authorId`, `ownerId`) must strictly equal `request.auth.uid` on creation and remain immutable on updates.
3. **PII & Private Profile Isolation**: `/users/{userId}` and `/users/{userId}/mockTests/{testId}` are strictly restricted to the document owner (`request.auth.uid == userId`). Non-owners cannot `get`, `list`, `create`, `update`, or `delete` another student's profile or mock tests.
4. **Master Gate (Relational Sync)**: Creating, reading, updating, or deleting a `/users/{userId}/mockTests/{testId}` document requires that the parent `/users/{userId}` document exists and its `uid` matches `request.auth.uid`.
5. **Strict Key & Volumetric Boundaries**: Every write validates `hasAll` and `hasOnly` keys, enforces string length boundaries (`minLength`/`maxLength`), regex ID format (`^[a-zA-Z0-9_\-]+$`), integer ranges (e.g., NEET scores `-180..720`), bounded arrays (`completedChapterIds.size() <= 100`), and server timestamps (`request.time`).
6. **Terminal State Locking**: Once a `ForumPost` has `resolved == true`, its content and resolution state are locked against further modifications.
7. **Secure List Queries**: Every `allow list` rule explicitly evaluates `resource.data` (`resource.data.uid == request.auth.uid` for mock tests; `resource.data.visibility == 'public'` or owner check for forum posts and study groups) without delegating security to client filtering.

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Spoof (`UserProfile` create)**: Authenticated user with `email_verified: false` attempts to create `/users/user_1`. -> `PERMISSION_DENIED`
2. **Identity Spoofing (`UserProfile` create)**: `user_1` attempts to create `/users/user_1` with `uid: "user_2"`. -> `PERMISSION_DENIED`
3. **Cross-User Profile Snooping (`UserProfile` get)**: `user_2` attempts `get` on `/users/user_1`. -> `PERMISSION_DENIED`
4. **Shadow Field Injection (`UserProfile` create)**: `user_1` sends valid fields plus `"isAdmin": true` to `/users/user_1`. -> `PERMISSION_DENIED`
5. **Orphaned Subcollection Write (`MockTestRecord` create)**: `user_1` attempts to create `/users/user_1/mockTests/test_1` when parent `/users/user_1` does not exist. -> `PERMISSION_DENIED`
6. **Out-of-Bounds NEET Score (`MockTestRecord` create)**: `user_1` submits `totalScore: 950` (exceeding max 720) to `/users/user_1/mockTests/test_1`. -> `PERMISSION_DENIED`
7. **ID Poisoning Attack (`ForumPost` create)**: `user_1` attempts to create `/forumPosts/bad$id!@#` with invalid characters in document ID. -> `PERMISSION_DENIED`
8. **Denial-of-Wallet String Overflow (`ForumPost` create)**: `user_1` submits a `body` string of 10,000 characters (exceeding `maxLength: 2000`). -> `PERMISSION_DENIED`
9. **Immutable Field Tampering (`ForumPost` update)**: `user_1` attempts to change `createdAt` or `authorId` on an existing `/forumPosts/post_1`. -> `PERMISSION_DENIED`
10. **Terminal State Bypass (`ForumPost` update)**: `user_1` attempts to update `/forumPosts/post_resolved` after `existing().resolved == true`. -> `PERMISSION_DENIED`
11. **Unauthorized Action Keys (`StudyGroup` update)**: Non-owner `user_2` attempts to update `name` and `focusTopic` on `user_1`'s `/studyGroups/group_1` (non-owners can only increment/update `memberCount` and `avgMockScore` via the Join/Sync action). -> `PERMISSION_DENIED`
12. **Unfiltered List Scraping (`MockTestRecord` list)**: `user_2` attempts an unconstrained `list` query on `/users/user_1/mockTests`. -> `PERMISSION_DENIED`
