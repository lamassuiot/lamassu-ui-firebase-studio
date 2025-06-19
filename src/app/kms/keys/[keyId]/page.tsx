
import KmsKeyDetailsPageClient from './KmsKeyDetailsPageClient';

// Page component (Server Component shell)
export default function KmsKeyDetailsPageContainer() {
  // The client component uses useParams() to get keyId
  return <KmsKeyDetailsPageClient />;
}
