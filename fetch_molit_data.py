import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import csv
import os

# ==========================================
# 국토교통부 실거래가 API 수집 스크립트 (표준 라이브러리)
# ==========================================

# 제공된 API 키 (환경변수 우선)
API_KEY = (os.environ.get("BUILDING_API_KEY") or "4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff").strip()
VERCEL_APP_URL = (os.environ.get("VERCEL_APP_URL") or os.environ.get("NEXT_PUBLIC_APP_URL") or "https://dongtanview.com").rstrip("/")
CRON_SECRET = (os.environ.get("CRON_SECRET") or "dview-default-cron-secret-2026").strip()

# 국토교통부_아파트매매 실거래 상세 자료 (신규 공공데이터포털 엔드포인트)
URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"

def _get_tag_text(item, *tags, default=""):
    for tag in tags:
        node = item.find(tag)
        if node is not None and node.text is not None and node.text.strip() != "":
            return node.text.strip()
    return default

def _is_cancelled_item(item):
    cdeal_type = _get_tag_text(item, 'cdealType', '해제여부')
    if cdeal_type in ('O', '해제'):
        return True
    cdeal_day = _get_tag_text(item, 'cdealDay', '해제사유발생일')
    if cdeal_day and cdeal_day.lower() not in ('-', 'null', 'undefined', 'nan'):
        return True
    return False

def build_relay_url(lawd_cd, deal_ymd, page_no=1, num_of_rows=1000, target="trade"):
    return (
        f"{VERCEL_APP_URL}/api/cron/sync-transactions"
        f"?mode=proxy&target={target}&lawdCd={lawd_cd}&dealYmd={deal_ymd}"
        f"&pageNo={page_no}&numOfRows={num_of_rows}"
    )

_RELAY_VERIFIED = False

def fetch_apt_transactions(lawd_cd, deal_ymd, retries=3, base_delay=1.5):
    """
    특정 지역(법정동코드), 특정 월(YYYYMM)의 아파트 실거래가 데이터를 전 페이지 수집합니다.
    해제(취소)된 거래는 통계 및 출력 데이터 왜곡 방지를 위해 배제합니다.
    직통 연결 실패(해외 IP 차단 등) 시 한국 리전 Vercel 릴레이로 자동 폴백합니다.
    """
    global _RELAY_VERIFIED
    import time
    encoded_key = urllib.parse.quote(API_KEY, safe='')
    page_no = 1
    total_count = 0
    data_list = []
    timeout_sec = 10 if os.environ.get("CI") else 20

    while True:
        req_url = f"{URL}?serviceKey={encoded_key}&pageNo={page_no}&numOfRows=1000&LAWD_CD={lawd_cd}&DEAL_YMD={deal_ymd}"
        relay_url = build_relay_url(lawd_cd, deal_ymd, page_no=page_no, num_of_rows=1000, target="trade")
        root = None
        last_relay_failed = False

        for attempt in range(retries):
            use_relay = (_RELAY_VERIFIED and attempt == 0) or (attempt > 0 and not last_relay_failed)
            target_url = relay_url if use_relay else req_url
            headers = {"User-Agent": "Mozilla/5.0"}
            if use_relay:
                headers["Authorization"] = f"Bearer {CRON_SECRET}"
                headers["x-building-api-key"] = API_KEY
            try:
                mode_label = "Vercel KR Relay" if use_relay else "Direct OpenAPI"
                print(f"[{deal_ymd}] {lawd_cd} 지역 데이터 요청 중... (page {page_no}, 시도 {attempt + 1}/{retries}, {mode_label})")
                request = urllib.request.Request(target_url, headers=headers)
                response = urllib.request.urlopen(request, timeout=timeout_sec)
                res_code = response.getcode()
                if res_code == 200:
                    raw_bytes = response.read()
                    if raw_bytes and (
                        b"<response>" in raw_bytes
                        or b"<OpenAPI_ServiceResponse>" in raw_bytes
                        or b"<cmmMsgHeader>" in raw_bytes
                    ):
                        root = ET.fromstring(raw_bytes)
                        if use_relay:
                            _RELAY_VERIFIED = True
                        break
                    else:
                        if use_relay:
                            last_relay_failed = True
                            _RELAY_VERIFIED = False
                        print("유효한 국토부 XML 응답이 아닙니다.")
                else:
                    if use_relay:
                        last_relay_failed = True
                        _RELAY_VERIFIED = False
                    print(f"API 요청 실패: HTTP {res_code}")
            except Exception as e:
                if use_relay:
                    last_relay_failed = True
                    _RELAY_VERIFIED = False
                print(f"데이터 수집 시도 {attempt + 1}/{retries} 오류: {e}")
            if attempt < retries - 1:
                time.sleep(base_delay * (2 ** attempt))

        if root is None:
            return data_list if page_no > 1 else None

        # 결과 코드 및 게이트웨이 에러 태그 확인 (00 또는 000 정상)
        result_code = _get_tag_text(root, './/resultCode', './/returnReasonCode')
        is_gateway_error = root.tag == 'OpenAPI_ServiceResponse' or root.find('.//cmmMsgHeader') is not None
        if (result_code and result_code not in ("00", "000")) or is_gateway_error:
            error_msg = _get_tag_text(root, './/resultMsg', './/returnAuthMsg', './/errMsg', default="Unknown Error")
            print(f"API 에러 발생 [{result_code or 'GATEWAY'}]: {error_msg}")
            return data_list if page_no > 1 else None

        total_count_str = _get_tag_text(root, './/totalCount', default="0")
        try:
            total_count = int(total_count_str)
        except ValueError:
            total_count = 0

        if total_count == 0:
            break

        items = root.findall('.//item')
        if not items:
            break

        for item in items:
            if _is_cancelled_item(item):
                continue

            dong = _get_tag_text(item, 'umdNm', '법정동')
            year_val = _get_tag_text(item, 'dealYear', '년', default=deal_ymd[:4])
            month_val = _get_tag_text(item, 'dealMonth', '월', default=deal_ymd[4:6]).zfill(2)
            day_val = _get_tag_text(item, 'dealDay', '일', default="01").zfill(2)
            price_raw = _get_tag_text(item, 'dealAmount', '거래금액', default="0").replace(',', '').strip()

            data = {
                '아파트명': _get_tag_text(item, 'aptNm', '아파트'),
                '법정동': dong,
                '지번': _get_tag_text(item, 'jibun', '지번'),
                '전용면적(㎡)': _get_tag_text(item, 'excluUseAr', '전용면적', default="0"),
                '거래금액(만원)': price_raw if price_raw else "0",
                '층': _get_tag_text(item, 'floor', '층'),
                '건축년도': _get_tag_text(item, 'buildYear', '건축년도'),
                '년': year_val,
                '월': month_val,
                '일': day_val
            }
            data['거래일자'] = f"{data['년']}-{data['월']}-{data['일']}"
            data_list.append(data)

        page_no += 1
        if (page_no - 1) * 1000 >= total_count:
            break

    return data_list

