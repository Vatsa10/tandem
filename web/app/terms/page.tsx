import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Tandem",
};

const UPDATED = "August 5, 2026";
const OPERATOR = "Abhijeet Kadam";
const CONTACT_EMAIL = "kadamabhi1881@gmail.com";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={UPDATED}>
      <p>
        <strong>This is a draft template, not legal advice.</strong>{" "}
        It describes what Tandem actually does today, but has not been reviewed
        by a lawyer. Have it reviewed for your jurisdiction before relying
        on it with real users.
      </p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of Tandem
        (the &quot;Service&quot;), operated by {OPERATOR} (&quot;we&quot;,
        &quot;us&quot;, &quot;our&quot;). By creating an account or using
        the Service, you agree to these Terms. If you don&apos;t agree,
        don&apos;t use the Service.
      </p>

      <h2>1. What Tandem does</h2>
      <p>
        Tandem is an AI meeting assistant. When you paste a meeting link or
        connect a calendar, Tandem joins your Zoom, Google Meet, or Microsoft
        Teams call as a visible bot participant, records audio and/or
        video, and produces a speaker-attributed transcript. You can then
        ask questions about what was discussed, both after the meeting and
        live during it (by addressing &quot;@Tandem&quot; in the meeting
        chat). Recordings are hosted by our meeting-bot provider (Recall.ai);
        we store transcript text, metadata, and vector embeddings of the
        transcript for search.
      </p>

      <h2>2. Recording consent — your responsibility</h2>
      <p>
        Laws on recording conversations vary by state and country, and some
        jurisdictions (for example California, Illinois, and several
        countries in the EU) require the consent of <em>every</em>{" "}
        participant before a call can be recorded, not just the person who
        invited Tandem.
      </p>
      <p>
        <strong>
          You are solely responsible for notifying meeting participants
          that Tandem is recording and obtaining any consent required by
          applicable law
        </strong>{" "}
        before you invite Tandem into a call. Tandem joins visibly, under a
        display name that identifies it as a recording assistant, but it
        does not itself verify or collect participant consent. Do not use
        Tandem to record a call where you do not have the right to do so.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You need an account to use Tandem. You&apos;re responsible for
        activity under your account and for keeping your login credentials
        secure. You must be at least 18 years old, or the age of majority
        in your jurisdiction, to create an account.
      </p>

      <h2>4. Calendar and third-party connections</h2>
      <p>
        If you connect a Google or Microsoft calendar, you authorize Tandem
        to read your calendar events and, if you enable auto-record, to
        automatically join meetings from that calendar. You can disconnect
        a calendar connection at any time, which stops future access but
        does not retroactively delete data already collected.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use Tandem to:</p>
      <ul>
        <li>
          Record a meeting without the consent required by the laws that
          apply to that meeting or its participants;
        </li>
        <li>
          Access, or attempt to access, meetings, transcripts, or accounts
          that aren&apos;t yours;
        </li>
        <li>
          Interfere with or disrupt the Service, including attempting to
          bypass rate limits or authentication;
        </li>
        <li>
          Use the Service for any unlawful purpose, or to harass, defame,
          or violate the rights of others.
        </li>
      </ul>

      <h2>6. Your content</h2>
      <p>
        You retain ownership of your meeting recordings, transcripts, and
        any content you submit. You grant us a license to store, process,
        and transmit that content solely to provide and improve the
        Service (for example, generating transcripts, summaries, and chat
        answers). We don&apos;t sell your meeting content, and we don&apos;t
        use it to train third-party foundation models beyond the ordinary
        processing needed to answer your questions (see the{" "}
        <a href="/privacy">Privacy Policy</a> for how sub-processors handle
        data).
      </p>

      <h2>7. Deletion</h2>
      <p>
        Deleting a meeting from Tandem removes its transcript, vector
        embeddings, participant records, and chat history from our
        systems. It also attempts to cancel or remove any in-progress
        recording bot. Recordings hosted by our meeting-bot provider are
        subject to that provider&apos;s own retention and deletion timing,
        which may lag behind deletion in Tandem&apos;s own database.
      </p>

      <h2>8. Service availability</h2>
      <p>
        Tandem is provided on a best-effort basis. Meeting capture, live
        chat, and calendar sync depend on third-party services (meeting
        platforms, calendar providers, our AI providers) that we don&apos;t
        control, and any of them can fail, rate-limit, or change behavior
        without notice. We don&apos;t guarantee that every meeting will be
        successfully captured or transcribed.
      </p>

      <h2>9. Disclaimers and limitation of liability</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any
        kind. AI-generated summaries, action items, and chat answers may be
        inaccurate or incomplete — verify anything important against the
        original transcript. To the maximum extent permitted by law, we are
        not liable for indirect, incidental, or consequential damages
        arising from your use of the Service, including damages arising
        from recording a meeting without proper consent.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms as the Service changes. We&apos;ll update
        the &quot;last updated&quot; date above; continued use after a
        change means you accept the updated Terms.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of India, without regard to
        conflict-of-law principles, and any disputes are subject to the
        exclusive jurisdiction of the courts of India.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
