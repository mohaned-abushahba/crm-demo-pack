/*
 * Golden demo seed loader (format golden-demo-seed/1).
 *
 * Runs server-side in the GLOBAL scope as a Fix Script or Background Script.
 * Reads golden-demo-seed.json from an attachment and upserts every record,
 * keeping the source instance's sys_ids. Safe to re-run: existing records are
 * updated, never duplicated — including a same-run duplicate from a platform
 * Business Rule reacting to an earlier write in this load (an on_conflict:'adopt'
 * table's business-key check is redone live in Phase 2, not trusted from Phase 1;
 * see the comment there).
 *
 * A reference field can point at a table that is itself NOT in the bundle and
 * is not safe to adopt by sys_id, because every instance generates its own rows
 * for it independently (e.g. business_calendar_span: each instance has its own
 * sys_id per fiscal quarter, auto-created by the platform, same calendar/dates).
 * For that case, mark the field in the table spec's `resolve_by`:
 *   "resolve_by": { "period": { "table": "business_calendar_span",
 *                                "match": ["calendar", "start", "end"] } }
 * and put those match values on each bundle record under `_resolve.<field>`,
 * e.g. record._resolve.period = { calendar: "...", start: "...", end: "..." }.
 * The loader looks up the target instance's row by those fields instead of
 * mapping the field through idMap. See docs/CHANGELOG.md, "seed sales quotas"
 * for the table this was built for.
 *
 * Set the constants below, run once with DRY_RUN = true, review the
 * report, then run again with DRY_RUN = false.
 */
var BUNDLE_ATTACHMENT = '';    // sys_attachment.sys_id of golden-demo-seed.json
var PASSWORDS_ATTACHMENT = ''; // optional: sys_attachment.sys_id of passwords.json
var IMAGES_ATTACHMENT = '';    // optional: sys_attachment.sys_id of golden-demo-images.json (Product Visuals images)
var DRY_RUN = true;
var ROLE_CHECK_ONLY = false;   // true: skip the load, only run the role check (Phase 6)
var ON_CONFLICT = 'fail';      // 'fail': stop on a business-key clash. 'insert': load the bundle
                               // record alongside the existing one (test instances with old demo data)

