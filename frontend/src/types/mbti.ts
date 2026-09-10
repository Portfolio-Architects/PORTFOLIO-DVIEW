/**
 * MBTI Housing Recommendation & Viral Quiz Domain Types
 */

export type MbtiDimension = 'EI' | 'SN' | 'TF' | 'JP';

export type MbtiType =
  | 'ENTJ' | 'INTJ' | 'ENTP' | 'INTP'
  | 'ESTJ' | 'ISTJ' | 'ESTP' | 'ISTP'
  | 'ENFJ' | 'INFJ' | 'ENFP' | 'INFP'
  | 'ESFJ' | 'ISFJ' | 'ESFP' | 'ISFP';

export type MbtiGroup = 'NT' | 'NF' | 'SJ' | 'SP';

export type SingleDimension = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P';

export interface QuizOption {
  label: string;
  subtext?: string;
  dimension: SingleDimension;
  points: number;
}

export interface QuizQuestion {
  id: number;
  theme: string;
  title: string;
  description?: string;
  optionA: QuizOption;
  optionB: QuizOption;
}

export interface QuizScores {
  E: number;
  I: number;
  S: number;
  N: number;
  T: number;
  F: number;
  J: number;
  P: number;
}

export interface RadarMetrics {
  transit: number;     // 교통/기동력 (0~100)
  nature: number;      // 자연/힐링 (0~100)
  education: number;   // 교육/학군 (0~100)
  commerce: number;    // 상권/슬세권 (0~100)
  futureValue: number; // 미래가치/환금성 (0~100)
}

export interface MbtiApartmentProfile {
  type: MbtiType;
  group: MbtiGroup;
  alias: string;
  tagline: string;
  aptName: string;
  dong: string;
  zoneId: string;
  tags: string[];
  recommendationReason: string;
  lifestyleFit: string[];
  radar: RadarMetrics;
  bannerGradient: string;
  accentColor?: string;
  txKey?: string;
}

export interface TemperamentInfo {
  group: MbtiGroup;
  label: string;
  name: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
}
