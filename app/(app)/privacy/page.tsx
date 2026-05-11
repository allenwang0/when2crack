'use client'

import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        ← Back
      </Button>

      <h1 className="text-3xl font-serif font-bold text-foreground mb-4">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
          <p className="text-gray-700 mb-3">
            When2Crack collects and processes the following information:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Account information (email address when you sign in with Google)</li>
            <li>Roster data (names, scores, notes, and photos you add)</li>
            <li>Battle history and preferences</li>
            <li>Schedule availability</li>
            <li>Usage data and interactions with the app</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">2. How We Use Your Information</h2>
          <p className="text-gray-700 mb-3">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Provide and maintain the When2Crack service</li>
            <li>Rank and recommend connections based on your preferences</li>
            <li>Sync your data across devices (when signed in)</li>
            <li>Improve and personalize your experience</li>
            <li>Communicate with you about the service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">3. Data Storage</h2>
          <p className="text-gray-700 mb-3">
            <strong>Guest Mode:</strong> When using Guest Mode, all your data is stored locally on your device using browser localStorage. This data never leaves your device and is not accessible to us or anyone else.
          </p>
          <p className="text-gray-700 mb-3">
            <strong>Signed-In Mode:</strong> When you sign in with Google, your data is securely stored in our cloud database (Supabase) and encrypted in transit and at rest.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">4. Data Sharing</h2>
          <p className="text-gray-700 mb-3">
            We do not sell, trade, or rent your personal information to third parties. We may share data only in the following circumstances:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>With your explicit consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and safety</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">5. Your Rights (GDPR)</h2>
          <p className="text-gray-700 mb-3">
            Under GDPR and other privacy laws, you have the right to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data (right to be forgotten)</li>
            <li>Export your data (data portability)</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <p className="text-gray-700 mt-3">
            To exercise these rights, you can delete your account from the Profile page or contact us at privacy@when2crack.com (if applicable).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">6. Cookies and Tracking</h2>
          <p className="text-gray-700 mb-3">
            When2Crack uses essential cookies for authentication and local storage for app functionality. We do not use third-party tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">7. Data Security</h2>
          <p className="text-gray-700 mb-3">
            We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, or destruction. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">8. Children's Privacy</h2>
          <p className="text-gray-700 mb-3">
            When2Crack is not intended for users under 18 years of age. We do not knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">9. Changes to This Policy</h2>
          <p className="text-gray-700 mb-3">
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">10. Contact Us</h2>
          <p className="text-gray-700 mb-3">
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <p className="text-gray-700">
            Email: privacy@when2crack.com (or your contact email)
          </p>
        </section>
      </div>
    </div>
  )
}
