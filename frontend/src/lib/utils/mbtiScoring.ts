import { MbtiApartmentProfile, MbtiType, QuizQuestion, QuizScores } from '@/types/mbti';
import { MBTI_PROFILES } from '@/lib/data/mbtiData';

export interface QuizOptionDetailed {
  label: string;
  subtext?: string;
  dimension: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
  points: number;
  bonusDimension?: 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';
  bonusPoints?: number;
}

export interface QuizQuestionDetailed {
  id: number;
  theme: string;
  title: string;
  description?: string;
  optionA: QuizOptionDetailed;
  optionB: QuizOptionDetailed;
}

export const QUIZ_QUESTIONS: QuizQuestionDetailed[] = [
  {
    id: 1,
    theme: '퇴근 후 일상',
    title: '기다리던 금요일 저녁 또는 주말, 당신이 가장 행복을 느끼는 시간은?',
    description: '나의 에너지 충전 방식과 라이프스타일 동선 진단',
    optionA: {
      label: '집 앞 백화점, 핫플레이스 카페거리, 맛집에서 활기찬 약속 즐기기',
      subtext: '도심의 활기와 이웃과의 교류 속에서 에너지를 채워요',
      dimension: 'E',
      points: 1,
    },
    optionB: {
      label: '조용한 단지 산책로 걷기, 집 안에서 넷플릭스 보며 온전한 재충전',
      subtext: '방해받지 않는 독립된 나만의 공간에서 깊은 휴식을 누려요',
      dimension: 'I',
      points: 1,
    },
  },
  {
    id: 2,
    theme: '입지 결정타',
    title: '아파트를 매수할 때 당신의 심장을 가장 강하게 뛰게 하는 요소는?',
    description: '부동산 가치를 바라보는 나의 핵심 판단 기준',
    optionA: {
      label: '초등학교, 대형마트, 학원가! 이미 모든 게 검증된 완성형 인프라',
      subtext: '지금 당장 누릴 수 있는 탄탄하고 안전한 실거주 환경이 우선이에요',
      dimension: 'S',
      points: 1,
    },
    optionB: {
      label: 'GTX-A, 트램 개통, 첨단 밸리! 앞으로 상전벽해할 폭발적인 미래 비전',
      subtext: '앞으로 3~5년 뒤 지역 전체의 위상이 바뀔 거대한 변화를 선점해요',
      dimension: 'N',
      points: 1,
    },
  },
  {
    id: 3,
    theme: '거실 조망',
    title: '매일 아침 눈을 떴을 때, 거실 창밖으로 가장 마주하고 싶은 풍경은?',
    description: '하루의 시작을 여는 공간 뷰 선호도',
    optionA: {
      label: '활기찬 도심의 스카이라인과 도로, 정돈된 시티뷰',
      subtext: '도시의 다이내믹한 템포와 반짝이는 야경이 매력적이에요',
      dimension: 'S',
      points: 1,
    },
    optionB: {
      label: '탁 트인 호수공원의 물결 또는 계절 따라 변하는 푸른 숲세권 힐링뷰',
      subtext: '시원한 개방감과 자연이 주는 편안함이 삶의 질을 높여줘요',
      dimension: 'N',
      points: 1,
    },
  },
  {
    id: 4,
    theme: '구매 결정 논리',
    title: '최종 매매 계약 도장을 찍기 직전, 당신이 가장 집요하게 확인하는 것은?',
    description: '내 집 마련 의사결정의 무게중심',
    optionA: {
      label: '최근 실거래가 추이, 평당가 대비 안전마진, 환금성 및 대장주 가치',
      subtext: '시세 방어력과 객관적 투자 데이터가 증명되어야 안심할 수 있어요',
      dimension: 'T',
      points: 1,
    },
    optionB: {
      label: '단지에 첫발을 디뎠을 때 느껴지는 포근함, 아이들의 웃음소리와 조경의 감성',
      subtext: '우리 가족이 행복하게 머물 수 있는 정서적 안락함이 가장 소중해요',
      dimension: 'F',
      points: 1,
    },
  },
  {
    id: 5,
    theme: '단지 커뮤니티',
    title: '아파트 단지 내 커뮤니티 시설 중 매일 출근도장 찍고 싶은 공간은?',
    description: '단지 내 라이프스타일 및 교류 스타일',
    optionA: {
      label: '골프연습장, 사우나, 피트니스, 스카이라운지 등 이웃과 교류하는 액티브 시설',
      subtext: '활기찬 이웃들과 소통하고 스마트한 편의를 적극적으로 활용해요',
      dimension: 'E',
      points: 1,
      bonusDimension: 'T',
      bonusPoints: 1,
    },
    optionB: {
      label: '숲속 작은 도서관, 티하우스, 정원 벤치, 프라이빗 쉼터',
      subtext: '고즈넉한 자연 속에서 사색하고 따뜻한 정서를 나누는 공간이 좋아요',
      dimension: 'I',
      points: 1,
      bonusDimension: 'F',
      bonusPoints: 1,
    },
  },
  {
    id: 6,
    theme: '교통 & 출퇴근',
    title: '출퇴근 및 주말 외출 시 당신이 가장 선호하는 이동 스타일은?',
    description: '나의 일상 이동 패턴과 시간 관리 성향',
    optionA: {
      label: '지하철역/광역버스 정류장 지하 직결! 비 한 방울 안 맞고 1분 컷',
      subtext: '정해진 시간에 칼같이 이동하는 낭비 없는 스피드와 정시성을 사랑해요',
      dimension: 'J',
      points: 1,
    },
    optionB: {
      label: '대중교통이 조금 멀더라도 자차로 호수나 숲으로 훌쩍 떠나는 자유로운 드라이브',
      subtext: '꽉 막힌 전철 대신 드라이브 코스와 유연한 주말 여가가 더 중요해요',
      dimension: 'P',
      points: 1,
    },
  },
  {
    id: 7,
    theme: '실내 평면 선호',
    title: '살고 싶은 집의 구조와 인테리어를 고른다면?',
    description: '나의 공간 철학과 생활 패턴',
    optionA: {
      label: '팬트리, 드레스룸, 수납동선이 칼같이 구획된 정석 4베이 판상형',
      subtext: '오차 없는 수납공간과 맞통풍으로 깔끔하게 정돈된 실내가 최고예요',
      dimension: 'J',
      points: 1,
    },
    optionB: {
      label: '넓은 테라스, 알파룸, 가변형 벽체로 내 취향껏 꾸미는 유니크한 공간',
      subtext: '규격화된 아파트 대신 개성 있는 공간 연출과 취미 공간을 꿈꿔요',
      dimension: 'P',
      points: 1,
    },
  },
];

