import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ReelRank",
  description: "ReelRank privacy policy — how we handle your data.",
};

export default function PrivacyPage() {
  const lastUpdated = "March 24, 2026";

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white transition-colors mb-12"
        >
          &larr; Back to ReelRank
        </Link>

        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-text-secondary mb-12">
          Last updated: {lastUpdated}
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed text-text-secondary">
          <Section title="1. Overview">
            ReelRank (&quot;we,&quot; &quot;our,&quot; or &quot;the App&quot;) is
            a movie ranking and group decision-making platform. This Privacy
            Policy explains what information we collect, how we use it, and what
            choices you have. By using ReelRank, you agree to the practices
            described here.
          </Section>

          <Section title="2. Information We Collect">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong className="text-text">Account information</strong> —
                when you sign up via email, Google, or Apple, we collect your
                email address and display name. If you sign in with Google or
                Apple, we receive only the information you authorize those
                providers to share.
              </li>
              <li>
                <strong className="text-text">Movie preferences</strong> — your
                swipe choices, rankings, watched list, watchlist, and ratings are
                stored to power your personal rankings and group sessions.
              </li>
              <li>
                <strong className="text-text">Group session data</strong> — when
                you create or join a group room, we store the movies submitted,
                votes, and results for that session.
              </li>
              <li>
                <strong className="text-text">Usage data</strong> — we may
                collect anonymous analytics such as page views and feature usage
                to improve the App. This data is not linked to your identity.
              </li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>To provide and maintain the App&apos;s core features (rankings, group mode, watchlist).</li>
              <li>To authenticate your account and keep it secure.</li>
              <li>To compute and display your Beli ranking scores.</li>
              <li>To facilitate real-time group sessions.</li>
              <li>To improve and optimize the App experience.</li>
            </ul>
          </Section>

          <Section title="4. Third-Party Services">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong className="text-text">Firebase (Google)</strong> — we use
                Firebase Authentication for sign-in and Cloud Firestore for data
                storage. See{" "}
                <a
                  href="https://firebase.google.com/support/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Firebase&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong className="text-text">TMDB</strong> — movie metadata and
                poster images are sourced from The Movie Database (TMDB). We do
                not share your personal data with TMDB.
              </li>
              <li>
                <strong className="text-text">Ably</strong> — real-time
                messaging for group sessions. Ably processes session tokens but
                does not receive your personal information.
              </li>
              <li>
                <strong className="text-text">Vercel</strong> — the App is
                hosted on Vercel. See{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Vercel&apos;s Privacy Policy
                </a>
                .
              </li>
            </ul>
          </Section>

          <Section title="5. Data Sharing">
            We do <strong className="text-text">not</strong> sell, rent, or
            trade your personal information to third parties. We only share data
            as described in Section 4 (third-party services necessary for App
            operation).
          </Section>

          <Section title="6. Data Retention">
            Your account data is retained as long as your account is active. You
            can request deletion of your account and associated data at any time
            by contacting us. Group session data may be retained in anonymized
            form for analytics.
          </Section>

          <Section title="7. Security">
            We use industry-standard security measures including encrypted
            connections (HTTPS), Firebase security rules, and server-side
            authentication tokens. However, no method of electronic transmission
            or storage is 100% secure.
          </Section>

          <Section title="8. Children's Privacy">
            ReelRank is not directed at children under 13. We do not knowingly
            collect personal information from children under 13. If you believe a
            child has provided us with personal data, please contact us and we
            will delete it.
          </Section>

          <Section title="9. Your Choices">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>You can update your display name and email in your profile settings.</li>
              <li>You can delete your watch history and rankings.</li>
              <li>You can request full account deletion by contacting us.</li>
              <li>
                You can revoke Google or Apple sign-in access from your
                respective account settings at any time.
              </li>
            </ul>
          </Section>

          <Section title="10. Changes to This Policy">
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated &quot;Last updated&quot; date. Continued
            use of the App after changes constitutes acceptance of the revised
            policy.
          </Section>

          <Section title="11. Contact Us">
            If you have questions about this Privacy Policy or wish to request
            data deletion, contact us at:{" "}
            <a
              href="mailto:seantomany@gmail.com"
              className="text-accent hover:underline"
            >
              seantomany@gmail.com
            </a>
          </Section>
        </div>

        <div className="mt-16 pt-8 border-t border-border text-center text-xs text-text-secondary">
          &copy; {new Date().getFullYear()} ReelRank. All rights reserved.
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-text mb-3">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
