import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | ReelRank",
  description: "ReelRank terms of service — rules for using the app.",
};

export default function TermsPage() {
  const lastUpdated = "April 12, 2026";

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
          Terms of Service
        </h1>
        <p className="text-text-secondary mb-12">
          Last updated: {lastUpdated}
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed text-text-secondary">
          <Section title="1. Acceptance of Terms">
            By accessing or using ReelRank (&quot;the App&quot;), you agree to be
            bound by these Terms of Service. If you do not agree, do not use the
            App.
          </Section>

          <Section title="2. Description of Service">
            ReelRank is a movie discovery, ranking, and group decision-making
            platform. Features include solo swipe-based discovery, pairwise
            ranking, watchlist management, group rooms, AI-powered
            recommendations, and social features.
          </Section>

          <Section title="3. Account Registration">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 13 years old to use the App.</li>
              <li>One account per person. Do not create multiple accounts.</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            You agree not to:
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Use the App for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to the App or its systems.</li>
              <li>Interfere with or disrupt the App&apos;s infrastructure.</li>
              <li>Submit abusive, offensive, or harmful content in comments or usernames.</li>
              <li>Use automated scripts, bots, or scrapers to access the App.</li>
              <li>Impersonate another person or entity.</li>
            </ul>
          </Section>

          <Section title="5. Content and Data">
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                Movie metadata and images are provided by{" "}
                <a
                  href="https://www.themoviedb.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  The Movie Database (TMDB)
                </a>
                . TMDB is not affiliated with ReelRank.
              </li>
              <li>
                Your rankings, ratings, comments, and other user-generated content
                remain yours. By submitting content, you grant us a license to
                display it within the App.
              </li>
              <li>
                We reserve the right to remove content that violates these terms.
              </li>
            </ul>
          </Section>

          <Section title="6. Group Sessions">
            When you create or join a group room, other members can see your
            swipe votes and submitted movies for that session. Group results are
            shared among all members. Be respectful in group interactions.
          </Section>

          <Section title="7. AI Features">
            The AI recommendation feature uses your movie history to provide
            personalized suggestions. AI responses are generated and may not
            always be accurate. Do not rely on AI recommendations for anything
            beyond entertainment.
          </Section>

          <Section title="8. Privacy">
            Your use of the App is also governed by our{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </Link>
            , which describes how we collect and use your information.
          </Section>

          <Section title="9. Termination">
            We may suspend or terminate your account at our discretion if you
            violate these terms. You may delete your account at any time by
            contacting us.
          </Section>

          <Section title="10. Disclaimer of Warranties">
            The App is provided &quot;as is&quot; without warranties of any kind.
            We do not guarantee uninterrupted access, error-free operation, or
            the accuracy of any content or recommendations.
          </Section>

          <Section title="11. Limitation of Liability">
            To the maximum extent permitted by law, ReelRank shall not be liable
            for any indirect, incidental, special, or consequential damages
            arising from your use of the App.
          </Section>

          <Section title="12. Changes to These Terms">
            We may update these Terms from time to time. Changes will be posted
            on this page with an updated date. Continued use of the App after
            changes constitutes acceptance.
          </Section>

          <Section title="13. Contact Us">
            If you have questions about these Terms, contact us at:{" "}
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
