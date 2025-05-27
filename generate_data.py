import csv
import random
from datetime import datetime, timedelta

# 설정
NUM_CONTACTS = 5
MIN_MESSAGES_PER_CONTACT = 50
MAX_MESSAGES_PER_CONTACT = 70
START_DATE = datetime.now() - timedelta(days=180)
END_DATE = datetime.now()

CONTACT_NAMES = {1: "김민준", 2: "이서연", 3: "박지훈", 4: "최수아", 5: "정도윤"}
PLATFORMS = ["slack", "phone", "email", "sms", "kakao"]

# 실제 업무와 유사한 메시지 템플릿
MESSAGE_TEMPLATES = {
    "slack": [
        "안녕하세요, {name}님. {project} 관련하여 문의드립니다.",
        "{document} 초안 검토 요청드립니다. 피드백 부탁드립니다.",
        "다음 주 {day} {time}에 {meeting} 관련 미팅 가능하실까요?",
        "오늘 공유해주신 {report} 잘 받았습니다. 감사합니다.",
        "{task} 진행 상황 업데이트 드립니다. 현재 {progress}% 완료되었습니다.",
        "긴급: {issue} 발생. 확인 후 조치 부탁드립니다.",
        "팀 전체 공지: {announcement}",
        "점심 식사 같이 하실 분? 12시 30분에 로비에서 봬요.",
        "자리 비움: 오후 2시-4시 외근입니다.",
        "{link} 자료 참고 부탁드립니다."
    ],
    "email": [
        ("제목: {project} 주간 보고서 제출", "안녕하세요, {name}님.\n\n{project} 주간 보고서 첨부하여 보내드립니다.\n검토 후 의견 주시면 감사하겠습니다.\n\n감사합니다.\n{sender} 드림"),
        ("제목: {meeting} 회의록 공유", "안녕하세요, {name}님.\n\n오늘 진행된 {meeting} 회의록 공유드립니다.\n결정 사항 및 액션 아이템 확인 부탁드립니다.\n\n첨부: {meeting}_회의록.pdf\n\n감사합니다.\n{sender} 드림"),
        ("제목: {document} 검토 요청", "안녕하세요, {name}님.\n\n{document} 초안 검토 요청드립니다.\n{deadline}까지 피드백 주시면 감사하겠습니다.\n\n첨부: {document}_초안.docx\n\n감사합니다.\n{sender} 드림"),
        ("제목: {proposal} 제안서 발송", "안녕하세요, {name}님.\n\n요청하신 {proposal} 제안서 보내드립니다.\n궁금한 점 있으시면 언제든지 연락주세요.\n\n첨부: {proposal}_제안서.pdf\n\n감사합니다.\n{sender} 드림"),
        ("제목: 휴가 신청 승인 요청", "안녕하세요, 팀장님.\n\n{start_date}부터 {end_date}까지 개인 사정으로 휴가를 신청하고자 합니다.\n업무 인수인계는 {colleague}님께 완료하였습니다.\n승인 부탁드립니다.\n\n감사합니다.\n{sender} 드림")
    ],
    "sms": [
        "[{company}] {name}님, {time}에 {location}에서 뵙겠습니다.",
        "회의 시간 10분 전입니다. 곧 시작하겠습니다.",
        "요청하신 자료 이메일로 발송했습니다. 확인 부탁드립니다.",
        "오늘 미팅 감사합니다. 추후 다시 연락드리겠습니다.",
        "{name}님, 부재중 전화 확인했습니다. 다시 연락드리겠습니다."
    ],
    "kakao": [
        "{name}님~ 오늘 점심 뭐 드실래요? 🍕",
        "넵 확인했습니다! 👍",
        "혹시 지금 잠깐 통화 가능하실까요?",
        "주말 잘 보내세요~ 😄",
        "{project} 관련해서 간단하게 여쭤볼 게 있는데 시간 괜찮으신가요?"
    ],
    "phone": [
        ("회의 일정 조율 건", "네, {name}입니다. 아, {caller}님이시군요. 네, 다음 주 회의 말씀이시죠? 저희 팀은 화요일 오후 2시나 수요일 오전 10시가 괜찮은데, 언제가 편하실까요? 아, 수요일 10시요? 네, 좋습니다. 그럼 수요일 10시에 뵙는 것으로 알겠습니다. 필요한 자료는 미리 보내드리겠습니다. 네, 감사합니다."),
        ("프로젝트 진행 상황 문의", "여보세요? {name}입니다. 네, {caller}님. {project} 진행 상황 궁금하시다고요? 네, 현재 설계 단계는 거의 마무리되었고, 개발팀에서 다음 주부터 본격적으로 개발에 착수할 예정입니다. 예상 완료일은 기존과 동일하게 {due_date}로 보고 있습니다. 네, 특별한 이슈는 아직 없습니다. 또 궁금한 점 있으시면 언제든지 연락주세요. 네, 감사합니다."),
        ("기술 지원 요청", "네, 기술지원팀 {name}입니다. 무엇을 도와드릴까요? 아, {caller}님. {product} 사용 중에 오류가 발생하셨다고요? 어떤 오류 메시지가 나오나요? 아... 잠시만요. 그 오류는 보통 {solution} 하시면 해결됩니다. 한번 시도해보시겠어요? 네, 천천히 해보세요. ... 해결되셨나요? 다행이네요. 다른 문제 없으시면 통화 종료하겠습니다. 네, 감사합니다."),
        ("계약 조건 협의", "네, {name}입니다. {caller}님, 안녕하세요. 계약서 초안 잘 받았습니다. 검토해보니 납품 기한 관련해서 저희 쪽 의견을 조금 반영해주셨으면 하는데요. 현재 제시된 {days}일은 조금 촉박할 것 같아서, {new_days}일로 조정 가능할지 여쭙고 싶습니다. 네... 내부적으로 검토해보시고 다시 연락 주시겠어요? 알겠습니다. 기다리겠습니다. 네, 감사합니다."),
        ("긴급 장애 발생 보고", "{caller}님! 저 {name}인데요. 지금 {service} 서비스에 접속 장애가 발생했습니다. 원인 파악 중인데, 혹시 관련해서 아시는 내용 있으신가요? 아, 네... 일단 저희 쪽에서도 계속 확인해보겠습니다. 특이사항 발견되면 바로 공유드리겠습니다. 네, 부탁드립니다!")
    ]
}

