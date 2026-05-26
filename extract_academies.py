"""
🔧 동탄2 신도시 학원 데이터 추출 스크립트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

소상공인시장진흥공단 상가 CSV에서 동탄 지역의 학원 좌표를 추출합니다.
결과 CSV를 Google Sheets 'academies' 탭에 붙여넣으세요.

📌 시트 이름: academies
📌 헤더(A1:D1): 학원명 | 위도 | 경도 | 분류

사용법: python extract_academies.py
"""
import csv
import os
from collections import Counter

CSV_PATH = r'C:\Users\ocs56\OneDrive\바탕 화면\소상공인시장진흥공단_상가(상권)정보_경기_202512.csv'
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dongtan_academies.csv')

# 화성시 동탄 관련 행정동
DONGTAN_DONGS = ['동탄', '오산', '능동', '송동', '반송동', '산척동', '석우동', '신동',
                 '영천동', '장지동', '청계동', '목동', '여울동']

def is_dongtan(row):
    return '화성' in row[14] and any(kw in row[16] for kw in DONGTAN_DONGS)

def classify(mid, sub):
    """교육 업종 분류 단순화"""
    # 중분류나 소분류 기준분류
    if '학원-입시' in mid or '보습' in sub or '입시' in sub or '외국어' in sub:
         return '학원'
    if '태권도' in sub or '스포츠' in sub or '체육' in mid or '무도' in sub:
         return '체육학원'
    if '피아노' in sub or '음악' in sub or '미술' in sub or '예술' in mid:
         return '예체능학원'
    return mid.strip()

def main():
    rows_out = []
    cat_counter = Counter()

    if not os.path.exists(CSV_PATH):
        print(f"❌ 에러: 원본 CSV 파일을 찾을 수 없습니다: {CSV_PATH}")
        print("공공데이터포털(data.go.kr)에서 '소상공인시장진흥공단_상가(상권)정보_경기' 최신 파일을 다운로드하여 해당 경로에 놓아주세요.")
        return

    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for row in reader:
            if len(row) < 39 or not is_dongtan(row):
                continue
            major = row[4]   # 상권업종대분류명
            mid = row[6]     # 상권업종중분류명
            sub = row[8]     # 상권업종소분류명
            
            # 교육 또는 학문/교육 카테고리 필터링
            if '교육' not in major and '학문' not in major:
                continue
                
            name = row[1]
            lat = row[38]
            lng = row[37]
            if not lat or not lng:
                continue

            category = classify(mid, sub)
            cat_counter[category] += 1
            rows_out.append([name, lat, lng, category])

    # Write output CSV
    with open(OUT_PATH, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['학원명', '위도', '경도', '분류'])
        for r in rows_out:
            writer.writerow(r)

    print("=" * 50)
    print("✅ 추출 완료!")
    print(f"📁 출력 파일: {OUT_PATH}")
    print(f"📊 총 {len(rows_out):,}개 행")
    print()
    print("학원 분류별 분포:")
    for cat, cnt in cat_counter.most_common():
        print(f"  {cat}: {cnt:,}개")
    print()
    print("━" * 50)
    print("📌 Google Sheets에 붙여넣기:")
    print(f"   시트 탭 이름: academies")
    print(f"   헤더(A1~D1): 학원명 | 위도 | 경도 | 분류")
    print("━" * 50)

if __name__ == '__main__':
    main()
