import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import { MBTIContainer } from '@/components/mbti/MBTIContainer';
import { ALL_MBTI_TYPES, getProfileByType, MBTI_PROFILES } from '@/lib/data/mbtiData';

interface PageProps {
  params: Promise<{ type: string }>;
}

export async function generateStaticParams() {
  return ALL_MBTI_TYPES.map((type) => ({
    type,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const mbtiUpper = resolved.type.toUpperCase();
  const profile = getProfileByType(mbtiUpper);

  if (!profile) {
    return {
      title: '동탄 아파트 MBTI 주거 성향 테스트 | D-VIEW',
      description: '나의 라이프스타일에 딱 맞는 동탄 아파트를 찾아보세요.',
    };
  }

  const ogImageUrl = `https://dongtanview.com/api/og?type=mbti&mbti=${profile.type}&apt=${encodeURIComponent(profile.aptName)}&dong=${encodeURIComponent(profile.dong)}`;

  return {
    title: `[${profile.type}] ${profile.alias} — ${profile.aptName} | D-VIEW 주거 MBTI`,
    description: profile.recommendationReason,
    alternates: {
      canonical: `https://dongtanview.com/mbti/${profile.type}`,
    },
    openGraph: {
      title: `[${profile.type}] ${profile.alias} — ${profile.aptName}`,
      description: `나와 영혼의 궁합인 동탄 아파트는 바로 '${profile.aptName}'! 당신의 주거 성향 MBTI를 테스트해보세요.`,
      url: `https://dongtanview.com/mbti/${profile.type}`,
      siteName: 'D-VIEW',
      locale: 'ko_KR',
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `[${profile.type}] ${profile.alias} — ${profile.aptName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `[${profile.type}] ${profile.alias} — ${profile.aptName} | D-VIEW`,
      description: profile.tagline,
      images: [ogImageUrl],
    },
  };
}

export default async function MBTIDirectResultPage({ params }: PageProps) {
  const resolved = await params;
  const mbtiUpper = resolved.type.toUpperCase();
  const profile = getProfileByType(mbtiUpper);

  if (!profile) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-body relative pb-[env(safe-area-inset-bottom)]">
      <LoungeHeader activeTab="mbti" />

      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto py-6 sm:py-8">
        <MBTIContainer initialView="result" initialType={profile.type} />
      </main>

      <MobileDock activeTab="mbti" />
    </div>
  );
}