(function () {
    var report = { dry_run: DRY_RUN, on_conflict: ON_CONFLICT, missing_prerequisites: [], conflicts: [], duplicates: [], errors: [], tables: [] };

    function readJson(attachmentId) {
        var stream = new GlideSysAttachment().getContentStream(attachmentId);
        var reader = new GlideTextReader(stream);
        var parts = [], line;
        while ((line = reader.readLine()) !== null) parts.push(line);
        return JSON.parse(parts.join('\n'));
    }

    function getById(table, id) {
        var gr = new GlideRecord(table);
        gr.addQuery('sys_id', id);
        gr.setLimit(1);
        gr.query();
        return gr.next() ? gr : null;
    }

    var bundle = readJson(BUNDLE_ATTACHMENT);
    if (bundle.format !== 'golden-demo-seed/1') throw 'Unsupported bundle format: ' + bundle.format;

    // Phase 6: compare each user's active roles with the source instance's. Inherited
    // roles aren't in the bundle; Business Rules rebuild them from group memberships and
    // group roles, so a 'missing' role here means that rebuild didn't happen.
    function checkRoles(idMap) {
        var check = { users_checked: 0, users_matching: 0, users_not_found: [], mismatches: [] };
        var expected = bundle.expected_user_roles || {};
        for (var id in expected) {
            var e = expected[id], userId = idMap[id] || id;
            if (!getById('sys_user', userId)) { check.users_not_found.push(e.user_name); continue; }
            check.users_checked++;
            var actual = {}, gr = new GlideRecord('sys_user_has_role');
            gr.addQuery('user', userId);
            gr.addQuery('state', 'active');
            gr.query();
            while (gr.next()) actual[gr.role.name + ''] = true;
            var want = {};
            e.roles.forEach(function (r) { want[r] = true; });
            var missing = e.roles.filter(function (r) { return !actual[r]; });
            var extra = Object.keys(actual).filter(function (r) { return !want[r]; }).sort();
            if (missing.length || extra.length) check.mismatches.push({ user_name: e.user_name, missing: missing, extra: extra });
            else check.users_matching++;
        }
        return check;
    }

    if (ROLE_CHECK_ONLY) {
        report.stopped = 'role check only: nothing written';
        report.role_check = checkRoles({});
        gs.info(JSON.stringify(report, null, 2));
        return;
    }

    // ---- Phase 0: prerequisites (OOTB / plugin / Update Set records) ----
    bundle.prerequisites.forEach(function (p) {
        var gr = new GlideRecord(p.table);
        if (!gr.isValid() || !gr.get(p.sys_id)) report.missing_prerequisites.push(p);
    });

    // ---- Phase 1: plan. idMap: bundle sys_id -> target sys_id ----
    var inBundle = {}, idMap = {}, plan = [];
    bundle.tables.forEach(function (t) { t.records.forEach(function (r) { inBundle[r.sys_id] = true; }); });

    function mapRef(value) {
        if (!value) return value;
        return String(value).split(',').map(function (v) { return idMap[v] || v; }).join(',');
    }

    // ---- Phase 0.5: resolve_by — fields referencing a table the bundle does not carry
    // (platform/system-generated rows with per-instance sys_ids for the same business
    // entity, e.g. business_calendar_span). Looked up once per distinct bundle value and
    // cached into idMap so mapRef() picks the resolved target sys_id up everywhere else
    // (key matching, write, deferred references) with no further special-casing.
    report.unresolved = [];
    bundle.tables.forEach(function (t) {
        if (!t.resolve_by) return;
        var resolved = {};
        t.records.forEach(function (r) {
            for (var field in t.resolve_by) {
                var val = r[field];
                if (!val || idMap[val] || resolved[val]) continue;
                var spec = t.resolve_by[field];
                var keys = (r._resolve && r._resolve[field]) || {};
                var q = new GlideRecord(spec.table);
                spec.match.forEach(function (k) { q.addQuery(k, keys[k]); });
                q.setLimit(1);
                q.query();
                if (q.next()) {
                    idMap[val] = q.getUniqueValue();
                } else {
                    report.unresolved.push({ table: t.table, field: field, bundle_value: val, match: keys });
                }
                resolved[val] = true;
            }
        });
    });

    bundle.tables.forEach(function (t) {
        var counts = { table: t.table, expected: t.count, insert: 0, update: 0, adopt: 0, conflict: 0 };
        report.tables.push(counts);
        t.records.forEach(function (r) {
            var cls = (r.sys_class_name && new GlideRecord(r.sys_class_name).isValid()) ? r.sys_class_name : t.table;
            var action = 'insert';
            if (getById(t.table, r.sys_id)) {
                action = 'update';
            } else if (t.key.length) {
                var q = new GlideRecord(t.table);
                t.key.forEach(function (k) { q.addQuery(k, t.references[k] ? mapRef(r[k]) : r[k]); });
                q.setLimit(1);
                q.query();
                if (q.next()) {
                    if (t.on_conflict === 'adopt') {
                        action = 'adopt';
                        idMap[r.sys_id] = q.getUniqueValue();
                    } else if (ON_CONFLICT === 'insert') {
                        report.duplicates.push({ table: t.table, sys_id: r.sys_id, key: t.key,
                            existing_sys_id: q.getUniqueValue(), display: q.getDisplayValue() });
                    } else {
                        action = 'conflict';
                        report.conflicts.push({ table: t.table, sys_id: r.sys_id, key: t.key,
                            existing_sys_id: q.getUniqueValue(), display: q.getDisplayValue() });
                    }
                }
            }
            counts[action]++;
            plan.push({ t: t, r: r, cls: cls, action: action });
        });
    });

    if (DRY_RUN || report.missing_prerequisites.length || report.conflicts.length || report.unresolved.length) {
        report.stopped = DRY_RUN ? 'dry run: nothing written'
            : 'stopped before writing: resolve missing_prerequisites / conflicts / unresolved first';
        gs.info(JSON.stringify(report, null, 2));
        return;
    }

    // ---- Phase 2: write. Forward references and insert_as fields are deferred. ----
    //
    // An 'adopt' table's conflict check CANNOT be trusted from Phase 1: Phase 1 queries the
    // target for every table before Phase 2 has written anything, but a parent insert in
    // Phase 2 (e.g. the Opportunity) can fire a platform Business Rule that inserts its own
    // child row (e.g. team member / associated contact) the instant it runs — before this
    // loader gets to the child table's own records. Phase 1 would see "no existing row yet"
    // and plan 'insert', and writing that plan verbatim creates a second row alongside the
    // BR's. So any table marked on_conflict:'adopt' gets its business-key check REDONE here,
    // live, right before the write — by which point a same-run BR side effect already exists
    // on the target and is adopted instead of duplicated. (See docs/CHANGELOG.md, "loader:
    // fix Phase 1/Phase 2 adopt race" and the Business Rules named in that entry.)
    var written = {}, deferred = [];
    plan.forEach(function (p) {
        if (p.action === 'adopt') { written[p.r.sys_id] = true; return; }
        if (p.action === 'insert' && p.t.on_conflict === 'adopt' && p.t.key.length) {
            var recheck = new GlideRecord(p.t.table);
            p.t.key.forEach(function (k) { recheck.addQuery(k, p.t.references[k] ? mapRef(p.r[k]) : p.r[k]); });
            recheck.setLimit(1);
            recheck.query();
            if (recheck.next()) {
                // A Business Rule triggered by an earlier write in this same run (most likely
                // the parent record on the previous table) already created this row.
                idMap[p.r.sys_id] = recheck.getUniqueValue();
                written[p.r.sys_id] = true;
                p.action = 'adopt';
                report.tables.forEach(function (c) { if (c.table === p.t.table) { c.insert--; c.adopt = (c.adopt || 0) + 1; } });
                return;
            }
        }
        var gr;
        if (p.action === 'update') {
            gr = getById(p.cls, p.r.sys_id) || getById(p.t.table, p.r.sys_id);
        } else {
            gr = new GlideRecord(p.cls);
            gr.initialize();
            gr.setNewGuidValue(p.r.sys_id);
        }
        var later = {};
        for (var f in p.r) {
            if (f === 'sys_id' || f === 'sys_class_name' || !gr.isValidField(f)) continue;
            var v = p.r[f];
            if (p.t.insert_as.hasOwnProperty(f)) {
                later[f] = v;
                if (p.action === 'insert') v = p.t.insert_as[f]; else continue;
            } else if (p.t.references[f] && v) {
                var pending = String(v).split(',').some(function (x) { return inBundle[x] && !written[x] && x !== p.r.sys_id; });
                if (pending || v === p.r.sys_id) { later[f] = v; continue; }
                v = mapRef(v);
            }
            gr.setValue(f, v);
        }
        var ok = p.action === 'insert' ? gr.insert() : gr.update();
        if (!ok) {
            report.errors.push({ table: p.cls, sys_id: p.r.sys_id, action: p.action, message: gr.getLastErrorMessage() });
            return;
        }
        written[p.r.sys_id] = true;
        if (Object.keys(later).length) deferred.push({ p: p, fields: later });
    });

    // ---- Phase 3: deferred references, then final states (e.g. publish) ----
    deferred.forEach(function (d) {
        var gr = getById(d.p.cls, d.p.r.sys_id);
        if (!gr) return;
        for (var f in d.fields) gr.setValue(f, d.p.t.references[f] ? mapRef(d.fields[f]) : d.fields[f]);
        if (!gr.update()) report.errors.push({ table: d.p.cls, sys_id: d.p.r.sys_id, action: 'deferred', message: gr.getLastErrorMessage() });
    });

    // ---- Phase 4: passwords ----
    if (PASSWORDS_ATTACHMENT) {
        var pw = readJson(PASSWORDS_ATTACHMENT), set = 0;
        for (var id in pw) {
            var u = getById('sys_user', idMap[id] || id);
            if (!u) { report.errors.push({ table: 'sys_user', sys_id: id, action: 'password', message: 'user not found' }); continue; }
            u.setDisplayValue('user_password', pw[id].password);
            if (u.update()) set++;
        }
        report.passwords_set = set;
    }

    // ---- Phase 4b: images behind Image-type fields (e.g. Product Visuals) ----
    // Attachments aren't part of the record data, so they ship in golden-demo-images.json.
    // The platform assigns the new attachment's sys_id, so the field is re-pointed at it.
    // (The source stores them against table 'ZZ_YY' + table; a server script can't change
    // sys_attachment.table_name, so here they sit against the plain table. The field renders the same.)
    // Re-runs skip a field whose attachment already exists with the same size.
    if (IMAGES_ATTACHMENT) {
        var imgs = readJson(IMAGES_ATTACHMENT).images, loaded = 0, unchanged = 0;
        imgs.forEach(function (i) {
            var rec = getById(i.table, idMap[i.record] || i.record);
            if (!rec) { report.errors.push({ table: i.table, sys_id: i.record, action: 'image', message: 'record not found' }); return; }
            var cur = rec.getValue(i.field), att = cur ? getById('sys_attachment', cur) : null;
            if (att && String(att.getValue('size_bytes')) === String(i.size)) { unchanged++; return; }
            var newId = new GlideSysAttachment().writeBase64(rec, i.file_name, i.content_type, i.base64);
            var na = newId ? getById('sys_attachment', newId) : null;
            if (!na) { report.errors.push({ table: i.table, sys_id: i.record, action: 'image', message: 'attachment write failed: ' + i.field }); return; }
            rec.setValue(i.field, newId);
            if (rec.update()) loaded++;
            else report.errors.push({ table: i.table, sys_id: i.record, action: 'image', message: rec.getLastErrorMessage() });
        });
        report.images = { expected: imgs.length, loaded: loaded, unchanged: unchanged };
    }

    // ---- Phase 5: verify every bundle record exists on the target ----
    bundle.tables.forEach(function (t, i) {
        var present = 0;
        t.records.forEach(function (r) { if (getById(t.table, idMap[r.sys_id] || r.sys_id)) present++; });
        report.tables[i].present_after_load = present;
    });
    report.role_check = checkRoles(idMap);
    report.stopped = 'complete';
    gs.info(JSON.stringify(report, null, 2));
})();