export const INITIAL_SCORES: QuizScores = {
  E: 0,
  I: 0,
  S: 0,
  N: 0,
  T: 0,
  F: 0,
  J: 0,
  P: 0,
};

export function calculateScores(answers: Record<number, 'A' | 'B'>): QuizScores {
  const scores: QuizScores = { ...INITIAL_SCORES };

  for (const q of QUIZ_QUESTIONS) {
    const choice = answers[q.id];
    if (!choice) continue;

    const selectedOption = choice === 'A' ? q.optionA : q.optionB;
    scores[selectedOption.dimension] += selectedOption.points;

    if (selectedOption.bonusDimension && selectedOption.bonusPoints) {
      scores[selectedOption.bonusDimension] += selectedOption.bonusPoints;
    }
  }

  return scores;
}

export function calculateMbtiType(scores: QuizScores): MbtiType {
  const eOrI = scores.E >= scores.I ? 'E' : 'I';
  const sOrN = scores.S >= scores.N ? 'S' : 'N';
  const tOrF = scores.T >= scores.F ? 'T' : 'F';
  const jOrP = scores.J >= scores.P ? 'J' : 'P';

  return `${eOrI}${sOrN}${tOrF}${jOrP}` as MbtiType;
}

export function getRecommendedProfile(answers: Record<number, 'A' | 'B'>): MbtiApartmentProfile {
  const scores = calculateScores(answers);
  const type = calculateMbtiType(scores);
  return MBTI_PROFILES[type];
}
