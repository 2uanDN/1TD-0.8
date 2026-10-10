import React, { useMemo, useState } from 'react';
import { ACTION_ICON_NAMES, ActionIcon } from './ActionIcon';

export interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  actionNameHint?: string;
}

const ICON_KEYWORDS: Record<string, ReadonlyArray<string>> = {
  Sunrise: ['ngủ dậy', 'thức dậy', 'sáng', 'bình minh', 'wake', 'morning'],
  Sun: ['ban ngày', 'nắng', 'trưa', 'sun', 'day'],
  Sunset: ['chiều', 'hoàng hôn', 'tan làm', 'sunset', 'evening'],
  Moon: ['đi ngủ', 'ngủ', 'đêm', 'tối', 'sleep', 'night'],
  AlarmClock: ['báo thức', 'đặt giờ', 'chuông', 'alarm', 'wake up'],
  Bed: ['nghỉ trưa', 'nằm nghỉ', 'chợp mắt', 'nap', 'rest'],
  Clock: ['hẹn giờ', 'pomodoro', 'thời gian', 'timer'],
  Coffee: ['cà phê', 'trà', 'cafe', 'coffee', 'tea'],
  Utensils: ['ăn', 'bữa', 'cơm', 'ăn sáng', 'ăn trưa', 'ăn tối', 'meal', 'food'],
  Droplets: ['uống nước', 'nước', 'water', 'hydrate'],
  GlassWater: ['ly nước', 'nước lọc', 'cốc nước', 'glass', 'drink water'],
  Apple: ['trái cây', 'hoa quả', 'ăn vặt', 'táo', 'dinh dưỡng', 'fruit', 'snack'],
  Soup: ['nấu ăn', 'canh', 'súp', 'phở', 'bún', 'bữa ấm', 'soup', 'cook'],
  Wine: ['rượu', 'bia', 'tiệc', 'đồ uống', 'wine', 'drink', 'party'],
  Dumbbell: ['tập', 'gym', 'thể dục', 'thể thao', 'tạ', 'workout', 'fitness'],
  Footprints: ['đi bộ', 'chạy bộ', 'dạo', 'bước chân', 'walk', 'run', 'steps'],
  Bike: ['đạp xe', 'xe đạp', 'bike', 'cycle'],
  Waves: ['bơi', 'bơi lội', 'hồ bơi', 'biển', 'swim', 'pool'],
  Mountain: ['leo núi', 'dã ngoại', 'trekking', 'hiking', 'outdoor'],
  Flame: ['năng lượng', 'calo', 'đốt mỡ', 'burn', 'calories'],
  Heart: ['sức khỏe', 'yêu thương', 'chăm sóc', 'tim mạch', 'health', 'care'],
  Pill: ['thuốc', 'vitamin', 'uống thuốc', 'thực phẩm chức năng', 'medicine'],
  Stethoscope: ['khám bệnh', 'bác sĩ', 'bệnh viện', 'y tế', 'doctor', 'checkup'],
  Thermometer: ['nhiệt độ', 'đo sốt', 'ốm', 'cảm', 'fever', 'temp'],
  Scale: ['cân nặng', 'đo cân', 'chỉ số cơ thể', 'weight', 'scale'],
  Eye: ['nhỏ mắt', 'nghỉ mắt', 'thị lực', 'mắt', 'eye', 'vision'],
  ShowerHead: ['tắm', 'tắm vòi sen', 'gội đầu', 'vệ sinh', 'shower'],
  Bath: ['ngâm bồn', 'tắm bồn', 'thư giãn', 'spa', 'bath'],
  Scissors: ['cắt tóc', 'cắt móng', 'chăm sóc cá nhân', 'haircut', 'groom'],
  BatteryCharging: ['nạp năng lượng', 'phục hồi', 'nghỉ ngơi', 'recharge'],
  Briefcase: ['làm việc', 'công việc', 'họp', 'văn phòng', 'work', 'office'],
  Laptop: ['máy tính', 'làm từ xa', 'remote', 'laptop', 'pc'],
  Code: ['code', 'lập trình', 'dev', 'kỹ thuật'],
  BookOpen: ['đọc', 'sách', 'ôn tập', 'tài liệu', 'read', 'book'],
  GraduationCap: ['học', 'khóa học', 'bài giảng', 'trường', 'study', 'course'],
  Languages: ['ngoại ngữ', 'tiếng anh', 'từ vựng', 'dịch', 'language', 'english'],
  Brain: ['thiền', 'suy ngẫm', 'tập trung', 'chánh niệm', 'focus', 'meditate'],
  Target: ['mục tiêu', 'kpi', 'ưu tiên', 'hoàn thành', 'goal', 'target'],
  PenTool: ['viết', 'nhật ký', 'ghi chép', 'soạn thảo', 'write', 'journal'],
  CheckCircle2: ['hoàn thành', 'xong', 'việc cần làm', 'done', 'task'],
  Calendar: ['lên lịch', 'kế hoạch', 'lịch trình', 'plan', 'schedule'],
  Mail: ['email', 'thư', 'hộp thư', 'phản hồi', 'mail', 'inbox'],
  PhoneCall: ['gọi điện', 'điện thoại', 'liên lạc', 'call', 'phone'],
  Smartphone: ['màn hình', 'mạng xã hội', 'tin nhắn', 'mobile', 'screen'],
  Zap: ['nhanh', 'năng suất', 'tăng tốc', 'energy', 'boost'],
  Wallet: ['chi tiêu', 'tài chính', 'tiền', 'thanh toán', 'hóa đơn', 'wallet', 'money'],
  PiggyBank: ['tiết kiệm', 'đầu tư', 'tích lũy', 'quỹ', 'save', 'invest'],
  ShoppingBag: ['mua sắm', 'đi chợ', 'siêu thị', 'shop', 'market'],
  Home: ['về nhà', 'ở nhà', 'gia đình', 'việc nhà', 'home', 'house'],
  Sparkles: ['dọn dẹp', 'lau nhà', 'chăm sóc da', 'skincare', 'clean'],
  Shirt: ['giặt đồ', 'phơi đồ', 'ủi đồ', 'quần áo', 'laundry', 'clothes'],
  Trash2: ['đổ rác', 'dọn rác', 'phân loại rác', 'trash', 'garbage'],
  Wrench: ['sửa chữa', 'bảo trì', 'bảo dưỡng', 'repair', 'fix'],
  Flower2: ['tưới cây', 'chăm hoa', 'làm vườn', 'garden', 'flower'],
  Leaf: ['thiên nhiên', 'cây xanh', 'sống xanh', 'nature', 'plant'],
  Users: ['gặp gỡ', 'bạn bè', 'họp mặt', 'social', 'friends'],
  Baby: ['chăm con', 'em bé', 'con cái', 'baby', 'kid'],
  Dog: ['chó', 'thú cưng', 'dắt chó', 'cho thú ăn', 'dog', 'pet'],
  Cat: ['mèo', 'chăm mèo', 'hoàng thượng', 'cat', 'kitty'],
  Smile: ['vui', 'tâm trạng', 'biết ơn', 'hạnh phúc', 'mood', 'happy'],
  Gift: ['quà tặng', 'sinh nhật', 'kỷ niệm', 'gift', 'present'],
  Award: ['thành tựu', 'kỷ lục', 'thưởng', 'award', 'win'],
  ShieldCheck: ['khóa cửa', 'an toàn', 'kiểm tra tối', 'safe', 'security'],
  Music: ['nhạc', 'nghe nhạc', 'ca hát', 'music', 'song'],
  Guitar: ['đàn', 'nhạc cụ', 'tập đàn', 'guitar', 'instrument'],
  Headphones: ['podcast', 'nghe', 'sách nói', 'audiobook', 'listen'],
  Tv: ['xem tv', 'truyền hình', 'giải trí', 'tv', 'show'],
  Film: ['xem phim', 'rạp phim', 'series', 'movie', 'cinema'],
  Gamepad2: ['chơi game', 'giải trí', 'trò chơi', 'game', 'play'],
  Camera: ['chụp ảnh', 'quay video', 'lưu niệm', 'photo', 'camera'],
  Palette: ['vẽ', 'hội họa', 'thiết kế', 'sáng tạo', 'art', 'draw'],
  Car: ['lái xe', 'ô tô', 'xe máy', 'đổ xăng', 'di chuyển', 'car', 'drive'],
  Bus: ['xe buýt', 'tàu điện', 'đi làm', 'commute', 'bus', 'transit'],
  Plane: ['máy bay', 'du lịch', 'công tác', 'chuyến bay', 'travel', 'flight'],
  MapPin: ['đến nơi', 'check-in', 'địa điểm', 'location', 'place'],
  Compass: ['khám phá', 'dạo phố', 'đi phượt', 'explore', 'trip'],
  Tent: ['cắm trại', 'picnic', 'ngoài trời', 'camp'],
  CloudRain: ['trời mưa', 'thời tiết', 'rain', 'weather'],
  Umbrella: ['mang ô', 'áo mưa', 'che nắng', 'umbrella'],
  Activity: ['hoạt động', 'nhịp', 'theo dõi', 'activity'],
};

