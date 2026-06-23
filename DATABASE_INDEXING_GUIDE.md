# Database Indexing — Complete Guide

---

## Indexing Kya Hoti Hai?

Sochо ek **library** hai jis mein 1 lakh kitabein hain.  
Tum ek kitaab dhundhna chahte ho jiska naam hai **"Python Basics"**.

**Bina index ke:** Tum har shelf pe jaoge, har kitaab uthao ge, naam padho ge — jab tak mil jaye. Yeh **slow** hai.

**Index ke saath:** Library ke darwaze pe ek **register** rakha hai — "P se shuru honay wali kitabein → Shelf 42 mein hain". Tum seedha Shelf 42 jaoge. Yeh **fast** hai.

Database mein bhi yehi hota hai.

---

## Bina Index ke Database Kya Karta Hai?

```
SELECT * FROM applications WHERE job_id = 5;
```

Database yeh karta hai:

```
Row 1  → job_id = 1  ❌ nahi
Row 2  → job_id = 3  ❌ nahi
Row 3  → job_id = 5  ✅ mila!
Row 4  → job_id = 2  ❌ nahi
Row 5  → job_id = 5  ✅ mila!
...
Row 50,000 tak scan karta rahe ga
```

Isse **Full Table Scan** kehte hain — poori table padhi jati hai.

---

## Index ke Saath Kya Hota Hai?

Database ek **alag sorted structure** (B-Tree) banata hai:

```
job_id Index (B-Tree):
├── 1  → Row pointers: [1]
├── 2  → Row pointers: [4, 8, 15]
├── 3  → Row pointers: [2, 9]
├── 5  → Row pointers: [3, 5, 22, 67]  ← seedha yahan jump karo
└── 7  → Row pointers: [6, 11]
```

Ab database seedha `job_id = 5` ki entry dhundh leta hai aur sirf un rows ko fetch karta hai.  
50,000 rows scan karne ki jagah sirf **log(n) steps** — bahut fast.

---

## Real Numbers — Kitna Fark Padta Hai?

| Table Size | Bina Index | Index ke Saath |
|-----------|-----------|----------------|
| 1,000 rows | ~1ms | ~0.1ms |
| 10,000 rows | ~10ms | ~0.2ms |
| 100,000 rows | ~100ms | ~0.3ms |
| 1,000,000 rows | ~1000ms (1 second!) | ~0.5ms |

**Jitna zyada data, utna zyada index ka faida.**

---

## Index ke Types

### 1. Single Column Index
Ek column pe index — simple queries ke liye.

```python
# SQLAlchemy mein
email = Column(String, index=True)
```

```sql
-- SQL mein
CREATE INDEX ix_users_email ON users(email);
```

**Kab use karein:** Jab akela column WHERE clause mein baar baar aaye.

---

### 2. Unique Index
Ek single column index + duplicate allow nahi hote.

```python
slug = Column(String, unique=True)  # yeh apne aap index bhi create karta hai
```

**Kab use karein:** Email, username, slug — jo unique hone chahiyein.

---

### 3. Composite Index (Multi-Column Index)
Do ya zyada columns milake ek index — complex queries ke liye.

```python
Index('ix_applications_job_id_status', 'job_id', 'status')
```

```sql
CREATE INDEX ix_applications_job_id_status ON applications(job_id, status);
```

**Kab use karein:** Jab query mein do columns saath aayein:

```sql
-- Yeh query composite index use karegi (fast)
SELECT * FROM applications WHERE job_id = 5 AND status = 'APPLIED';

-- Yeh bhi use karegi (job_id index ka pehla part)
SELECT * FROM applications WHERE job_id = 5;

-- Yeh use NAHI karegi (sirf doosra column)
SELECT * FROM applications WHERE status = 'APPLIED';
```

> **Important Rule:** Composite index LEFT se RIGHT kaam karta hai.  
> `Index('a', 'b', 'c')` → queries on `(a)`, `(a,b)`, `(a,b,c)` fast hongi.  
> Sirf `(b)` ya `(c)` slow rahegi.

---

## SQLAlchemy Mein Index Kaise Likhein

### Method 1: Column pe directly
```python
class User(Base):
    email = Column(String, index=True)        # simple index
    username = Column(String, unique=True)    # unique index (auto index bhi)
```

### Method 2: `__table_args__` mein (composite ke liye)
```python
from sqlalchemy import Index

class Application(Base):
    job_id = Column(Integer, ForeignKey("posts.id"))
    status = Column(String)
    created_at = Column(DateTime)

    __table_args__ = (
        Index('ix_applications_job_id_status', 'job_id', 'status'),
        Index('ix_applications_job_id_created_at', 'job_id', 'created_at'),
    )
```

---

## Alembic Migration Kya Hoti Hai?