# 전화 메시지 요약 함수 (간단 버전)
def summarize_phone_call(full_text):
    sentences = full_text.split(". ")
    return sentences[0] + "..." if sentences else full_text[:30] + "..."

# 랜덤 날짜 생성 함수
def random_date(start, end):
    return start + timedelta(
        seconds=random.randint(0, int((end - start).total_seconds()))
    )

# CSV 데이터 생성
messages_data = []
message_id_counter = 1

for contact_id in range(1, NUM_CONTACTS + 1):
    num_messages = random.randint(MIN_MESSAGES_PER_CONTACT, MAX_MESSAGES_PER_CONTACT)
    contact_name = CONTACT_NAMES[contact_id]
    
    for _ in range(num_messages):
        platform = random.choice(PLATFORMS)
        timestamp = random_date(START_DATE, END_DATE)
        date_str = timestamp.strftime("%Y-%m-%d")
        timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        
        content = ""
        summary = ""
        full_text = ""
        
        if platform == "email":
            subject, body = random.choice(MESSAGE_TEMPLATES["email"])
            subject = subject.format(project=random.choice(["알파", "베타", "감마"]), 
                                     meeting=random.choice(["주간회의", "TF회의", "고객미팅"]), 
                                     document=random.choice(["기획서", "제안서", "결과보고서"]),
                                     proposal=random.choice(["신규 서비스", "협업 모델", "기술 제휴"]),
                                     start_date=(datetime.now() + timedelta(days=random.randint(7, 30))).strftime("%Y-%m-%d"),
                                     end_date=(datetime.now() + timedelta(days=random.randint(31, 60))).strftime("%Y-%m-%d"),
                                     colleague=random.choice(["박서준", "김지원", "최우식"]),
                                     name=contact_name, 
                                     sender="나")
            body = body.format(project=random.choice(["알파", "베타", "감마"]), 
                               meeting=random.choice(["주간회의", "TF회의", "고객미팅"]), 
                               document=random.choice(["기획서", "제안서", "결과보고서"]),
                               proposal=random.choice(["신규 서비스", "협업 모델", "기술 제휴"]),
                               deadline=(timestamp + timedelta(days=random.randint(1, 5))).strftime("%Y-%m-%d"),
                               start_date=(datetime.now() + timedelta(days=random.randint(7, 30))).strftime("%Y-%m-%d"),
                               end_date=(datetime.now() + timedelta(days=random.randint(31, 60))).strftime("%Y-%m-%d"),
                               colleague=random.choice(["박서준", "김지원", "최우식"]),
                               name=contact_name, 
                               sender="나")
            content = f"제목: {subject}\n\n{body}"
        elif platform == "phone":
            summary_template, full_text_template = random.choice(MESSAGE_TEMPLATES["phone"])
            full_text = full_text_template.format(name=contact_name, 
                                                caller=random.choice(["박팀장", "이대리", "최주임", "거래처 담당자"]),
                                                project=random.choice(["오메가", "델타", "시그마"]),
                                                due_date=(timestamp + timedelta(days=random.randint(30, 90))).strftime("%Y-%m-%d"),
                                                product=random.choice(["BizPlatform", "SmartAnalytics", "CloudSync"]),
                                                solution=random.choice(["재부팅", "캐시 삭제", "최신 버전 업데이트"]),
                                                days=random.randint(10, 20),
                                                new_days=random.randint(21, 30),
                                                service=random.choice(["인증서버", "결제모듈", "DB서버"]))
            summary = summarize_phone_call(full_text)
            content = summary # 초기 표시는 요약본으로
        else:
            template = random.choice(MESSAGE_TEMPLATES[platform])
            content = template.format(name=contact_name, 
                                      project=random.choice(["제우스", "아폴론", "포세이돈"]),
                                      document=random.choice(["요구사항 정의서", "테스트 계획서", "사용자 매뉴얼"]),
                                      day=random.choice(["월요일", "화요일", "수요일", "목요일", "금요일"]),
                                      time=random.choice(["오전 10시", "오후 2시", "오후 4시"]),
                                      meeting=random.choice(["정기 스크럼", "아이데이션 회의", "기술 검토 회의"]),
                                      report=random.choice(["시장 조사 보고서", "경쟁사 분석 자료", "사용자 피드백 결과"]),
                                      task=random.choice(["UI 디자인", "백엔드 개발", "QA 테스트"]),
                                      progress=random.randint(10, 90),
                                      issue=random.choice(["서버 다운", "데이터 유실", "보안 취약점 발견"]),
                                      announcement=random.choice(["사내 워크샵 안내", "복지 제도 변경 공지", "정기 시스템 점검 안내"]),
                                      link=random.choice(["https://example.com/doc1", "https://example.com/guide2", "https://example.com/ref3"]),
                                      company=random.choice(["(주)넥스트", "(주)코어테크", "(주)솔루션랩"]),
                                      location=random.choice(["본사 1층 회의실", "강남역 카페", "온라인 (Zoom)"]))

        messages_data.append({
            "message_id": message_id_counter,
            "contact_id": contact_id,
            "platform": platform,
            "timestamp": timestamp_str,
            "date": date_str,
            "content": content,
            "summary": summary if platform == "phone" else "",
            "full_text": full_text if platform == "phone" else ""
        })
        message_id_counter += 1

# 메시지를 시간 순서대로 정렬
messages_data.sort(key=lambda x: datetime.strptime(x['timestamp'], "%Y-%m-%d %H:%M:%S"))

# CSV 파일로 저장
output_file = "/home/ubuntu/BizMemo/data/messages.csv"

try:
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ["message_id", "contact_id", "platform", "timestamp", "date", "content", "summary", "full_text"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(messages_data)
    print(f"Successfully generated {len(messages_data)} messages to {output_file}")
except Exception as e:
    print(f"Error writing CSV file: {e}")


