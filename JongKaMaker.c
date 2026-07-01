#include <windows.h>

const char* jongKaArray[] = {
"⠁", "⠂", "⠃", "⠄", "⠅", "⠆", "⠇", "⠈", "⠉", "⠊", "⠋", "⠌", "⠍", "⠎", "⠏", 
"⠐", "⠑", "⠒", "⠓", "⠔", "⠕", "⠖", "⠗", "⠘", "⠙", "⠚", "⠛", "⠜", "⠝", "⠞", "⠟", 
"⠠", "⠡", "⠢", "⠣", "⠤", "⠥", "⠦", "⠧", "⠨", "⠩", "⠪", "⠫", "⠬", "⠭", "⠮", "⠯", 
"⠰", "⠱", "⠲", "⠳", "⠴", "⠵", "⠶", "⠷", "⠸", "⠹", "⠺", "⠻", "⠼", "⠽", "⠾", "⠿", 
"⡀", "⡁", "⡂", "⡃", "⡄", "⡅", "⡆", "⡇", "⡈", "⡉", "⡊", "⡋", "⡌", "⡍", "⡎", "⡏", 
"⡐", "⡑", "⡒", "⡓", "⡔", "⡕", "⡖", "⡗", "⡘", "⡙", "⡚", "⡛", "⡜", "⡝", "⡞", "⡟", 
"⡠", "⡡", "⡢", "⡣", "⡤", "⡥", "⡦", "⡧", "⡨", "⡩", "⡪", "⡫", "⡬", "⡭", "⡮", "⡯", 
"⡰", "⡱", "⡲", "⡳", "⡴", "⡵", "⡶", "⡷", "⡸", "⡹", "⡺", "⡻", "⡼", "⡽", "⡾", "⡿", 
"⢀", "⢁", "⢂", "⢃", "⢄", "⢅", "⢆", "⢇", "⢈", "⢉", "⢊", "⢋", "⢌", "⢍", "⢎", "⢏", 
"⢐", "⢑", "⢒", "⢓", "⢔", "⢕", "⢖", "⢗", "⢘", "⢙", "⢚", "⢛", "⢜", "⢝", "⢞", "⢟", 
"⢠", "⢡", "⢢", "⢣", "⢤", "⢥", "⢦", "⢧", "⢨", "⢩", "⢪", "⢫", "⢬", "⢭", "⢮", "⢯", 
"⢰", "⢱", "⢲", "⢳", "⢴", "⢵", "⢶", "⢷", "⢸", "⢹", "⢺", "⢻", "⢼", "⢽", "⢾", "⢿", 
"⣀", "⣁", "⣂", "⣃", "⣄", "⣅", "⣆", "⣇", "⣈", "⣉", "⣊", "⣋", "⣌", "⣍", "⣎", "⣏", 
"⣐", "⣑", "⣒", "⣓", "⣔", "⣕", "⣖", "⣗", "⣘", "⣙", "⣚", "⣛", "⣜", "⣝", "⣞", "⣟", 
"⣠", "⣡", "⣢", "⣣", "⣤", "⣥", "⣦", "⣧", "⣨", "⣩", "⣪", "⣫", "⣬", "⣭", "⣮", "⣯", 
"⣰", "⣱", "⣲", "⣳", "⣴", "⣵", "⣶", "⣷", "⣸", "⣹", "⣺", "⣻", "⣼", "⣽", "⣾", "⣿"
};
const char* jongKaHeader[] = {" "};

enum {
	IDC_OUTPUT = 1001,
	IDC_GENERATE = 1002,
	IDC_COPY = 1003,
	OUTPUT_CHARS = 120,
	LINE_WIDTH = 32,
	MAX_OUTPUT_BYTES = 1024,
	MAX_OUTPUT_WCHARS = 512
};

static HWND g_output;
static HWND g_generateButton;
static HWND g_copyButton;
static HFONT g_outputFont;
static DWORD g_randomState;

