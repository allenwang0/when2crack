'use client'

import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
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

      <h1 className="text-3xl font-serif font-bold text-foreground mb-4">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
          <p className="text-gray-700 mb-3">
            By accessing and using When2Crack ("the Service"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">2. Description of Service</h2>
          <p className="text-gray-700 mb-3">
            When2Crack is a personal ranking and scheduling tool that helps you organize and prioritize your social connections. The Service allows you to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Create and manage a roster of contacts</li>
            <li>Rank preferences through comparison battles</li>
            <li>Get personalized recommendations</li>
            <li>Share availability schedules</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">3. User Accounts</h2>
          <p className="text-gray-700 mb-3">
            You can use When2Crack in Guest Mode (local storage only) or create an account by signing in with Google. You are responsible for:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Maintaining the security of your account</li>
            <li>All activities that occur under your account</li>
            <li>The accuracy of information you provide</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">4. User Conduct</h2>
          <p className="text-gray-700 mb-3">
            You agree NOT to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Use the Service for any illegal purpose</li>
            <li>Violate any laws or regulations</li>
            <li>Infringe on others' rights or privacy</li>
            <li>Upload malicious code or viruses</li>
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Harass, abuse, or harm others</li>
            <li>Use automated systems to access the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">5. Content Ownership</h2>
          <p className="text-gray-700 mb-3">
            You retain ownership of all content you submit to When2Crack (names, notes, photos, etc.). By using the Service, you grant us a license to store and process this content solely to provide the Service to you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">6. Privacy and Data</h2>
          <p className="text-gray-700 mb-3">
            Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy to understand how we collect, use, and protect your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">7. Disclaimer of Warranties</h2>
          <p className="text-gray-700 mb-3">
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">8. Limitation of Liability</h2>
          <p className="text-gray-700 mb-3">
            To the maximum extent permitted by law, When2Crack shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">9. Termination</h2>
          <p className="text-gray-700 mb-3">
            We reserve the right to suspend or terminate your access to the Service at any time, with or without cause. You may terminate your account at any time by deleting it from the Profile page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">10. Changes to Terms</h2>
          <p className="text-gray-700 mb-3">
            We reserve the right to modify these Terms at any time. We will notify users of material changes by updating the "Last updated" date. Continued use of the Service after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">11. Governing Law</h2>
          <p className="text-gray-700 mb-3">
            These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">12. Contact Information</h2>
          <p className="text-gray-700 mb-3">
            For questions about these Terms, please contact:
          </p>
          <p className="text-gray-700">
            Email: support@when2crack.com (or your contact email)
          </p>
        </section>

        <div className="mt-8 p-4 bg-yellow-50 border-2 border-yellow-bright rounded-2xl">
          <p className="text-sm text-gray-700">
            <strong>Note:</strong> These terms are provided as a starting template. Please consult with a legal professional to ensure compliance with your specific jurisdiction and use case.
          </p>
        </div>
      </div>
    </div>
  )
}
