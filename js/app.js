// 메인 앱 코드
let contacts = [];
let messageData = {};
let summaryData = {};
let selectedContactId = null;
let searchTerm = '';
let summaryPeriod = {
    type: 'recent', // 'recent' 또는 'custom'
    days: 30,       // 최근 N일
    start: null,    // 사용자 지정 시작일
    end: null       // 사용자 지정 종료일
};

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async function() {
    // CSV 데이터 로드
    await initializeData();
    
    // 연락처 목록 렌더링
    renderContactList();
    
    // 검색 기능 이벤트 리스너
    document.getElementById('contact-search').addEventListener('input', function() {
        filterContacts(this.value);
    });
    
    // 메시지 검색 기능 이벤트 리스너
    document.getElementById('message-search').addEventListener('input', function() {
        if (selectedContactId) {
            searchTerm = this.value;
            loadConversation(selectedContactId);
        }
    });
    
    // 메시지 전송 버튼 이벤트 리스너
    document.getElementById('send-message-btn').addEventListener('click', sendNewMessage);
    
    // 메시지 입력 필드 엔터키 이벤트 리스너
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendNewMessage();
        }
    });
    
    // 요약 업데이트 버튼 이벤트 리스너
    document.getElementById('update-summary-btn').addEventListener('click', updateSummary);
    
    // 요약 기간 설정 이벤트 리스너
    document.getElementById('period-type').addEventListener('change', function() {
        const periodType = this.value;
        document.getElementById('recent-days-container').style.display = 
            periodType === 'recent' ? 'block' : 'none';
        document.getElementById('custom-date-container').style.display = 
            periodType === 'custom' ? 'block' : 'none';
        
        summaryPeriod.type = periodType;
        
        if (selectedContactId) {
            updateSummaryPeriod();
            updateSummary();
        }
    });
    
    document.getElementById('recent-days').addEventListener('change', function() {
        summaryPeriod.days = parseInt(this.value);
        if (selectedContactId) {
            updateSummaryPeriod();
            updateSummary();
        }
    });
    
    document.getElementById('start-date').addEventListener('change', function() {
        summaryPeriod.start = this.value;
        if (selectedContactId) {
            updateSummaryPeriod();
            updateSummary();
        }
    });
    
    document.getElementById('end-date').addEventListener('change', function() {
        summaryPeriod.end = this.value;
        if (selectedContactId) {
            updateSummaryPeriod();
            updateSummary();
        }
    });
    
    // 초기 기간 설정
    initializeSummaryPeriod();
});

// 데이터 초기화 함수
async function initializeData() {
    try {
        const { contacts: csvContacts, messages: csvMessages } = await loadCSVData();
        
        contacts = processContactsData(csvContacts);
        messageData = processMessagesData(csvMessages);
        
        // 각 연락처의 마지막 메시지 업데이트
        updateContactsLastMessage();
        
        console.log('데이터 초기화 완료:', contacts.length, '연락처,', 
                    Object.values(messageData).reduce((sum, msgs) => sum + msgs.length, 0), '메시지');
    } catch (error) {
        console.error('데이터 초기화 중 오류 발생:', error);
        alert('데이터 로드 중 오류가 발생했습니다. 페이지를 새로고침해 주세요.');
    }
}

// 연락처의 마지막 메시지 정보 업데이트
function updateContactsLastMessage() {
    contacts.forEach(contact => {
        const contactMessages = messageData[contact.id] || [];
        if (contactMessages.length > 0) {
            const lastMsg = contactMessages[contactMessages.length - 1];
            contact.lastMessage = lastMsg.platform === 'phone' && lastMsg.summary ? 
                                 lastMsg.summary : lastMsg.content;
            contact.lastActive = formatRelativeTime(new Date(lastMsg.timestamp));
        }
    });
}

