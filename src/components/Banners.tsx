import { Icon } from './Icon';

/** 階段一才會出現 */
export function DemoBanner() {
  return (
    <div className="banner banner--demo" role="status">
      <Icon name="alert" size={14} />
      展示模式：只能和這個瀏覽器的其他分頁聊天
    </div>
  );
}

export function ConnectionBanner() {
  return (
    <div className="banner banner--conn" role="alert">
      <Icon name="spinner" size={14} className="spin" />
      連線中斷，重新連線中…
    </div>
  );
}
