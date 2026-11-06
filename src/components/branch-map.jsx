import { Icon } from "../icons.jsx";
import { branchMapUrls } from "../lib/branch-public.js";
import "../branch-detail.css";

export function BranchMap({ branch, compact = false }) {
  const map = branchMapUrls(branch);
  if (!map)
    return <p className="branch-map-empty">Địa chỉ cơ sở đang được cập nhật. Vui lòng liên hệ trước khi đến.</p>;
  return (
    <div className={`branch-map${compact ? " branch-map-compact" : ""}`}>
      <div className="branch-map-frame">
        <iframe
          key={map.embed}
          title={`Bản đồ đến ${branch.name}: ${map.address}`}
          src={map.embed}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className="branch-map-links">
        <a href={map.search} target="_blank" rel="noopener noreferrer">
          <Icon name="pin" size={17} />Mở Google Maps<span className="visually-hidden"> (mở tab mới)</span>
        </a>
        <a href={map.directions} target="_blank" rel="noopener noreferrer">
          Chỉ đường<Icon name="arrow" size={17} /><span className="visually-hidden"> (mở tab mới)</span>
        </a>
      </div>
      {!compact && <p className="branch-map-note">Bản đồ tra cứu theo địa chỉ cơ sở đang lưu. Nếu bản đồ chưa tải được, bạn vẫn có thể mở Google Maps hoặc gọi cơ sở để được hướng dẫn.</p>}
    </div>
  );
}
