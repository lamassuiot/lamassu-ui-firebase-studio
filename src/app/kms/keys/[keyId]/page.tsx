
import KmsKeyDetailsPageClient from './KmsKeyDetailsPageClient';

export async function generateStaticParams() {
  // Return an empty array to indicate that no specific paths should be pre-rendered by default.
  // Pages for specific keyId values will be client-side rendered.
  return [];
}

// Page component (Server Component shell)
export default function KmsKeyDetailsPageContainer() {
  // The client component uses useParams() to get keyId
  return <KmsKeyDetailsPageClient />;
}