static void zeroMemory(void* value, SIZE_T size) {
	volatile BYTE* current = (volatile BYTE*)value;

	while(size-- > 0) {
		*current++ = 0;
	}
}

static size_t stringLength(const char* value) {
	size_t length = 0;

	while(value[length] != '\0') {
		length++;
	}

	return length;
}

static void copyBytes(char* destination, const char* source, size_t length) {
	for(size_t i = 0; i < length; i++) {
		destination[i] = source[i];
	}
}

static DWORD nextRandom(void) {
	g_randomState = g_randomState * 1103515245u + 12345u;
	return g_randomState;
}

static void generateOutputUtf8(char* buffer, size_t bufferSize) {
	size_t used = 0;
	int jongKaArraySize = sizeof(jongKaArray) / sizeof(jongKaArray[0]);

	if(bufferSize == 0) return;
	buffer[0] = '\0';

	for(int i = 0; i < OUTPUT_CHARS; i++) {
		const char* c = (i == 9) ? jongKaHeader[0] : jongKaArray[nextRandom() % jongKaArraySize];
		size_t cLen = stringLength(c);
		if(used + cLen + 3 >= bufferSize) break;

		copyBytes(buffer + used, c, cLen);
		used += cLen;

		if(i != 0 && (i + 1) % LINE_WIDTH == 0) {
			buffer[used++] = '\r';
			buffer[used++] = '\n';
		}
	}

	buffer[used] = '\0';
}

static void setNewOutput(void) {
	char utf8[MAX_OUTPUT_BYTES];
	wchar_t wide[MAX_OUTPUT_WCHARS];
	int converted;

	generateOutputUtf8(utf8, sizeof(utf8));
	converted = MultiByteToWideChar(CP_UTF8, 0, utf8, -1, wide, MAX_OUTPUT_WCHARS);
	if(converted > 0) {
		SetWindowTextW(g_output, wide);
	}
}

static void copyOutputToClipboard(HWND hwnd) {
	int length = GetWindowTextLengthW(g_output);
	HGLOBAL memory;
	wchar_t* text;

	if(length <= 0) return;

	memory = GlobalAlloc(GMEM_MOVEABLE, (length + 1) * sizeof(wchar_t));
	if(memory == NULL) return;

	text = (wchar_t*)GlobalLock(memory);
	if(text == NULL) {
		GlobalFree(memory);
		return;
	}

	GetWindowTextW(g_output, text, length + 1);
	GlobalUnlock(memory);

	if(OpenClipboard(hwnd)) {
		EmptyClipboard();
		SetClipboardData(CF_UNICODETEXT, memory);
		CloseClipboard();
	} else {
		GlobalFree(memory);
	}
}

static void layoutControls(HWND hwnd) {
	RECT rect;
	int width;
	int height;
	int padding = 16;
	int buttonWidth = 110;
	int buttonHeight = 34;
	int buttonGap = 8;
	int buttonTop;

	GetClientRect(hwnd, &rect);
	width = rect.right - rect.left;
	height = rect.bottom - rect.top;
	buttonTop = height - padding - buttonHeight;

	MoveWindow(g_output, padding, padding, width - padding * 2,
		buttonTop - padding - buttonGap, TRUE);
	MoveWindow(g_generateButton, padding, buttonTop, buttonWidth, buttonHeight, TRUE);
	MoveWindow(g_copyButton, padding + buttonWidth + buttonGap, buttonTop,
		buttonWidth, buttonHeight, TRUE);
}

