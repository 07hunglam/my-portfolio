import os
import re
import psycopg2
import requests
from flask import Flask, jsonify, request

app = Flask(__name__)

# Sentinel: máy vẫn còn được Apple hỗ trợ, chưa biết trần iOS
STILL_SUPPORTED = 99

# Apple không để lộ model trong User-Agent: iPhone 14 và 14 Pro Max gửi chuỗi
# giống hệt nhau. Thứ duy nhất phân biệt được là kích thước màn hình logic cộng
# devicePixelRatio, và bộ đó chỉ thu hẹp xuống một NHÓM máy, không ra một máy.
# Khoá: (cạnh ngắn, cạnh dài, dpr) tính bằng CSS pixel.
IPHONE_SCREENS = {
    (320, 480, 1): ["iPhone (gen 1)", "iPhone 3G", "iPhone 3GS"],
    (320, 480, 2): ["iPhone 4", "iPhone 4s"],
    (320, 568, 2): ["iPhone 5", "iPhone 5s", "iPhone 5c", "iPhone SE (gen 1)"],
    (375, 667, 2): ["iPhone 6", "iPhone 6s", "iPhone 7", "iPhone 8",
                    "iPhone SE (gen 2)", "iPhone SE (gen 3)"],
    (414, 736, 3): ["iPhone 6 Plus", "iPhone 6s Plus", "iPhone 7 Plus", "iPhone 8 Plus"],
    (375, 812, 3): ["iPhone X", "iPhone XS", "iPhone 11 Pro",
                    "iPhone 12 mini", "iPhone 13 mini"],
    (414, 896, 2): ["iPhone XR", "iPhone 11"],
    (414, 896, 3): ["iPhone XS Max", "iPhone 11 Pro Max"],
    (390, 844, 3): ["iPhone 12", "iPhone 12 Pro", "iPhone 13", "iPhone 13 Pro",
                    "iPhone 14", "iPhone 16e"],
    (428, 926, 3): ["iPhone 12 Pro Max", "iPhone 13 Pro Max", "iPhone 14 Plus"],
    (393, 852, 3): ["iPhone 14 Pro", "iPhone 15", "iPhone 15 Pro", "iPhone 16"],
    (430, 932, 3): ["iPhone 14 Pro Max", "iPhone 15 Plus", "iPhone 15 Pro Max",
                    "iPhone 16 Plus"],
    (402, 874, 3): ["iPhone 16 Pro"],
    (440, 956, 3): ["iPhone 16 Pro Max"],
}

IPAD_SCREENS = {
    (768, 1024, 2): ["iPad (gen 5-6)", "iPad Air 2", "iPad mini 4-5", "iPad Pro 9.7\""],
    (810, 1080, 2): ["iPad (gen 7-9)"],
    (820, 1180, 2): ["iPad Air (gen 4-5)", "iPad (gen 10)"],
    (834, 1194, 2): ["iPad Pro 11\""],
    (744, 1133, 2): ["iPad mini (gen 6)"],
    (1024, 1366, 2): ["iPad Pro 12.9\""],
}

