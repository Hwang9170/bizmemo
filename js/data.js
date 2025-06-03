
// CSV 파일 로드 및 파싱 함수
async function loadCSVData() {
    try {
        // 연락처 데이터 로드
        const contactsResponse = await fetch('data/contacts.csv');
        const contactsText = await contactsResponse.text();
        const contacts = parseCSV(contactsText);
        
        // 메시지 데이터 로드
        const messagesResponse = await fetch('data/messages_detailed_with_alternating_senders.csv');
        const messagesText = await messagesResponse.text();
        const messages = parseCSV(messagesText);
        
        return { contacts, messages };
    } catch (error) {
        console.error('CSV 데이터 로드 중 오류 발생:', error);
        return { contacts: [], messages: [] };
    }
}

// CSV 텍스트를 객체 배열로 파싱하는 함수
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        
        return obj;
    });
}

// CSV 라인을 적절히 파싱하는 함수 (쉼표가 포함된 필드 처리)
function parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    values.push(currentValue);
    return values;
}

// 연락처 데이터 변환 함수
function processContactsData(csvContacts) {
    return csvContacts.map(contact => ({
        id: parseInt(contact.id),
        name: contact.name,
        lastMessage: contact.lastMessage,
        lastActive: contact.lastActive,
        messages: [] // 메시지는 별도로 처리
    }));
}

// 메시지 데이터 변환 및 연락처별 그룹화 함수
function processMessagesData(csvMessages) {
    const messagesByContactId = {};
    
    csvMessages.forEach(message => {
        const contactId = parseInt(message.contact_id);
        
        if (!messagesByContactId[contactId]) {
            messagesByContactId[contactId] = [];
        }
        
 messagesByContactId[contactId].push({
    id: parseInt(message.message_id),
    platform: message.platform,
    content: message.content,
    timestamp: message.timestamp,
    date: message.date,
    sender: message.sender || 'contact', // 추가
    summary: message.summary || null,
    fullText: message.full_text || null,
    isExpanded: false
});

    });
    
    return messagesByContactId;
}

// AI 요약 데이터 생성 함수 (기간 기반)
function generateSummaryData(contactId, messages, startDate, endDate) {
    // 기간 내 메시지 필터링
    const filteredMessages = messages.filter(message => {
        const messageDate = new Date(message.date);
        return messageDate >= startDate && messageDate <= endDate;
    });
    
    // 키워드 추출 (간단한 빈도 기반)
    const keywords = extractKeywords(filteredMessages);
    
    // 할일 추출 (간단한 규칙 기반)
    const todos = extractTodos(filteredMessages);
    
    // 다음 연락 추천일 계산
    const nextContact = calculateNextContactDate(filteredMessages);
    
    return {
        keywords,
        todos,
        nextContact,
        period: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        }
    };
}

// 키워드 추출 함수
function extractKeywords(messages) {
    const wordCounts = {};
    const stopWords = ['안녕하세요', '감사합니다', '부탁드립니다', '확인', '네', '아니요', '그럼', '그리고', '또한'];
    const colorClasses = ['tag-blue', 'tag-green', 'tag-purple', 'tag-orange', 'tag-red', 'tag-teal'];
    
    messages.forEach(message => {
        const text = message.content;
        const words = text.split(/\s+/).filter(word => 
            word.length >= 2 && !stopWords.includes(word)
        );
        
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
    });
    
    // 빈도순 정렬 및 상위 키워드 추출
    return Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry, index) => ({
            text: entry[0],
            color: colorClasses[index % colorClasses.length]
        }));
}

// 할일 추출 함수 (간단 구현)
function extractTodos(messages) {
    const todos = [];
    const todoPatterns = [
        /검토\s*부탁드립니다/,
        /확인\s*부탁드립니다/,
        /전달\s*부탁드립니다/,
        /회신\s*부탁드립니다/,
        /(\d{1,2}월\s*\d{1,2}일|내일|오늘|모레).*(?:미팅|회의|약속)/
    ];
    
    messages.forEach(message => {
        const text = message.content;
        
        todoPatterns.forEach(pattern => {
            if (pattern.test(text)) {
                // 문장 추출 (간단 구현)
                const sentences = text.split(/[.!?]\s+/);
                for (const sentence of sentences) {
                    if (pattern.test(sentence)) {
                        todos.push({
                            text: sentence.trim(),
                            checked: Math.random() > 0.7 // 랜덤하게 일부는 완료 상태로
                        });
                        break;
                    }
                }
            }
        });
    });
    
    // 중복 제거 및 최대 4개로 제한
    return [...new Set(todos.map(todo => JSON.stringify(todo)))]
        .map(str => JSON.parse(str))
        .slice(0, 4);
}

// 다음 연락 추천일 계산 함수
function calculateNextContactDate(messages) {
    if (messages.length === 0) {
        return formatDateForData(new Date());
    }
    
    // 마지막 메시지 날짜 기준으로 계산
    const lastMessageDate = new Date(messages[messages.length - 1].date);
    const contactFrequency = Math.min(7, Math.max(1, Math.floor(14 / Math.sqrt(messages.length))));
    
    const nextDate = new Date(lastMessageDate);
    nextDate.setDate(nextDate.getDate() + contactFrequency);
    
    return formatDateForData(nextDate);
}

// 메시지 검색 함수
function searchMessages(messages, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return messages;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    
    return messages.filter(message => {
        const content = message.content.toLowerCase();
        const fullText = message.fullText ? message.fullText.toLowerCase() : '';
        
        return content.includes(searchTermLower) || fullText.includes(searchTermLower);
    });
}

// 전화 메시지 토글 함수
function togglePhoneMessage(messageElement, message) {
    if (message.platform !== 'phone' || !message.fullText) {
        return;
    }
    
    message.isExpanded = !message.isExpanded;
    
    const contentElement = messageElement.querySelector('.message-content');
    if (contentElement) {
        contentElement.textContent = message.isExpanded ? message.fullText : message.content;
        
        // 확장 상태 표시 아이콘 업데이트
        const expandIcon = messageElement.querySelector('.expand-icon');
        if (expandIcon) {
            expandIcon.textContent = message.isExpanded ? '▼' : '▶';
            expandIcon.title = message.isExpanded ? '접기' : '펼치기';
        }
    }
}

