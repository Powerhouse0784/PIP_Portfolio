"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Status = "pending" | "approved" | "hidden";
type Row = { id: number; display_name: string; message: string; created_at: string; stars?: number; hearts?: number };
type Counts = Record<Status, number>;
const TAB_LABEL: Record<Status, string> = { pending: "Waiting", approved: "On the wall", hidden: "Hidden" };
const SESSION = "pip-admin";

/** Guestbook moderation. The token lives in this tab's sessionStorage only and travels in an Authorization header, never a URL. */
export default function AdminGuestbook() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Status>("pending");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, hidden: 0 });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const tokenRef = useRef("");

  const call = useCallback(async (method: string, url: string, body?: unknown) => {
    const res = await fetch(url, {
      method, cache: "no-store",
      headers: { Authorization: `Bearer ${tokenRef.current}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
    if (!res.ok) throw Object.assign(new Error(j.error ?? "Something went wrong."), { status: res.status });
    return j;
  }, []);

  const load = useCallback(async (status: Status) => {
    setMsg("");
    try {
      const j = (await call("GET", `/api/admin/guestbook?status=${status}`)) as unknown as { entries: Row[]; counts: Counts };
      setRows(j.entries); setCounts(j.counts); setAuthed(true);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) { setAuthed(false); try { sessionStorage.removeItem(SESSION); } catch {} }
      setMsg(err.message); setRows(null);
    }
  }, [call]);

  useEffect(() => {
    let t = ""; try { t = sessionStorage.getItem(SESSION) ?? ""; } catch {}
    if (t) { tokenRef.current = t; setToken(t); void load("pending"); }
  }, [load]);

  const unlock = (e: FormEvent) => {
    e.preventDefault();
    tokenRef.current = token.trim();
    try { sessionStorage.setItem(SESSION, tokenRef.current); } catch {}
    void load(tab);
  };
  const lock = () => { tokenRef.current = ""; setToken(""); setAuthed(false); setRows(null); try { sessionStorage.removeItem(SESSION); } catch {} };
  const pick = (s: Status) => { setTab(s); setConfirm(null); void load(s); };

  const act = async (id: number, action: "approve" | "hide" | "delete") => {
    setBusy(id); setMsg("");
    try {
      if (action === "delete") await call("DELETE", "/api/admin/guestbook", { id });
      else await call("PATCH", "/api/admin/guestbook", { id, action });
      setConfirm(null);
      await load(tab);
      setMsg(action === "approve" ? "Approved. It’s on the wall." : action === "hide" ? "Hidden from the wall." : "Deleted for good.");
    } catch (e) { setMsg((e as Error).message); }
    setBusy(null);
  };

  return (
    <section className="admin-wrap">
      <div className="wrap">
        <p className="label">Nursery staff only</p>
        <h1 className="admin-h">Guestbook moderation</h1>
        {!authed ? (
          <form className="gform admin-login" onSubmit={unlock}>
            <label htmlFor="atoken">Moderation token</label>
            <input id="atoken" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} required />
            <p className="small">Set GUESTBOOK_ADMIN_TOKEN on the server. The token stays in this tab only.</p>
            <button className="btn" disabled={!token.trim()}>Unlock</button>
            <p role="status" className="small err">{msg}</p>
          </form>
        ) : (
          <>
            <div className="admin-bar">
              <div className="chips" role="tablist" aria-label="Note status">
                {(Object.keys(TAB_LABEL) as Status[]).map((s) => (
                  <button key={s} role="tab" aria-selected={tab === s} className="chip" onClick={() => pick(s)}>{TAB_LABEL[s]} · {counts[s]}</button>
                ))}
              </div>
              <button className="chip" onClick={lock}>Lock</button>
            </div>
            <p role="status" className="small" aria-live="polite">{msg}</p>
            <ul className="admin-list">
              {rows === null && <li className="admin-empty">Loading…</li>}
              {rows?.length === 0 && <li className="admin-empty">Nothing here. The nursery is tidy.</li>}
              {rows?.map((r) => (
                <li key={r.id} className="admin-row">
                  <div>
                    <p><b>{r.display_name}</b> <span className="small">· {new Date(r.created_at).toLocaleString()} · ✦ {r.stars ?? 0} · ♥ {r.hearts ?? 0}</span></p>
                    <p className="admin-msg">{r.message}</p>
                  </div>
                  <div className="admin-acts">
                    {tab !== "approved" && <button className="btn" disabled={busy === r.id} onClick={() => void act(r.id, "approve")}>Approve</button>}
                    {tab !== "hidden" && <button className="chip" disabled={busy === r.id} onClick={() => void act(r.id, "hide")}>Hide</button>}
                    {confirm === r.id
                      ? <button className="chip danger" disabled={busy === r.id} onClick={() => void act(r.id, "delete")}>Really delete?</button>
                      : <button className="chip" onClick={() => setConfirm(r.id)}>Delete</button>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="small"><a href="/">← Back to Pip’s nursery</a></p>
      </div>
    </section>
  );
}