# (iOS tối thiểu máy chạy được, iOS tối đa máy còn nhận). Máy không thể chạy bản
# iOS ra đời trước nó, cũng không vượt được bản cuối Apple hỗ trợ - hai đầu này
# cắt bớt ứng viên trong cùng một nhóm màn hình.
IPHONE_IOS_RANGE = {
    "iPhone 5s": (7, 12), "iPhone SE (gen 1)": (9, 15),
    "iPhone 6": (8, 12), "iPhone 6 Plus": (8, 12),
    "iPhone 6s": (9, 15), "iPhone 6s Plus": (9, 15),
    "iPhone 7": (10, 15), "iPhone 7 Plus": (10, 15),
    "iPhone 8": (11, 16), "iPhone 8 Plus": (11, 16),
    "iPhone X": (11, 16),
    "iPhone XR": (12, 18), "iPhone XS": (12, 18), "iPhone XS Max": (12, 18),
    "iPhone 11": (13, STILL_SUPPORTED),
    "iPhone 11 Pro": (13, STILL_SUPPORTED),
    "iPhone 11 Pro Max": (13, STILL_SUPPORTED),
    "iPhone SE (gen 2)": (13, STILL_SUPPORTED),
    "iPhone 12 mini": (14, STILL_SUPPORTED), "iPhone 12": (14, STILL_SUPPORTED),
    "iPhone 12 Pro": (14, STILL_SUPPORTED), "iPhone 12 Pro Max": (14, STILL_SUPPORTED),
    "iPhone 13 mini": (15, STILL_SUPPORTED), "iPhone 13": (15, STILL_SUPPORTED),
    "iPhone 13 Pro": (15, STILL_SUPPORTED), "iPhone 13 Pro Max": (15, STILL_SUPPORTED),
    "iPhone SE (gen 3)": (15, STILL_SUPPORTED),
    "iPhone 14": (16, STILL_SUPPORTED), "iPhone 14 Plus": (16, STILL_SUPPORTED),
    "iPhone 14 Pro": (16, STILL_SUPPORTED), "iPhone 14 Pro Max": (16, STILL_SUPPORTED),
    "iPhone 15": (17, STILL_SUPPORTED), "iPhone 15 Plus": (17, STILL_SUPPORTED),
    "iPhone 15 Pro": (17, STILL_SUPPORTED), "iPhone 15 Pro Max": (17, STILL_SUPPORTED),
    "iPhone 16": (18, STILL_SUPPORTED), "iPhone 16 Plus": (18, STILL_SUPPORTED),
    "iPhone 16e": (18, STILL_SUPPORTED),
    "iPhone 16 Pro": (18, STILL_SUPPORTED), "iPhone 16 Pro Max": (18, STILL_SUPPORTED),
}

# Android nhét thẳng mã máy vào User-Agent nên ra được đúng một máy. Bảng này chỉ
# đổi mã sang tên thương mại; mã lạ vẫn hiện nguyên dạng, không mất thông tin.
ANDROID_MODELS = {
    "SM-S928B": "Galaxy S24 Ultra", "SM-S921B": "Galaxy S24",
    "SM-S926B": "Galaxy S24+", "SM-S918B": "Galaxy S23 Ultra",
    "SM-S911B": "Galaxy S23", "SM-S916B": "Galaxy S23+",
    "SM-S908B": "Galaxy S22 Ultra", "SM-S901B": "Galaxy S22",
    "SM-S906B": "Galaxy S22+", "SM-S938B": "Galaxy S25 Ultra",
    "SM-S931B": "Galaxy S25", "SM-S936B": "Galaxy S25+",
    "SM-F956B": "Galaxy Z Fold6", "SM-F741B": "Galaxy Z Flip6",
    "SM-F946B": "Galaxy Z Fold5", "SM-F731B": "Galaxy Z Flip5",
    "SM-A556E": "Galaxy A55", "SM-A546E": "Galaxy A54",
    "SM-A356E": "Galaxy A35", "SM-A346E": "Galaxy A34",
    "SM-A155F": "Galaxy A15", "SM-A055F": "Galaxy A05",
    "2201123G": "Xiaomi 12", "2210132G": "Xiaomi 13",
    "23013RK75G": "Redmi Note 12", "23090RA98G": "Redmi Note 13",
    "24069RA21G": "Redmi Note 13 Pro", "22101316G": "Redmi Note 12 Pro",
    "CPH2557": "OPPO Reno11 F", "CPH2481": "OPPO Reno10",
    "CPH2531": "OPPO A78", "CPH2477": "OPPO Find X6",
    "V2324": "vivo V30", "V2244": "vivo V29",
    "RMX3771": "realme 11 Pro", "RMX3630": "realme C55",
    "Pixel 8": "Google Pixel 8", "Pixel 8 Pro": "Google Pixel 8 Pro",
    "Pixel 9": "Google Pixel 9", "Pixel 9 Pro": "Google Pixel 9 Pro",
    "Pixel 7": "Google Pixel 7", "Pixel 7 Pro": "Google Pixel 7 Pro",
}


def get_db_connection():
    return psycopg2.connect(os.environ.get('DATABASE_URL'))


