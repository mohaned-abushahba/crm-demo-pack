# Changelog

Append-only log of captured changes. One entry per Update Set or seed script added.

Format:

```
## UPDATE-XXX-short-name (YYYY-MM-DD)
Instance: opmsalescrmstage
What: <what this changes, one or two lines>
Why: <why it was needed>
File: update-sets/UPDATE-XXX-short-name.xml
```

---

<!-- No baseline captured yet. The pre-existing changes on opmsalescrmstage (quote/order
flow fixes, role cleanup, price list date-range fix — see memory) were made in the
"Default" update set and were not cleanly separable from unrelated plugin/platform
noise. Plan: re-apply each known fix deliberately with a named Update Set active, and
log each one here as it's captured. -->
