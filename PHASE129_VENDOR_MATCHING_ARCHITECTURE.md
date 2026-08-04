# Phase 129 - Vendor Matching Architecture

## 1. Information Availability from OCR
Based on the current implementation in `gemini-extraction.provider.ts`, the AI Extractor explicitly requests and extracts only the following fields from the raw OCR text:
- `vendorName`
- `gstin`
- `invoiceNumber`
- `invoiceDate`
- `subtotal`, `taxAmount`, `amount` (or `totalAmount`)
- `confidence`

**Currently Ignored:**
Address, Phone, PAN, State, Email, and Bank Details are neither requested in the AI JSON schema nor parsed by the application.

## 2. Persisted Fields
The `InvoiceCandidate` table currently persists:
- `invoiceNumber`
- `date`
- `subtotal`, `tax`, `total`
- `extractedGstin`
- `extractedPan` (defined in schema but not extracted)
- `extractedName`
- `extractedData` (JSON summary)

## 3. Indexed Fields
- **InvoiceCandidate**: None of the extracted identification fields (`extractedGstin`, `extractedName`) are indexed.
- **Vendor Master**: `vendorCode`, `gstin`, and `pan` are indexed with `@unique` constraints.
- **Vendor Name**: The `name` field in the Vendor master is **NOT indexed**, making any future name-based lookups computationally expensive (full table scans).

## 4. Ignored Fields
The system entirely ignores contact information, addresses, banking details, and line-item specifics when performing matching.

---

## 5. Deterministic Multi-Stage Matching Engine Design

To provide a robust, production-grade matching engine that recovers from OCR errors without sacrificing accounting accuracy, the following deterministic multi-stage pipeline is proposed:

1. **Stage 1: Exact GSTIN Match**
   - Direct lookup of the extracted GSTIN against the Vendor Master.
2. **Stage 2: Normalized GSTIN Match**
   - Strip spaces and hyphens. Correct common OCR alphanumeric substitutions (e.g., `O` $\rightarrow$ `0`, `S` $\rightarrow$ `5`, `I` $\rightarrow$ `1`, `Z` $\rightarrow$ `2`).
3. **Stage 3: Exact Name Match**
   - Direct string comparison of the extracted name against the Vendor Master (case-insensitive).
4. **Stage 4: Normalized Name Match**
   - Strip common corporate suffixes (`PVT LTD`, `LLP`, `M/S`, `TRADERS`, `ENTERPRISES`). Remove punctuation, whitespace, and convert to lowercase.
5. **Stage 5: Alias & Synonym Match**
   - Check against a defined table of known vendor aliases (e.g., "SBD" $\rightarrow$ "SIDDHI BOOK DEPOT").
6. **Stage 6: Fuzzy Name Match (Trigram/Levenshtein)**
   - Evaluate string similarity for typos.
7. **Stage 7: Manual Review**
   - Final fallback if all automated thresholds fail or if multiple vendors tie for the match.

---

## 6. Stage Evaluation & Risk Analysis

| Stage | Confidence | False Positives | False Negatives | Computational Cost | Production Risks |
|---|---|---|---|---|---|
| **1. Exact GSTIN** | 100% | None | High (due to OCR misses) | Very Low (Unique Index) | Zero |
| **2. Normalized GSTIN** | 98% | Very Low | Moderate | Low | Extremely low risk of colliding with another valid GSTIN |
| **3. Exact Name** | 95% | Low | High (M/S prefixes, spaces) | Low (if indexed) | Two distinct businesses with the exact same registered name |
| **4. Normalized Name** | 90% | Moderate | Low | Moderate (computed fields/indexes) | Matching "Raju Traders" and "Raju Enterprises" if stripping is too aggressive |
| **5. Aliases** | 95% | Low | Low | Low | Misconfigured aliases pointing to the wrong ledger |
| **6. Fuzzy Name** | 75-85% | High | Low | High (Levenshtein distance DB scans) | Posting an invoice to a similarly named but incorrect ledger |
| **7. Manual Review**| N/A | None | None | Manual User Time | Operational bottleneck |

---

## 7. Dangerous Case Handling

- **Two vendors with identical names**: Name matching will return >1 result. The system MUST halt and route to Manual Review unless a GSTIN breaks the tie.
- **Two branches with different GSTINs**: If GSTIN is missing, name matching returns multiple. Route to Manual Review to select the correct branch ledger.
- **One vendor with multiple GSTINs**: Grouped under a single Vendor parent or managed as separate branch ledgers.
- **Missing / Partially printed GSTIN**: Stages 1 & 2 fail; pipeline seamlessly falls back to Name matching (Stages 3-6).
- **OCR character substitutions**: Handled by Stage 2 (GSTIN alphanumeric normalization) and Stage 6 (Fuzzy Name matching).
- **Abbreviations / Renamed businesses**: Handled by Stage 5 (Alias mapping).
- **Duplicate vendor masters**: Administrative error. Engine detects multiple identical matches and safely forces Manual Review.
- **Handwritten / Low-confidence OCR**: Extractor flags low confidence. Engine bypasses automatic matching and routes to Manual Review.