# Hàm phân tích chuỗi User-Agent để nhận diện thiết bị/HĐH
def parse_user_agent(ua_string):
    if not ua_string:
        return "Thiết bị ẩn danh", "Trình duyệt ẩn danh"

    ua_lower = ua_string.lower()

    if "android" in ua_lower:
        os_name = "📱 Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "📱 iOS (iPhone/iPad)"
    elif "windows" in ua_lower:
        os_name = "💻 Windows"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        os_name = "💻 macOS"
    elif "linux" in ua_lower:
        os_name = "💻 Linux"
    else:
        os_name = "❓ Thiết bị khác"

    if "chrome" in ua_lower and "safari" in ua_lower and "edge" not in ua_lower:
        browser = "Chrome"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "edge" in ua_lower:
        browser = "Edge"
    else:
        browser = "Trình duyệt chuẩn Web"

    return os_name, browser


def _ios_major(ua_string):
    match = re.search(r'(?:iPhone|CPU) OS (\d+)[_\d]*', ua_string or '')
    return int(match.group(1)) if match else None


def _screen_key(client):
    try:
        width = int(client.get('screen_w') or 0)
        height = int(client.get('screen_h') or 0)
        dpr = round(float(client.get('dpr') or 0))
    except (TypeError, ValueError):
        return None
    if not width or not height or not dpr:
        return None
    # Máy xoay ngang thì iOS đảo hai chiều - chuẩn hoá về (ngắn, dài)
    return (min(width, height), max(width, height), dpr)


def identify_apple_device(ua_string, client):
    key = _screen_key(client)
    is_ipad = "ipad" in (ua_string or '').lower()
    table = IPAD_SCREENS if is_ipad else IPHONE_SCREENS

    if not key or key not in table:
        if key:
            return "iPad" if is_ipad else "iPhone", f"màn {key[0]}×{key[1]}@{key[2]}x chưa có trong bảng"
        return "iPad" if is_ipad else "iPhone", "thiếu dữ liệu màn hình"

    candidates = list(table[key])
    ios_major = _ios_major(ua_string)
    if ios_major and not is_ipad:
        filtered = []
        for name in candidates:
            low, high = IPHONE_IOS_RANGE.get(name, (0, STILL_SUPPORTED))
            if low <= ios_major <= high:
                filtered.append(name)
        if filtered:
            candidates = filtered

    detail = f"màn {key[0]}×{key[1]}@{key[2]}x"
    if len(candidates) == 1:
        return candidates[0], detail
    return " / ".join(candidates), f"{detail}, Apple không lộ model nên không tách được nhóm này"


def identify_android_device(ua_string, client):
    # Client hints cho mã máy sạch; bóc UA chỉ là phương án dự phòng
    raw_model = (client.get('ua_model') or '').strip()

    if not raw_model:
        match = re.search(r'Android [\d.]+;\s*([^;)]+?)(?:\s+Build/|[;)])', ua_string or '')
        if match:
            raw_model = match.group(1).strip()

    if not raw_model or raw_model.lower() in ('k', 'wv', 'mobile'):
        # Chrome 110+ ẩn model trong UA rút gọn, trả về "K"
        return "Android (model bị ẩn)", "bật Client Hints hoặc trình duyệt không gửi model"

    raw_model = re.sub(r'^(SAMSUNG|samsung)\s+', '', raw_model).strip()
    friendly = ANDROID_MODELS.get(raw_model)
    if friendly:
        return friendly, f"mã máy `{raw_model}`"
    return raw_model, "mã máy thô, chưa có trong bảng tên thương mại"


def identify_device(ua_string, client):
    """Trả về (tên thiết bị, ghi chú độ tin cậy)."""
    ua_lower = (ua_string or '').lower()

    if "iphone" in ua_lower or "ipad" in ua_lower:
        return identify_apple_device(ua_string, client)

    if "android" in ua_lower:
        return identify_android_device(ua_string, client)

    platform = (client.get('ua_platform') or '').strip()
    version = (client.get('ua_platform_version') or '').strip()
    if platform:
        label = f"{platform} {version}".strip()
        if platform == "Windows" and version:
            # Chromium trả về version của Windows NT chứ không phải tên thương mại:
            # 13 trở lên là Windows 11, 1-12 là Windows 10, 0 là Windows 7/8.x
            try:
                major = int(version.split('.')[0])
                label = "Windows 11" if major >= 13 else ("Windows 10" if major >= 1 else "Windows 7/8")
            except ValueError:
                pass
        return f"💻 {label}", "máy tính, không có khái niệm model"

    if "windows" in ua_lower:
        return "💻 Máy tính Windows", "máy tính, không có khái niệm model"
    if "macintosh" in ua_lower or "mac os" in ua_lower:
        return "💻 Mac", "Apple không lộ đời máy Mac qua web"

    return "❓ Không xác định", "User-Agent lạ"


