import type { ReactNode } from "react";

interface PrefRowProps {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}

/** One setting row: icon, title and description on the left, the control on the right. */
export function PrefRow({ icon, title, description, children }: PrefRowProps) {
  return (
    <div className="pref-row">
      <div className="pref-row-main">
        <div className="pref-icon">{icon}</div>
        <div className="pref-texts">
          <div className="pref-title-line">
            <h4>{title}</h4>
          </div>
          <p>{description}</p>
        </div>
      </div>
      <div className="pref-row-control">{children}</div>
    </div>
  );
}
