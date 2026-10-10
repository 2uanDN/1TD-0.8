# Blueprint Thiết Kế PWA: 1TD (ONE-TAP DIARY)

## I. Xác Định Sản Phẩm Và Nguyên Tắc Thiết Kế Cốt Lõi

### 1. Mô Tả Sản Phẩm [Verified]
PWA cho phép ghi nhận hoạt động cá nhân bằng một lần chạm, tự động đính kèm thời gian thiết bị, xây dựng dòng thời gian trong ngày.

Product name: 1TD

### 2. Ba Nguyên Tắc UX [Verified]
- **Nguyên tắc A**: Ghi nhận phải dễ hơn trì hoãn. Giao diện ưu tiên nút hành động lớn, một chạm lưu ngay mà không yêu cầu xác nhận người dùng. Hoàn tác nhanh và chỉnh sửa sau. [Training Data]
- **Nguyên tắc B**: Người dùng tạo hành động mẫu một lần, không tạo bản ghi từng lần. Hành động bao gồm tên, icon (từ thư viện ổn định, ưu tiên chọn phù hợp tên), màu, nhóm, ghim. [Training Data]
- **Nguyên tắc C**: Hỗ trợ thói quen, không áp đặt. Không tự suy diễn dữ liệu thiếu; chỉ hiển thị những gì đã ghi nhận. Gợi ý dựa trên lịch sử và khung giờ, không mặc định thói quen. [Training Data]

## II. Cấu Trúc Kiến Trúc Giao Diện

### 1. Xử Lý Vấn Đề Dashboard Quá Nhiều Chức Năng Cạnh Tranh [Verified]
Màn hình chính trước đây có nguy cơ trở nên phức tạp. Phản biện đúng: ưu tiên ghi nhận hành động thay vì lịch sử. [Training Data]

Đề xuất **Action-first Dashboard** (ưu tiên ghi nhận): 
- Header: Ngày + số hoạt động ("Hôm nay — Thứ Sáu, 9/10 — 8 hoạt động").
- Khu vực lớn "Chạm để ghi nhận" với gợi ý theo thời điểm (top 4-5 hành động nổi bật).
- Dòng thời gian bên dưới (mới nhất trước).
- Nút "Thư viện" ở góc phải.
- Bỏ hoàn toàn thanh dưới ban đầu. [Training Data]

Flow khi chạm: Lưu ngay, phản hồi ngắn, quay về màn hình. [Training Data]

### 2. Phân Tách Dữ Liệu Rõ Ràng [Verified]
Hệ thống có ba đối tượng riêng biệt (không dùng mảng events trong action): 
1. **actions** — Mẫu hành động (id, name, icon, color, is_pinned, sort_order, created_at, archived_at).
2. **events** — Bản ghi cá nhân (id, action_id, occurred_at, created_at, timezone_id, note).
3. **settings** — Cấu hình và insight (tùy chọn gợi ý, thống kê). [Training Data]

Thêm **action_name_snapshot** trong event để giữ nguyên tên khi sửa action. [Training Data]

Về kỹ thuật: 
- IndexedDB ưu tiên cho events (truy vấn thời gian, edit thường xuyên).
- localStorage cho actions và settings đơn giản. [Training Data]

### 3. Chiến Lược PWA Và Offline-first [Verified]
Xóa hoàn toàn ý tưởng tự động đồng bộ giữa các thiết bị ở giai đoạn đầu. 
- Tập trung local-first 100%: lưu offline, xuất/nhập/xóa toàn bộ dữ liệu.
- PWA full

### 4. Giải Quyết Tối Minh Và Ghi Chú Tùy Chọn [Verified]
Không thay đổi nguyên tắc: ghi nhanh là mặc định, ghi chú (note) là tùy chọn sau. 
- Khi chạm hành động → lưu ngay (không note).
- Mở chi tiết sự kiện để thêm note (nếu muốn).
- Biểu đồ/thống kê/chi tiết sau này. [Training Data]

## III. Action-first Dashboard

### 1. Màn Hình Dashboard (Home) [Verified]
Header: Ngày + "8 hoạt động đã ghi nhận".

Khu vực "Chạm để ghi nhận" (gợi ý theo thời điểm + ghim): 
- Nút hành động lớn (48x48px+), icon + tên.
- Ví dụ: Ngủ dậy (thường 07:00), Uống cà phê, Ăn sáng, Bắt đầu làm việc.
- "Các hành động khác" để mở thư viện.

Dòng thời gian: 
- Mới nhất trước (hoạt động vừa ghi nhận luôn hiện trên cùng).
- Mỗi item: Icon + tên + thời gian + nút "Đã ghi nhận" + nút Hoàn tác nhanh.

Nút "Thư viện" góc phải. [Training Data]

### 2. Màn Hình Thư Viện Hành Động [Verified]
Grid hoặc list các hành động: mỗi ô icon (thư viện ổn định), tên, màu, nút "Ghim", nút "Nhóm", nút "Sửa". Chế độ tìm kiếm nhanh (type-ahead). Nút "Thêm Hành Động Mới" nổi bật. Flow: từ dashboard hoặc long-press nút gợi ý. [Training Data]

### 3. Màn Hình Thêm Hành Động Mới [Verified]
Form đơn giản: trường "Tên hành động" (bắt buộc). Nút chọn icon (grid hoặc picker, ưu tiên phù hợp tên). Chọn màu. Nhóm (nếu cần). Nút "Lưu" (lưu ngay vào thư viện). Không yêu cầu xác nhận thừa. [Training Data]

### 4. Màn Hình Lịch Sử (History) [Verified]
Danh sách tất cả sự kiện theo ngày/xem tuần/tháng. Mỗi item: ngày + thời gian + action + note (nếu có). Nút "Sửa" (thay đổi time/note). Nút "Xóa" (xác nhận). Export toàn bộ dữ liệu (JSON). [Training Data]

### 5. Màn Hình Gợi Ý & Thống Kê (Suggestions & Analytics) [Verified]
Cấp độ 1: top gợi ý theo lịch sử (thường xuyên + gần đây).  
Cấp độ 2: sắp xếp theo `S(a,t)=w1H(a,t) + w2D(a,t) + w3P(a) + w4R(a,t)` (khung giờ, thứ trong tuần, pin, gần đây).  
Cấp độ 3: chuỗi gợi ý tiếp theo (ví dụ sau "Ngủ dậy" → "Ăn sáng").  
Thống kê đơn giản: "Ngủ dậy thường 07:00", "Uống cà phê 3 lần/tuần". Flow: từ dashboard hoặc nút gợi ý. [Training Data]

### 6. Các Màn Hình Hỗ Trợ [Verified]
- Cài Đặt: export/import/xóa dữ liệu, cài đặt icon mặc định, dark mode.  
- Onboarding: hướng dẫn 3 bước đầu (tạo 2-3 hành động, ghi nhận 1 ngày).  
- Error states: "Chạm nhầm" → hoàn tác ngay; "Dữ liệu trống" → gợi ý tạo hành động. [Training Data]