// 요약 기간 초기화
function initializeSummaryPeriod() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('period-type').value = 'recent';
    document.getElementById('recent-days').value = '30';
    document.getElementById('start-date').value = formatDateForInput(thirtyDaysAgo);
    document.getElementById('end-date').value = formatDateForInput(today);
    
    summaryPeriod = {
        type: 'recent',
        days: 30,
        start: formatDateForData(thirtyDaysAgo),
        end: formatDateForData(today)
    };
    
    // 초기 UI 상태 설정
    document.getElementById('recent-days-container').style.display = 'block';
    document.getElementById('custom-date-container').style.display = 'none';
}

// 요약 기간 업데이트
function updateSummaryPeriod() {
    const today = new Date();
    
    if (summaryPeriod.type === 'recent') {
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - summaryPeriod.days);
        
        summaryPeriod.start = formatDateForData(startDate);
        summaryPeriod.end = formatDateForData(today);
    } else {
        // custom 타입은 이미 input에서 값을 받아옴
    }
}

// 연락처 목록 렌더링 함수
function renderContactList() {
    const contactListElement = document.getElementById('contact-list');
    contactListElement.innerHTML = '';
    
    contacts.forEach(contact => {
        const contactCard = document.createElement('div');
        contactCard.className = 'contact-card';
        contactCard.dataset.id = contact.id;
        
        contactCard.innerHTML = `
            <div class="contact-name">${contact.name}</div>
            <div class="contact-preview">${contact.lastMessage}</div>
            <div class="contact-time">${contact.lastActive}</div>
        `;
        
        contactCard.addEventListener('click', function() {
            selectContact(contact.id);
        });
        
        contactListElement.appendChild(contactCard);
    });
}