Model mein index likhna sirf **Python code** update karta hai — actual database nahi.  
Database ko update karne ke liye **migration** run karni padti hai.

```
Python Model  →  Alembic Migration  →  PostgreSQL Database
(design)          (change script)       (actual tables & indexes)
```

Migration file ek **script** hai jo database pe SQL commands run karti hai:

```python
def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_posts_status_created_at ON posts(status, created_at DESC)")

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_posts_status_created_at")
```

- `upgrade()` → index add karo
- `downgrade()` → index hata do (rollback)
- `IF NOT EXISTS` → agar index pehle se hai toh error mat do

---

## Mujhe Tumhare Project Mein Kya Missing Tha?

Tumhare project mein **single column indexes** kuch tables pe the, lekin **composite indexes** aur **kuch zaruri single indexes** bilkul nahi the.

### Jo Already Tha (Theek Tha):
```
users        → email ✅, username ✅
posts        → title ✅, status ✅, slug ✅
applications → job_id ✅, candidate_id ✅, status ✅, created_at ✅
```

### Jo Missing Tha (Maine Add Kiya):

#### posts table — Composite Indexes
```sql
-- Admin dashboard: "Show me all PUBLISHED jobs, newest first"
ix_posts_status_created_at    → (status, created_at DESC)

-- Soft delete filter: "Show jobs WHERE deleted_at IS NULL AND status = X"
ix_posts_status_deleted_at    → (status, deleted_at)

-- Creator view: "Show jobs created by user 5, only DRAFT ones"
ix_posts_created_by_status    → (created_by, status)

-- Sorting: ORDER BY created_at on any listing
ix_posts_created_at           → (created_at DESC)
```

#### applications table — Composite Indexes
```sql
-- Pipeline view: "Job 5 ki saari APPLIED applications"
ix_applications_job_id_status        → (job_id, status)

-- Candidate dashboard: "Mere saare SHORTLISTED applications"
ix_applications_candidate_status     → (candidate_id, status)

-- Timeline: "Job 5 ki applications newest first"
ix_applications_job_id_created_at    → (job_id, created_at DESC)
```

#### interview_sessions — Missing Single Indexes
```sql
ix_interview_sessions_status      → status     (filter PENDING/EXPIRED sessions)
ix_interview_sessions_expires_at  → expires_at  (cleanup expired sessions)
```

#### onboardings — Missing Indexes
```sql
ix_onboardings_user_id  → user_id  (user ki onboarding dhundho)
ix_onboardings_status   → status   (filter by onboarding stage)
```

#### onboarding_documents — Missing FK Index
```sql
ix_onboarding_documents_application_id  → application_id
-- Bina is ke: har document fetch pe full table scan!
```

#### user_integrations — Missing Indexes
```sql
ix_user_integrations_user_id        → user_id           (user ki integrations)
ix_user_integrations_user_platform  → (user_id, platform) (LinkedIn token lookup)
-- Yeh query har job publish pe hoti hai — bahut important!
```

#### password_reset_tokens — Missing Indexes
```sql
ix_password_reset_tokens_user_id    → user_id    (user ke tokens dhundho)
ix_password_reset_tokens_expires_at → expires_at  (expired tokens cleanup)
```

---

## Index Banana Kab Zaroori Hai?

### Zaroor Index Karo:
- `WHERE` clause mein baar baar aane wale columns
- `JOIN` ke columns (Foreign Keys)
- `ORDER BY` mein aane wale columns
- `GROUP BY` mein aane wale columns
- Unique hone wale columns

### Index Mat Karo:
- Columns jisme bohot kam unique values hoon (e.g. `is_active` — sirf true/false)
- Bohot choti tables (< 1000 rows) — overhead zyada, faida kam
- Columns jo sirf kabhi kabhi query mein aayein

---

## Index ka Ek Nuksan Bhi Hai

Index **write operations** (INSERT, UPDATE, DELETE) ko **thoda slow** karta hai.

Kyunki jab bhi naya row aata hai, database ko:
1. Table mein row add karna hai
2. **Saare indexes update karne hain** jo us table pe hain

Toh **zyada indexes = slow writes**.

**Solution:** Sirf wahi index banao jo queries mein actually use ho — unnecessary indexes delete karo.

---

## Migration Apply Karne Ka Tariqa

```bash
# Backend folder mein jao
cd Evalyn/backend

# Migration run karo
alembic upgrade head
```

Yeh command `c1d2e3f4a5b6_add_comprehensive_indexes.py` file run karegi aur saare 15 indexes database mein create kar degi.

---

## Summary — Ek Line Mein

> Index ek **shortcut** hai database ke liye — bina index ke poori table scan hoti hai, index ke saath seedha data milta hai. Composite index tab banao jab **do columns saath** query mein aayein.

---

*Evalyn Project — Database Indexing Reference*