def describe_hardware(client):
    bits = []
    key = _screen_key(client)
    if key:
        bits.append(f"{key[0]}×{key[1]} @{key[2]}x")
    if client.get('cores'):
        bits.append(f"{client['cores']} nhân")
    if client.get('memory_gb'):
        bits.append(f"{client['memory_gb']}GB RAM")
    gpu = (client.get('gpu') or '').strip()
    if gpu and gpu.lower() != 'apple gpu':
        bits.append(gpu)
    return " · ".join(bits)


def reverse_geocode(lat, lon):
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"format": "jsonv2", "lat": lat, "lon": lon, "zoom": 16},
            # Nominatim từ chối request không khai báo User-Agent định danh
            headers={"User-Agent": "hunglam.id.vn-analytics/1.0"},
            timeout=4,
        )
        if response.status_code == 200:
            return response.json().get("display_name", "")
    except Exception:
        pass
    return ""


def get_location_from_ip(ip_address, client):
    """Vị trí + mức tin cậy. Toạ độ GPS nếu khách cho phép, không thì tra IP."""
    client_tz = (client.get('timezone') or '').strip()
    precise = client.get('precise') or {}

    # GPS thắng tuyệt đối: sai số vài mét thay vì vài chục km
    if precise.get('lat') is not None and precise.get('lon') is not None:
        lat, lon = precise['lat'], precise['lon']
        accuracy = precise.get('accuracy_m')
        place = reverse_geocode(lat, lon)
        line = f"📍 {place}" if place else f"📍 {lat:.5f}, {lon:.5f}"
        note = f"🎯 GPS ±{accuracy}m (khách đã cho phép)" if accuracy else "🎯 GPS"
        return line, note

    if not ip_address or ip_address in ["127.0.0.1", "::1"]:
        return "📍 Môi trường Local-Dev", ""

    try:
        response = requests.get(
            f"http://ip-api.com/json/{ip_address}",
            params={"fields": "status,country,regionName,city,isp,mobile,proxy,hosting,timezone"},
            timeout=3,
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                city = data.get("city") or "Không rõ TP"
                region = data.get("regionName") or ""
                country = data.get("country") or "Không rõ QG"
                isp = data.get("isp") or ""
                place = f"📍 {city}, {region}, {country}".replace(", ,", ",")

                warnings = []
                if data.get("mobile"):
                    # IP 4G/5G trỏ về trạm gateway của nhà mạng, không phải chỗ khách đứng
                    warnings.append("mạng di động - thành phố nhiều khả năng SAI")
                if data.get("proxy"):
                    warnings.append("VPN/proxy")
                if data.get("hosting"):
                    warnings.append("IP datacenter/bot")
                ip_tz = data.get("timezone") or ""
                if client_tz and ip_tz and client_tz != ip_tz:
                    warnings.append(f"lệch múi giờ: máy `{client_tz}` vs IP `{ip_tz}`")

                note = "⚠️ " + "; ".join(warnings) if warnings else "🌐 Tra theo IP, chuẩn tới mức thành phố"
                if isp:
                    note += f" · ISP: {isp}"
                return place, note
    except Exception:
        pass

    fallback = f"📍 Không rõ vị trí (múi giờ máy: `{client_tz}`)" if client_tz else "📍 Không rõ vị trí"
    return fallback, ""


def async_analytics_pipeline(current_views, environment, ip_address, ua_string, referer, metric_name, client):
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')

    # 1. Phân tích thiết bị và gọi API định vị ngoại mạng
    os_info, browser_info = parse_user_agent(ua_string)
    device_name, device_note = identify_device(ua_string, client)
    hardware_info = describe_hardware(client)
    location_info, location_note = get_location_from_ip(ip_address, client)

    if not referer:
        source_info = "🔗 Truy cập trực tiếp (Direct)"
    elif "facebook.com" in referer or "m.facebook.com" in referer:
        source_info = "🔵 Từ Facebook"
    elif "instagram.com" in referer:
        source_info = "📸 Từ Instagram"
    elif "linkedin.com" in referer:
        source_info = "💼 Từ LinkedIn"
    else:
        source_info = f"🌐 Nguồn khác: `{referer.split('/')[2]}`"

    # 2. GHI LOG VÀO DATABASE
    conn = None
    try:
        # Mở một kết nối database riêng cho luồng ngầm này
        conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
        cursor = conn.cursor()
        # Gộp model vào cột `os` để khỏi phải migrate schema đang chạy
        os_column = f"{os_info} | {device_name}"
        cursor.execute("""
            INSERT INTO visitor_logs (metric_name, views_milestone, ip_address, location, os, browser, referer)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (metric_name, current_views, ip_address, location_info, os_column, browser_info, referer))
        conn.commit()
        cursor.close()
    except Exception as db_err:
        print(f"Failed to save analytics log to database: {str(db_err)}")
    finally:
        if conn: conn.close()

    # 3. BẮN TIN NHẮN VỀ TELEGRAM BOT
    if not bot_token or not chat_id:
        return

    lines = [
        "========= 📊 *ANALYTICS REPORT* =========",
        "",
        f"🚀 *Cột mốc mới:* {current_views} lượt xem!",
        f"🌐 *Môi trường:* `{environment}`",
        "",
        "🕵️ *THÔNG TIN CHI TIẾT (ĐÃ LƯU DB):*",
        f"• Thiết bị: `{device_name}`",
        f"  ↳ _{device_note}_",
    ]
    if hardware_info:
        lines.append(f"• Phần cứng: `{hardware_info}`")
    lines.append(f"• Hệ điều hành: `{os_info}`")
    lines.append(f"• Trình duyệt: `{browser_info}`")
    lines.append(f"• {location_info}")
    if location_note:
        lines.append(f"  ↳ _{location_note}_")
    lines.append(f"• {source_info}")
    lines.append("")
    lines.append("🔥 _Keep moving forward, Lam!_")

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": "\n".join(lines),
        "parse_mode": "Markdown"
    }

    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"Failed to send Telegram notification: {str(e)}")


@app.route('/api/counter', methods=['GET', 'POST'])
def handle_analytics():
    is_on_vercel = os.environ.get('VERCEL_ENV') is not None
    environment_name = "Production" if is_on_vercel else "Local-Dev"
    metric = 'visitor_count' if is_on_vercel else 'dev_visitor_count'

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if request.method == 'POST':
            cursor.execute("""
                INSERT INTO site_analytics (metric_name, value)
                VALUES (%s, 1)
                ON CONFLICT (metric_name)
                DO UPDATE SET value = site_analytics.value + 1
                RETURNING value;
            """, (metric,))
            new_count = cursor.fetchone()[0]
            conn.commit()
            cursor.close()

            # Trích xuất nhanh dữ liệu thô từ request header của client
            ip_address = request.headers.get('x-forwarded-for', request.remote_addr)
            if ip_address and ',' in ip_address:
                ip_address = ip_address.split(',')[0].strip()

            ua_string = request.headers.get('User-Agent', '')
            referer = request.headers.get('Referer', '')
            client_signals = request.get_json(silent=True) or {}
            if not isinstance(client_signals, dict):
                client_signals = {}

            # Chạy đồng bộ có chủ đích: Vercel đóng băng instance ngay sau khi
            # response trả về, thread nền sẽ bị cắt giữa chừng và mất log.
            async_analytics_pipeline(new_count, environment_name, ip_address, ua_string,
                                     referer, metric, client_signals)

            return jsonify({"success": True, "environment": environment_name, "value": new_count}), 200
        else:
            cursor.execute("SELECT value FROM site_analytics WHERE metric_name = %s;", (metric,))
            result = cursor.fetchone()
            new_count = result[0] if result else 0
            cursor.close()
            return jsonify({"success": True, "environment": environment_name, "value": new_count}), 200

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn: conn.close()


@app.errorhandler(404)
def page_not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404
