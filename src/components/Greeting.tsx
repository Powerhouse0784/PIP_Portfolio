"use client";
import { useEffect, useState } from "react";

/** Pip remembers returning visitors (localStorage only, nothing leaves the browser). */
export default function Greeting() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    try {
      let n = Number(localStorage.getItem("pip-visits")) || 0;
      if (!sessionStorage.getItem("pip-seen")) { n += 1; localStorage.setItem("pip-visits", String(n)); sessionStorage.setItem("pip-seen", "1"); }
      setMsg(n <= 1 ? "Hello, new friend! First time in the nursery?" : `Welcome back! This is visit #${n}. Pip saved your pillow.`);
    } catch {}
  }, []);
  return msg ? <p className="greet" role="status">{msg}</p> : null;
}
