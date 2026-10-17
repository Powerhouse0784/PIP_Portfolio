import Link from "next/link";

export const metadata = { title: "Lost in a dream · Pip’s Dream Workshop" };

export default function NotFound() {
  return (
    <main id="top">
      <div className="wrap">
        <div className="hero">
          <div>
            <p className="label">Oops!</p>
            <h1>This page drifted into a dream… and got lost.</h1>
            <p className="lede">Let’s get you back home, sleepyhead. Pip will keep the lantern lit.</p>
            <Link className="btn" href="/">Go to the front →</Link>
          </div>
          <div className="arch" style={{ maxWidth: 360 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/wave.webp" alt="Pip waving from a cloud" width={600} height={730} />
          </div>
        </div>
      </div>
    </main>
  );
}