// 연락처 검색 필터링 함수
function filterContacts(searchTerm) {
    const contactCards = document.querySelectorAll('.contact-card');
    const searchTermLower = searchTerm.toLowerCase();
    
    contactCards.forEach(card => {
        const contactName = card.querySelector('.contact-name').textContent.toLowerCase();
        if (contactName.includes(searchTermLower)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// 연락처 선택 함수
function selectContact(contactId) {
    selectedContactId = contactId;
    
    // 활성화된 연락처 카드 스타일 변경
    document.querySelectorAll('.contact-card').forEach(card => {
        if (parseInt(card.dataset.id) === contactId) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    
    // 선택된 연락처 이름 표시
    const selectedContact = contacts.find(contact => contact.id === contactId);
    document.getElementById('selected-contact-name').textContent = selectedContact.name;
    
    // 메시지 검색창 초기화
    document.getElementById('message-search').value = '';
    searchTerm = '';
    
    // 대화 내용 로드
    loadConversation(contactId);
    
    // AI 요약 로드
    loadSummary(contactId);
}

// 대화 내용 로드 함수
function loadConversation(contactId) {
    const conversationElement = document.getElementById('conversation-timeline');
    conversationElement.innerHTML = '';
    
    if (!messageData[contactId] || messageData[contactId].length === 0) {
        conversationElement.innerHTML = `
            <div class="empty-state">
                <p>대화 내용이 없습니다</p>
            </div>
        `;
        return;
    }
    
    // 메시지 검색 적용
    let filteredMessages = messageData[contactId];
    if (searchTerm) {
        filteredMessages = searchMessages(filteredMessages, searchTerm);
        
        if (filteredMessages.length === 0) {
            conversationElement.innerHTML = `
                <div class="empty-state">
                    <p>검색 결과가 없습니다</p>
                </div>
            `;
            return;
        }
    }
    
    // 날짜별로 메시지 그룹화
    const messagesByDate = {};
    filteredMessages.forEach(message => {
        if (!messagesByDate[message.date]) {
            messagesByDate[message.date] = [];
        }
        messagesByDate[message.date].push(message);
    });
    
    // 날짜별로 정렬하여 표시
    Object.keys(messagesByDate).sort().forEach(date => {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';
        
        // 날짜 표시
        const dateHeader = document.createElement('div');
        dateHeader.className = 'message-date';
        dateHeader.innerHTML = `<span>${formatDate(date)}</span>`;
        messageGroup.appendChild(dateHeader);
        
        // 해당 날짜의 메시지들 표시
        messagesByDate[date].forEach(message => {
            const messageElement = document.createElement('div');
messageElement.classList.add(
  'message-bubble',
  `message-${message.platform}`,
  message.sender === 'user' ? 'sent-message' : 'received-message'
);
            messageElement.dataset.id = message.id;
            
            // 플랫폼 아이콘 및 이름
            let platformIconSrc = '';
            let platformName = '';
            
            switch (message.platform) {
                case 'slack':
                    platformIconSrc = 'images/slack.svg';
                    platformName = 'Slack';
                    break;
                case 'phone':
                    platformIconSrc = 'images/phone.svg';
                    platformName = '전화';
                    break;
                case 'email':
                    platformIconSrc = 'images/email.svg';
                    platformName = '이메일';
                    break;
                case 'sms':
                    platformIconSrc = 'images/sms.svg';
                    platformName = 'SMS';
                    break;
                case 'kakao':
                    platformIconSrc = 'images/kakao.svg';
                    platformName = '카카오톡';
                    break;
            }
            
            // 전화 메시지인 경우 확장 아이콘 추가
            const expandIcon = message.platform === 'phone' && message.fullText ? 
                `<span class="expand-icon" title="펼치기">▶</span>` : '';
            
            messageElement.innerHTML = `
                <div class="message-platform">
                    <img src="${platformIconSrc}" alt="${platformName}" width="16" height="16"> 
                    ${platformName} ${expandIcon}
                </div>
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            `;
            
            // 전화 메시지 클릭 이벤트 (요약/전체 토글)
            if (message.platform === 'phone' && message.fullText) {
                messageElement.addEventListener('click', function() {
                    togglePhoneMessage(messageElement, message);
                });
            }
            
            messageGroup.appendChild(messageElement);
        });
        
        conversationElement.appendChild(messageGroup);
    });
    
    // 스크롤을 가장 아래로 이동
    conversationElement.scrollTop = conversationElement.scrollHeight;
}

// AI 요약 로드 함수
function loadSummary(contactId) {
    const summaryElement = document.getElementById('summary-content');
    
    if (!messageData[contactId] || messageData[contactId].length === 0) {
        summaryElement.innerHTML = `
            <div class="empty-state">
                <p>요약 정보가 없습니다</p>
            </div>
        `;
        return;
    }
    
    // 기간 내 메시지 필터링을 위한 날짜 객체 생성
    const startDate = new Date(summaryPeriod.start);
    const endDate = new Date(summaryPeriod.end);
    
    // 요약 데이터 생성 또는 캐시에서 가져오기
    const cacheKey = `${contactId}_${summaryPeriod.start}_${summaryPeriod.end}`;
    if (!summaryData[cacheKey]) {
        summaryData[cacheKey] = generateSummaryData(
            contactId, 
            messageData[contactId], 
            startDate, 
            endDate
        );
    }
    
    const summary = summaryData[cacheKey];
    
    // 기간 표시
    const periodDisplay = summaryPeriod.type === 'recent' ? 
        `최근 ${summaryPeriod.days}일` : 
        `${formatDate(summaryPeriod.start)} ~ ${formatDate(summaryPeriod.end)}`;
    
    let keywordsHTML = '';
    summary.keywords.forEach(keyword => {
        keywordsHTML += `<span class="keyword-tag ${keyword.color}">${keyword.text}</span>`;
    });
    
    let todosHTML = '';
    summary.todos.forEach(todo => {
        todosHTML += `
            <li class="todo-item">
                <input type="checkbox" class="todo-checkbox" ${todo.checked ? 'checked' : ''}>
                <span>${todo.text}</span>
            </li>
        `;
    });
    
    summaryElement.innerHTML = `
        <div class="summary-section">
            <h3>요약 기간</h3>
            <div class="period-display">${periodDisplay}</div>
        </div>
        
        <div class="summary-section">
            <h3>주요 키워드</h3>
            <div class="keyword-tags">
                ${keywordsHTML || '<p class="no-data">키워드가 없습니다</p>'}
            </div>
        </div>
        
        <div class="summary-section">
            <h3>약속된 할일 목록</h3>
            <ul class="todo-list">
                ${todosHTML || '<p class="no-data">할일이 없습니다</p>'}
            </ul>
        </div>
        
        <div class="summary-section">
            <h3>다음 연락 추천일</h3>
            <div class="next-contact">
                <div>다음 연락 일정</div>
                <div class="next-contact-date">${formatDate(summary.nextContact)}</div>
            </div>
        </div>
    `;
    
    // 체크박스 이벤트 리스너 추가
    document.querySelectorAll('.todo-checkbox').forEach((checkbox, index) => {
        checkbox.addEventListener('change', function() {
            summaryData[cacheKey].todos[index].checked = this.checked;
        });
    });
}

// 새 메시지 전송 함수
function sendNewMessage() {
    if (!selectedContactId) {
        alert('연락처를 먼저 선택해주세요.');
        return;
    }
    
    const messageInput = document.getElementById('message-input');
    const platformSelect = document.getElementById('platform-select');
    
    const messageContent = messageInput.value.trim();
    if (!messageContent) return;
    
    const platform = platformSelect.value;
    const now = new Date();
    const timestamp = formatDateTime(now);
    const date = formatDateForData(now);
    
    // 새 메시지 객체 생성
    const newMessage = {
        id: Date.now(), // 임시 ID
        platform: platform,
        content: messageContent,
        timestamp: timestamp,
        date: date,
        summary: platform === 'phone' ? messageContent.substring(0, 30) + '...' : '',
        fullText: platform === 'phone' ? messageContent : '',
        isExpanded: false
    };
    
    // 메시지 데이터에 추가
    if (!messageData[selectedContactId]) {
        messageData[selectedContactId] = [];
    }
    messageData[selectedContactId].push(newMessage);
    
    // 선택된 연락처의 마지막 메시지 업데이트
    const contactIndex = contacts.findIndex(contact => contact.id === selectedContactId);
    if (contactIndex !== -1) {
        contacts[contactIndex].lastMessage = platform === 'phone' ? newMessage.summary : messageContent;
        contacts[contactIndex].lastActive = '방금 전';
    }
    
    // 연락처 목록 다시 렌더링
    renderContactList();
    
    // 대화 내용 다시 로드
    loadConversation(selectedContactId);
    
    // 입력 필드 초기화
    messageInput.value = '';
    
    // 요약 캐시 무효화 (새 메시지가 추가되었으므로)
    Object.keys(summaryData).forEach(key => {
        if (key.startsWith(`${selectedContactId}_`)) {
            delete summaryData[key];
        }
    });
}

// AI 요약 업데이트 함수 (시뮬레이션)
function updateSummary() {
    if (!selectedContactId) {
        alert('연락처를 먼저 선택해주세요.');
        return;
    }
    
    // 로딩 표시
    const summaryElement = document.getElementById('summary-content');
    summaryElement.innerHTML = `
        <div class="empty-state">
            <p>AI가 대화 내용을 분석 중입니다...</p>
        </div>
    `;
    
    // 요약 캐시 무효화
    const cacheKey = `${selectedContactId}_${summaryPeriod.start}_${summaryPeriod.end}`;
    delete summaryData[cacheKey];
    
    // 1초 후 업데이트된 요약 표시 (실제로는 API 호출 등이 필요)
    setTimeout(() => {
        loadSummary(selectedContactId);
    }, 1000);
}

// 날짜 포맷팅 함수 (표시용)
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return '오늘';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return '어제';
    } else {
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
}

// 시간 포맷팅 함수
function formatTime(timestampStr) {
    const date = new Date(timestampStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${ampm} ${formattedHours}:${formattedMinutes}`;
}

// 날짜 및 시간 포맷팅 함수 (데이터용)
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 날짜 포맷팅 함수 (데이터용)
function formatDateForData(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 날짜 포맷팅 함수 (input 요소용)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 상대적 시간 포맷팅 함수
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffMin < 1) {
        return '방금 전';
    } else if (diffHour < 1) {
        return `${diffMin}분 전`;
    } else if (diffDay < 1) {
        return `${diffHour}시간 전`;
    } else if (diffDay < 7) {
        return `${diffDay}일 전`;
    } else {
        return formatDateForData(date);
    }
}
