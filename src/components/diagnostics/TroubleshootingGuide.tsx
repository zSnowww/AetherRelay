import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import type { Translator } from "../../i18n";

/** Collapsible three-step guide for isolating the cause of stutter. */
export function TroubleshootingGuide({ t }: { t: Translator }) {
  const [showGuide, setShowGuide] = useState(false);
  return (
      <div className="guide-card">
        <button type="button" className="guide-toggle-btn" onClick={() => setShowGuide((prev) => !prev)}>
          <HelpCircle size={16} />
          <span>{t("guideTitle")}</span>
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showGuide && (
          <div className="guide-steps-content">
            <div className="guide-step">
              <h5>{t("guideStep1Title")}</h5>
              <p>{t("guideStep1Desc")}</p>
            </div>
            <div className="guide-step">
              <h5>{t("guideStep2Title")}</h5>
              <p>{t("guideStep2Desc")}</p>
            </div>
            <div className="guide-step">
              <h5>{t("guideStep3Title")}</h5>
              <p>{t("guideStep3Desc")}</p>
            </div>
          </div>
        )}
      </div>
  );
}