---

## 8. ERP Ledger Defense Mechanisms
Enterprise ERP systems (like Tally, SAP) avoid posting to the wrong ledger by:
1. **Canonical Primary Keys**: Relying on strict internal Vendor Codes or Tax IDs (GSTIN/PAN) rather than names.
2. **Ambiguity Rejection**: If a lookup returns multiple records, the automated queue pauses. ERPs never "guess" based on a 51% similarity score without secondary deterministic evidence.
3. **Master Data Management (MDM)**: Maintaining strict uniqueness constraints on Name + City or Tax ID during ledger creation.

---

## 9. Canonical Identities (Must be Unique)
The following fields possess mathematical or legal uniqueness and should serve as **Canonical Identities**:
- **GSTIN** (Unique Tax Identifier)
- **PAN** (Unique Tax Identifier)
- **Vendor Code / Ledger ID** (Unique ERP Identifier)

## 10. Confidence-Only Fields (Never Solely Identificational if Ambiguous)
The following fields can be shared or replicated and should only contribute to the confidence score, **never** independently identifying a vendor if multiple matches exist:
- **Vendor Name** (Can be duplicated across states)
- **Address / State**
- **Phone Number / Email** (Often shared by accounting firms or parent companies)
- **Bank Account Number**

---

## 11. Proposed Confidence Scoring Model

- **Base Threshold for Auto-Match**: `85`
- `+100` : Exact GSTIN Match
- `+95`  : Normalized GSTIN Match
- `+90`  : Exact Name Match
- `+85`  : Normalized Name Match
- `+80`  : Alias Match
- `+70` to `+84` : Fuzzy Name Match (Score equals string similarity percentage)
- `+5`   : Secondary attribute match (e.g., Phone number or Address extracted vs DB)

## 12. Auto-Match Criteria
The system will **automatically match** and proceed to the Voucher Builder ONLY IF:
1. The highest candidate score is **>= 85**.
2. The score delta between the highest candidate and the second-highest candidate is **> 10** (Ensures clear separation).
3. The AI Extraction confidence itself is **>= 70%**.

## 13. Manual Review Criteria (Hard Stops)
The system **MUST stop** for Manual Review IF:
1. The highest candidate score is **< 85**.
2. Multiple vendors tie for the top score (Delta <= 10).
3. The AI Extraction confidence is explicitly flagged as low (`< 70%`).

## 14. Preventing Wrong Ledger Postings on Similar Names
By enforcing a strict `Delta > 10` rule, the engine guarantees that if "Shree Traders" (Score: 90) and "Shree Travels" (Score: 82) are in the database, a fuzzy extraction of "Shree Trdrs" might score 86 and 84 respectively. Because the delta is `2` (which is `<= 10`), the system will safely abort and request manual review, preventing an incorrect ledger posting.

---

## 15. Architectural Comparison

### Current Implementation vs. Proposed Design

| Feature | Current Implementation | Proposed Design |
|---|---|---|
| **Primary Identifier** | GSTIN Only | GSTIN $\rightarrow$ Name $\rightarrow$ Alias $\rightarrow$ Fuzzy |
| **Success Rate (Est)** | ~60% | ~95% |
| **Safety / False Positives** | Extremely Safe (0%) | Extremely Safe (Delta thresholds prevent ambiguity) |

### Strengths & Weaknesses
- **Strengths of Proposed**: Massively increases STP (Straight-Through Processing) automation rates for invoices lacking printed GSTINs. Normalization handles common OCR errors inherently.
- **Weaknesses of Proposed**: Increased computational complexity during name matching. Requires careful tuning of fuzzy thresholds to prevent false positives.

### Migration & Database Impact
- **Indexes Required**: Must add `CREATE INDEX idx_vendor_name ON "Vendor"(name);` (or a trigram index for `pg_trgm` fuzzy matching).
- **Schema Updates**: Introduce a `VendorAlias` table or a `jsonb` array on the `Vendor` model to support Stage 5 Alias matching.
- **Performance Impact**: Negligible for Stages 1-5. Stage 6 (Fuzzy) requires database-level string distance functions (e.g., `SIMILAR TO` or `LEVENSHTEIN`), which adds microsecond latency per invoice but saves minutes of manual human review.
