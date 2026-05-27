import LoungeDetailClient from '@/components/LoungeDetailClient';
import LoungeModalBackdrop from '@/components/LoungeModalBackdrop';
import { adminDb } from '@/lib/firebaseAdmin';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ModalRoute(props: Props) {
  const params = await props.params;
  const { id } = params;
  let initialPost: Record<string, unknown> | undefined = undefined;

  if (adminDb && id) {
    try {
      const docSnap = await adminDb.collection('posts').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data) {
          initialPost = {
            id: docSnap.id,
            title: data.title,
            category: data.category,
            content: data.content || '',
            author: data.authorName || '익명',
            likes: data.likes || 0,
            views: data.views || 0,
            authorUid: data.authorUid || null,
            verifiedApartment: data.verifiedApartment || null,
            verificationLevel: data.verificationLevel || null,
            createdAt: data.createdAt ? data.createdAt.toMillis() : null,
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch post in intercepted route', error);
    }
  }

  // To hide the scrolling of the body when modal is open
  return (
    <LoungeModalBackdrop>
      <LoungeDetailClient postId={id} initialPost={initialPost} isModal={true} />
    </LoungeModalBackdrop>
  );
}