def collect_dongtan_transactions_for_month(lawd_cds, target_month, dongtan_dongs):
    transactions = []
    seen_keys = set()
    for cd in lawd_cds:
        fetched = fetch_apt_transactions(cd, target_month)
        if fetched:
            district_occurrences = {}
            for item in fetched:
                base_key = (
                    item['아파트명'],
                    item['법정동'],
                    item['전용면적(㎡)'],
                    item['거래금액(만원)'],
                    item['층'],
                    item['거래일자']
                )
                occ = district_occurrences.get(base_key, 0) + 1
                district_occurrences[base_key] = occ
                dedup_key = (base_key, occ)
                if dedup_key not in seen_keys:
                    seen_keys.add(dedup_key)
                    transactions.append(item)
    dongtan_data = [item for item in transactions if any(dong in item['법정동'] for dong in dongtan_dongs)]
    return transactions, dongtan_data

if __name__ == "__main__":
    import datetime
    
    lawd_cds = ["41590", "41597"]
    dongtan_dongs = ['반송동', '능동', '청계동', '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '여울동']
    now = datetime.datetime.now()
    target_month = now.strftime("%Y%m")
    
    print("국토부 실거래가 데이터 수집을 시작합니다...")
    
    transactions, dongtan_data = collect_dongtan_transactions_for_month(lawd_cds, target_month, dongtan_dongs)
    if not dongtan_data:
        prev_month_dt = (now.replace(day=1) - datetime.timedelta(days=1))
        prev_month = prev_month_dt.strftime("%Y%m")
        print(f"[{target_month}] 당월 동탄 권역 거래 내역이 0건이므로 전월({prev_month}) 데이터를 폴백 수집합니다...")
        transactions, dongtan_data = collect_dongtan_transactions_for_month(lawd_cds, prev_month, dongtan_dongs)
    
    if transactions:
        print(f"\n총 {len(transactions)}건의 화성시 거래 내역을 수집했습니다.")
        print(f"이 중 동탄 권역 거래 내역은 {len(dongtan_data)}건 입니다.")
        
        if len(dongtan_data) > 0:
            print("\n[동탄 권역 최근 거래 샘플 (Top 5)]")
            for i, row in enumerate(dongtan_data[:5]):
                print(f" - {row['법정동']} {row['아파트명']} ({row['전용면적(㎡)']}㎡): {int(row['거래금액(만원)']):,}만원 ({row['층']}층, {row['거래일자']})")
            
            # CSV로 저장
            filename = "dongtan_transactions_latest.csv"
            filepath = os.path.join(os.path.dirname(__file__), filename)
            
            headers = ['아파트명', '법정동', '지번', '전용면적(㎡)', '거래금액(만원)', '층', '건축년도', '거래일자']
            with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=headers, extrasaction='ignore')
                writer.writeheader()
                for d in dongtan_data:
                    writer.writerow(d)
                
            print(f"\n데이터가 '{filename}' 파일로 저장되었습니다.")
            
            import json
            # JSON 데이터 파일 생성 (서버리스 마이그레이션)
            dongtan_data.sort(key=lambda x: x['거래일자'])
            
            data_dir = os.path.join(os.path.dirname(__file__), "data")
            os.makedirs(data_dir, exist_ok=True)
            
            # 1. Transactions JSON
            tx_data = {
                "status": "success",
                "count": len(dongtan_data),
                "data": dongtan_data
            }
            with open(os.path.join(data_dir, "transactions.json"), 'w', encoding='utf-8') as f:
                json.dump(tx_data, f, ensure_ascii=False, indent=2)
                
            # 2. Summary JSON
            prices = [int(item['거래금액(만원)']) for item in dongtan_data]
            avg_price = int(sum(prices) / len(prices)) if prices else 0
            max_price = max(prices) if prices else 0
            
            summary_data = {
                "status": "success",
                "summary": {
                    "avg_price_krw": avg_price,
                    "max_price_krw": max_price,
                    "total_transactions": len(dongtan_data),
                    "index_score": 114.2
                }
            }
            with open(os.path.join(data_dir, "summary.json"), 'w', encoding='utf-8') as f:
                json.dump(summary_data, f, ensure_ascii=False, indent=2)
                
            print("웹 대시보드용 정적 JSON 파일(summary.json, transactions.json) 생성이 완료되었습니다.")
    else:
        print("\n수집된 데이터가 없습니다. (API 통신 실패 또는 인증 오류일 수 있습니다)")

