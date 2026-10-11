export type Language = 'ko' | 'en'

export const translations = {
  ko: {
    // Header & Navigation
    appTitle: '노션 도서 검색',
    appSubtitle: '노션 서재 등록 위젯 설정기',
    appDescription:
      '노션 서재 데이터베이스와 도서 검색 API를 연결하여 고화질 표지와 함께 간편하게 등록하는 위젯을 생성합니다.',
    themeToggle: '테마 전환',
    langToggle: '언어 전환',

    // Tabs
    tabAll: '전체',
    tabKakao: '카카오',
    tabGoogle: '구글',

    // Search
    searchPlaceholder: '책 제목, 저자, 또는 ISBN으로 검색...',
    searchButton: '검색',
    searchingText: '도서를 검색하고 있습니다...',
    initialSearchTitle: '등록할 책을 검색해보세요',
    initialSearchDesc:
      '위 검색창에 책 제목이나 저자, ISBN을 입력하면 바로 찾을 수 있습니다.',
    noResultsTitle: '검색 결과가 없습니다',
    noResultsDesc: '다른 검색어나 ISBN으로 다시 검색해보세요.',

    // Book Card & Detail
    noCover: '표지 없음',
    unknownAuthor: '저자 미상',
    paperBook: '종이책',
    ebook: 'eBook',
    storeLink: '서점 링크',
    publisher: '출판사',
    publishDate: '출간일',
    isbn: 'ISBN',
    format: '도서 형태',
    description: '책 소개',
    checkingDuplicate: '노션 서재에 이미 등록된 책인지 확인 중...',
    alreadyInLibrary: '이미 서재에 등록된 도서입니다',
    notInLibrary: '서재에 아직 등록되지 않은 책입니다',
    saveSuccess: '노션 서재에 성공적으로 추가되었습니다!',
    viewInNotion: '노션에서 보기',
    closeButton: '닫기',
    addToNotion: '노션 서재에 추가',
    addDuplicateAnyway: '중복으로 추가하기',
    savingToNotion: '노션에 저장 중...',
    templateLabel: '적용할 템플릿',
    templateNone: '템플릿 없음',
    templateDefault: '기본 템플릿 (Default)',

    // Step 1: Notion Setup
    step1Title: 'Step 1: 노션 연동 설정',
    step1Desc:
      '노션 워크스페이스 내부 통합 토큰과 서재 데이터 소스 ID를 입력하세요',
    notionTokenLabel: '노션 내부 통합 시크릿 토큰',
    notionTokenHelp:
      'secret_ 으로 시작하는 토큰. 노션 데이터베이스의 "..." > "연결" 메뉴에서 해당 통합을 추가해야 합니다.',
    createIntegrationLink: '통합 생성하기',
    dataSourceIdLabel: '노션 데이터 소스 ID (또는 데이터베이스 ID / URL)',
    dataSourceIdHelp:
      '노션 API (2025-09-03+)는 데이터 소스 ID를 사용합니다. 데이터베이스 ID나 노션 페이지 URL을 입력하시면 자동으로 데이터 소스 ID를 감지합니다.',
    testNotionButton: '연결 테스트 & 스키마 불러오기',
    testingNotionButton: '연결 테스트 및 스키마 로딩 중...',
    notionConnectedBadge: '연결됨',
    multipleDataSourcesTitle: '여러 데이터 소스 감지됨: 대상 소스를 선택하세요',

    // Step 2: Mapping
    step2Title: 'Step 2: 데이터베이스 컬럼 및 템플릿 매핑',
    step2Desc:
      '도서 정보를 저장할 노션 데이터베이스의 속성 컬럼과 페이지 템플릿을 매핑합니다',
    colTitle: '책 제목 컬럼 (Title)',
    colAuthor: '저자 / 지은이 컬럼',
    colPublisher: '출판사 컬럼',
    colDate: '출간일 컬럼',
    colIsbn: 'ISBN 컬럼 (중복 확인에 사용)',
    colFiles: '표지 이미지 파일 컬럼 (Files & Media)',
    colStatus: '도서 상태 컬럼 (Status / 소장, 대여 등)',
    colStatusDefaultValue: '새 책 추가 시 지정할 상태 값',
    registeredOptionsNotice: '노션 속성에 등록된 선택지:',
    colFormat: '도서 형태 컬럼 (종이책/전자책 구분)',
    colFormatEbookValue: '전자책(eBook) 매핑 값',
    colFormatPaperValue: '종이책(Paper) 매핑 값',
    customValuePlaceholder: '옵션값 직접 입력...',
    formatChangeNotice: '클릭하여 전자책/종이책을 변경할 수 있습니다',
    colTemplate: '페이지 생성 시 적용할 기본 템플릿',
    coverNotice:
      '* 고화질 표지는 페이지 상단 커버(Cover)와 표지(Files) 컬럼에 모두 깔끔하게 저장됩니다.',
    noneOption: '(선택 안 함 / 미저장)',

    // Step 3: Search APIs
    step3Title: 'Step 3: 도서 검색 API 키 설정',
    step3Desc: '카카오(다음) 및 Google Books 검색 API 키를 설정합니다',
    kakaoKeyLabel: '카카오 REST API 키 (국내 도서)',
    kakaoKeyBadge: '필수 권장',
    getKakaoKeyLink: '카카오 키 발급',
    testButton: '테스트',
    testingButton: '테스트 중...',
    googleKeyLabel: 'Google Books API 키 (해외 도서 / 원서)',
    googleKeyBadge: '글로벌 커버리지',
    getGoogleKeyLink: '구글 키 발급',

    // Step 4: Preferences
    step4Title: 'Step 4: 위젯 환경설정',
    step4Desc:
      '임베드 위젯의 기본 테마, 검색 탭, 이미지 프록시 설정을 지정합니다',
    defaultThemeLabel: '기본 테마',
    themeAuto: '자동 (시스템 / 브라우저 테마 반영)',
    themeLight: '라이트 모드',
    themeDark: '다크 모드',
    defaultTabLabel: '기본 검색 탭',
    tabAllLabel: '전체 (카카오 + 구글 통합)',
    tabKakaoLabel: '카카오 도서만',
    tabGoogleLabel: '구글 도서만',
    proxyImageLabel:
      '노션 뷰 표지 이미지 프록시 적용 (권장: 노션 뷰에서 썸네일이 바로 표시되도록 보장)',
    insertBodyImageLabel:
      '페이지 본문에 도서 표지 이미지 블록 추가 (템플릿 미사용 시 카드 미리보기 지원)',
    rememberSettings: '이 브라우저에 설정 기억하기 (다음 방문 시 자동 로드)',

    // Step 5: Output
    step5Title: 'Step 5: 노션 임베드 URL',
    step5Desc: '아래 생성된 URL을 복사하여 노션 서재 페이지에 임베드하세요',
    copyUrlButton: 'URL 복사',
    copiedButton: '복사 완료!',
    embedInstructionsTitle: '노션 페이지에 임베드하는 방법:',
    embedStep1:
      '노션 독서 페이지에서 빈 줄에 /embed (또는 /임베드)를 입력하고 엔터를 누릅니다.',
    embedStep2: '복사한 URL을 붙여넣고 [링크 임베드] 버튼을 누릅니다.',
    embedStep3:
      '위젯의 가로 및 세로 크기를 원하는 서재 레이아웃에 맞춰 조절하세요!',
    incompleteConfigNotice:
      '위에서 노션 시크릿 토큰, 데이터 소스 ID, 제목 컬럼을 설정하면 임베드 URL이 생성됩니다.',

    // Step 6: Live Preview
    step6Title: '실시간 위젯 미리보기',
    step6Desc:
      '노션에 삽입하기 전 검색과 저장이 잘 동작하는지 실시간으로 테스트해보세요.'
  },
  en: {
    appTitle: 'Notion Book Search',
    appSubtitle: 'Widget Setup & Generator',
    appDescription:
      'Connect your Notion bookshelf database and search APIs to generate a private embed widget with high-definition book covers.',
    themeToggle: 'Toggle Theme',
    langToggle: 'Toggle Language',

    tabAll: 'All',
    tabKakao: 'Kakao',
    tabGoogle: 'Google',

    searchPlaceholder: 'Search by title, author, or ISBN...',
    searchButton: 'Search',
    searchingText: 'Searching books across providers...',
    initialSearchTitle: 'Search for your next book',
    initialSearchDesc:
      'Type a book title, author, or ISBN above to find and add it to your Notion library.',
    noResultsTitle: 'No books found',
    noResultsDesc: 'Try searching with another keyword or ISBN.',

    noCover: 'No Cover',
    unknownAuthor: 'Unknown Author',
    paperBook: 'Paper Book',
    ebook: 'eBook',
    storeLink: 'Store Link',
    publisher: 'Publisher',
    publishDate: 'Date',
    isbn: 'ISBN',
    format: 'Format',
    description: 'Description',
    checkingDuplicate: 'Checking if already in your Notion library...',
    alreadyInLibrary: 'Already in your Notion library',
    notInLibrary: 'Not in your library yet',
    saveSuccess: 'Successfully added to your Notion library!',
    viewInNotion: 'View in Notion',
    closeButton: 'Close',
    addToNotion: 'Add to Notion',
    addDuplicateAnyway: 'Add Again (Duplicate)',
    savingToNotion: 'Saving to Notion...',
    templateLabel: 'Apply Template',
    templateNone: 'No Template',
    templateDefault: 'Default Template',

    step1Title: 'Step 1: Notion Integration Setup',
    step1Desc:
      'Connect your Notion workspace integration and bookshelf Data Source ID',
    notionTokenLabel: 'Notion Internal Integration Secret Token',
    notionTokenHelp:
      'Token starting with secret_. Remember to invite this integration in Notion via "..." > "Connect to".',
    createIntegrationLink: 'Create Integration',
    dataSourceIdLabel: 'Notion Data Source ID (or Database ID / URL)',
    dataSourceIdHelp:
      'Notion API (2025-09-03+) uses Data Source IDs. If you provide a Database ID or Notion URL, we automatically resolve its Data Source ID.',
    testNotionButton: 'Test Connection & Fetch Properties',
    testingNotionButton: 'Testing connection & loading schema...',
    notionConnectedBadge: 'Connected',
    multipleDataSourcesTitle:
      'Multiple data sources detected: Select target source',

    step2Title: 'Step 2: Database Column & Template Mapping',
    step2Desc:
      'Map book attributes and select page templates for your Notion database',
    colTitle: 'Book Title Column (Title)',
    colAuthor: 'Author Column',
    colPublisher: 'Publisher Column',
    colDate: 'Publish Date Column',
    colIsbn: 'ISBN Column (Used for Duplicate Detection)',
    colFiles: 'Cover Image Column (Files & Media)',
    colStatus: 'Status Column (Ownership / Reading status)',
    colStatusDefaultValue: 'Default Status for new books',
    registeredOptionsNotice: 'Options defined in Notion property:',
    colFormat: 'Book Format Column (eBook / Paper Book)',
    colFormatEbookValue: 'Option Value for eBook',
    colFormatPaperValue: 'Option Value for Paper Book',
    customValuePlaceholder: 'Custom option value...',
    formatChangeNotice: 'Click to switch between eBook and Paper book',
    colTemplate: 'Default Database Template to Apply',
    coverNotice:
      '* High-res covers are automatically attached to both Page Cover and Files properties.',
    noneOption: "(None / Don't save)",

    step3Title: 'Step 3: Book Search API Keys',
    step3Desc: 'Configure Kakao (Daum) and Google Books search API keys',
    kakaoKeyLabel: 'Kakao REST API Key (Domestic Books)',
    kakaoKeyBadge: 'Recommended',
    getKakaoKeyLink: 'Get Kakao Key',
    testButton: 'Test',
    testingButton: 'Testing...',
    googleKeyLabel: 'Google Books API Key (International Books)',
    googleKeyBadge: 'Global Coverage',
    getGoogleKeyLink: 'Get Google Key',

    step4Title: 'Step 4: Widget Preferences',
    step4Desc:
      'Customize default theme, initial search tab, and image proxy settings',
    defaultThemeLabel: 'Default Theme',
    themeAuto: 'Auto (Match System / Browser)',
    themeLight: 'Light Mode',
    themeDark: 'Dark Mode',
    defaultTabLabel: 'Default Search Tab',
    tabAllLabel: 'All (Kakao + Google Combined)',
    tabKakaoLabel: 'Kakao Books Only',
    tabGoogleLabel: 'Google Books Only',
    proxyImageLabel:
      'Proxy book covers via Cloudflare Pages (Recommended: ensures Notion view displays image thumbnails)',
    insertBodyImageLabel:
      'Insert book cover image block in page body (provides card preview when not using templates)',
    rememberSettings:
      'Remember settings in this browser (Stored in localStorage for future updates)',

    step5Title: 'Step 5: Your Notion Embed URL',
    step5Desc:
      'Copy the generated URL and embed it into your Notion reading tracker page',
    copyUrlButton: 'Copy URL',
    copiedButton: 'Copied!',
    embedInstructionsTitle: 'How to embed in your Notion page:',
    embedStep1: 'In your Notion page, type /embed and press Enter.',
    embedStep2: 'Paste the copied URL and click Embed link.',
    embedStep3: 'Resize the widget freely to fit your reading tracker layout!',
    incompleteConfigNotice:
      'Enter your Notion Secret, Data Source ID, and Title column above to generate your embed link.',

    step6Title: 'Live Interactive Preview',
    step6Desc:
      'Test searching and saving books right here before adding to Notion.'
  }
} as const