static LRESULT CALLBACK windowProc(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam) {
	switch(message) {
	case WM_CREATE: {
		HFONT defaultFont = (HFONT)GetStockObject(DEFAULT_GUI_FONT);
		g_outputFont = CreateFontW(28, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
			DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
			CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI Symbol");

		g_output = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"",
			WS_CHILD | WS_VISIBLE | WS_VSCROLL | ES_MULTILINE | ES_READONLY | ES_AUTOVSCROLL,
			0, 0, 0, 0, hwnd, (HMENU)IDC_OUTPUT, NULL, NULL);
		g_generateButton = CreateWindowExW(0, L"BUTTON", L"Generate",
			WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
			0, 0, 0, 0, hwnd, (HMENU)IDC_GENERATE, NULL, NULL);
		g_copyButton = CreateWindowExW(0, L"BUTTON", L"Copy",
			WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
			0, 0, 0, 0, hwnd, (HMENU)IDC_COPY, NULL, NULL);

		SendMessageW(g_output, WM_SETFONT, (WPARAM)(g_outputFont ? g_outputFont : defaultFont), TRUE);
		SendMessageW(g_output, EM_SETMARGINS, EC_LEFTMARGIN | EC_RIGHTMARGIN, MAKELPARAM(12, 12));
		SendMessageW(g_generateButton, WM_SETFONT, (WPARAM)defaultFont, TRUE);
		SendMessageW(g_copyButton, WM_SETFONT, (WPARAM)defaultFont, TRUE);

		layoutControls(hwnd);
		return 0;
	}
	case WM_SIZE:
		layoutControls(hwnd);
		return 0;
	case WM_GETMINMAXINFO: {
		MINMAXINFO* info = (MINMAXINFO*)lParam;
		info->ptMinTrackSize.x = 360;
		info->ptMinTrackSize.y = 240;
		return 0;
	}
	case WM_COMMAND:
		switch(LOWORD(wParam)) {
		case IDC_GENERATE:
			setNewOutput();
			return 0;
		case IDC_COPY:
			copyOutputToClipboard(hwnd);
			return 0;
		default:
			break;
		}
		break;
	case WM_DESTROY:
		if(g_outputFont != NULL) DeleteObject(g_outputFont);
		PostQuitMessage(0);
		return 0;
	default:
		break;
	}

	return DefWindowProcW(hwnd, message, wParam, lParam);
}

static int runApplication(HINSTANCE instance, int showCommand) {
	const wchar_t className[] = L"JongKaMakerWindow";
	WNDCLASSW wc;
	HWND hwnd;
	MSG message;

	zeroMemory(&wc, sizeof(wc));
	wc.lpfnWndProc = windowProc;
	wc.hInstance = instance;
	wc.lpszClassName = className;
	wc.hCursor = LoadCursor(NULL, IDC_ARROW);
	wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);

	if(!RegisterClassW(&wc)) {
		MessageBoxW(NULL, L"Failed to register window class.", L"JongKaMaker", MB_ICONERROR);
		return 1;
	}

	hwnd = CreateWindowExW(0, className, L"JongKaMaker",
		WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, CW_USEDEFAULT, 560, 360,
		NULL, NULL, instance, NULL);
	if(hwnd == NULL) {
		MessageBoxW(NULL, L"Failed to create window.", L"JongKaMaker", MB_ICONERROR);
		return 1;
	}

	ShowWindow(hwnd, showCommand);
	UpdateWindow(hwnd);

	while(GetMessageW(&message, NULL, 0, 0) > 0) {
		TranslateMessage(&message);
		DispatchMessageW(&message);
	}

	return (int)message.wParam;
}

void WINAPI AppEntry(void) {
	STARTUPINFOW startupInfo;
	LARGE_INTEGER counter;
	int showCommand = SW_SHOWDEFAULT;

	zeroMemory(&startupInfo, sizeof(startupInfo));
	startupInfo.cb = sizeof(startupInfo);
	GetStartupInfoW(&startupInfo);
	if((startupInfo.dwFlags & STARTF_USESHOWWINDOW) != 0) {
		showCommand = startupInfo.wShowWindow;
	}

	QueryPerformanceCounter(&counter);
	g_randomState = GetTickCount() ^ counter.LowPart ^ (DWORD)(UINT_PTR)GetModuleHandleW(NULL);
	if(g_randomState == 0) {
		g_randomState = 1;
	}

	ExitProcess((UINT)runApplication(GetModuleHandleW(NULL), showCommand));
}