/**
 * Infers the best matching Lucide icon name from an action name string (BLUEPRINT.md § III.3).
 */
export function inferIconFromActionName(actionName: string): string | null {
  const normalized = actionName.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const iconName of ACTION_ICON_NAMES) {
    const keywords = ICON_KEYWORDS[iconName] ?? [];
    if (
      iconName.toLowerCase() === normalized ||
      keywords.some((kw) => normalized.includes(kw))
    ) {
      return iconName;
    }
  }
  return null;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  actionNameHint = '',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const suggestedIcon = useMemo(
    () => inferIconFromActionName(actionNameHint),
    [actionNameHint]
  );

  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const baseList = ACTION_ICON_NAMES.filter((iconName) => {
      if (!query) return true;
      const keywords = ICON_KEYWORDS[iconName] ?? [];
      return (
        iconName.toLowerCase().includes(query) ||
        keywords.some((kw) => kw.includes(query))
      );
    });

    if (suggestedIcon && baseList.includes(suggestedIcon)) {
      return [
        suggestedIcon,
        ...baseList.filter((item) => item !== suggestedIcon),
      ];
    }
    return baseList;
  }, [searchQuery, suggestedIcon]);

  return (
    <div className="icon-picker" role="group" aria-label="Chọn biểu tượng hành động">
      <div className="library-search-row">
        <div className="ledger-input-wrap">
          <input
            type="search"
            className="ledger-input"
            value={searchQuery}
            placeholder="Tìm biểu tượng (vd: cà phê, ngủ, sách, tập)..."
            aria-label="Tìm kiếm biểu tượng hành động"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        {suggestedIcon && (
          <button
            type="button"
            className="shell-ghost-btn"
            aria-label={`Dùng biểu tượng gợi ý theo tên: ${suggestedIcon}`}
            onClick={() => onChange(suggestedIcon)}
          >
            <ActionIcon name={suggestedIcon} size={15} />
            <span>Gợi ý: {suggestedIcon}</span>
          </button>
        )}
      </div>

      <div className="icon-picker-grid">
        {filteredIcons.map((iconName) => {
          const isSelected = value === iconName;
          const isSuggested = suggestedIcon === iconName;

          return (
            <button
              key={iconName}
              type="button"
              className="icon-picker-cell"
              aria-pressed={isSelected}
              aria-label={`Chọn biểu tượng ${iconName}${
                isSuggested ? ' (gợi ý phù hợp tên)' : ''
              }`}
              onClick={() => onChange(iconName)}
            >
              <ActionIcon name={iconName} size={18} />
              <span className="type-mono-badge">{iconName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IconPicker;
