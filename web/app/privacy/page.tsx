import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Tandem",
};

const UPDATED = "August 5, 2026";
const OPERATOR = "Abhijeet Kadam";
const CONTACT_EMAIL = "kadamabhi1881@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        <strong>This is a draft template, not legal advice.</strong>{" "}
        It describes what Tandem&apos;s codebase actually stores and sends
        today, but has not been reviewed by a lawyer for compliance with
        GDPR, CCPA, India&apos;s DPDP Act, or any other regime that may
        apply to your users. Have it reviewed before relying on it with
        real users.
      </p>

      <p>
        This Privacy Policy explains what data Tandem (&quot;the
        Service&quot;), operated by {OPERATOR}, collects, why, and how you
        can control it.
      </p>

      <h2>1. Data we collect</h2>
      <h3>From you, the account holder</h3>
      <ul>
        <li>Account info: email address, authentication identity (via Clerk).</li>
        <li>
          Calendar data, if you connect one: event titles, times, attendees,
          and meeting links from Google Calendar or Microsoft
          Outlook/Graph.
        </li>
        <li>
          Meeting metadata: platform, join/leave timestamps, category
          labels, and any chat messages you send Tandem.
        </li>
      </ul>
      <h3>From meetings Tandem joins</h3>
      <ul>
        <li>Audio and video recordings of the call, hosted by our meeting-bot provider.</li>
        <li>
          A speaker-attributed transcript of the call, including
          participant names as they appear in the meeting platform.
        </li>
        <li>
          Vector embeddings of transcript text, used to power search and
          chat over meeting content.
        </li>
        <li>
          Messages sent to &quot;@Tandem&quot; in the live meeting chat, and
          Tandem&apos;s replies.
        </li>
      </ul>
      <p>
        Meetings routinely include people who are not Tandem account
        holders — other call participants. Their voice, video, and spoken
        words become part of the recording and transcript under the
        account holder&apos;s control, as described in{" "}
        <a href="/terms">Section 2 of the Terms of Service</a>.
      </p>

      <h2>2. How we use data</h2>
      <ul>
        <li>To join meetings, produce transcripts, and generate summaries, action items, and highlights.</li>
        <li>To answer your questions about past meetings, grounded in the transcript (retrieval-augmented generation).</li>
        <li>To auto-schedule recording bots for calendar events, if you enable auto-record.</li>
        <li>To operate, secure, and improve the Service — including rate-limiting abuse and diagnosing errors.</li>
      </ul>
      <p>We do not sell your data, and we do not use your meeting content to train third-party foundation models beyond the ordinary inference calls described below.</p>

      <h2>3. Who we share data with (sub-processors)</h2>
      <p>
        Tandem is built on top of several third-party infrastructure and AI
        providers. Each processes a slice of your data solely to perform
        its function:
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Role</th>
            <th>What it sees</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Recall.ai</td>
            <td>Meeting bot, recording, transcription</td>
            <td>Meeting audio/video, transcript</td>
          </tr>
          <tr>
            <td>Clerk</td>
            <td>Authentication</td>
            <td>Email, login/session data</td>
          </tr>
          <tr>
            <td>Neon</td>
            <td>Primary database (Postgres)</td>
            <td>Account, meeting metadata, transcript text</td>
          </tr>
          <tr>
            <td>Qdrant Cloud</td>
            <td>Vector search database</td>
            <td>Transcript embeddings + excerpt text</td>
          </tr>
          <tr>
            <td>Google (Gemini API)</td>
            <td>Transcript embeddings</td>
            <td>Transcript text, sent per query/chunk</td>
          </tr>
          <tr>
            <td>DeepSeek</td>
            <td>Chat answers, summaries, classification</td>
            <td>Transcript excerpts + your questions</td>
          </tr>
          <tr>
            <td>Google Calendar API / Microsoft Graph</td>
            <td>Calendar sync (if connected)</td>
            <td>Calendar events, attendee lists</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Application hosting</td>
            <td>All request traffic, application logs</td>
          </tr>
        </tbody>
      </table>
      <p>
        We may also disclose data if required by law, or to protect the
        rights, property, or safety of Tandem, our users, or others.
      </p>

      <h2>4. Data retention</h2>
      <p>
        We retain meeting recordings, transcripts, and related data until
        you delete the meeting or your account — there is currently no
        automatic expiry. Deleting a meeting removes its transcript,
        embeddings, participant records, and chat history from our
        database and vector store. Recordings hosted by Recall.ai follow
        that provider&apos;s own retention timing, which may briefly lag
        behind deletion in Tandem.
      </p>

      <h2>5. Your rights</h2>
      <p>You can, at any time:</p>
      <ul>
        <li>Delete any individual meeting from the Meetings page.</li>
        <li>Disconnect a calendar connection to stop future calendar access.</li>
        <li>
          Request a copy of your data, or full account deletion, by
          emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </li>
      </ul>
      <p>
        If you are located in the EU/UK, India, California, or another
        jurisdiction with statutory data-subject rights (access,
        correction, portability, erasure), those requests can also be sent
        to the same address.
      </p>

      <h2>6. Security</h2>
      <p>
        We use industry-standard measures to protect your data, including
        encrypted connections (TLS), signed webhook verification for
        events from our meeting-bot provider, and resource-level
        authorization checks on every account&apos;s data. No system is
        perfectly secure, and we can&apos;t guarantee absolute security.
      </p>

      <h2>7. Children</h2>
      <p>Tandem is not directed at, and should not be used by, anyone under 18.</p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this policy as the Service changes. We&apos;ll
        update the &quot;last updated&quot; date above when we do.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy or your data: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
