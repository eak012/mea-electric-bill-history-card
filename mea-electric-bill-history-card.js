/* MEA Electric Bill History Card
 * Displays historical records saved from current_energy & total_month_cost
 */

class MeaElectricBillHistoryCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define 'entity' (e.g. input_text.monthly_bill_history)");
    }
    this._config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    const entityState = this._hass.states[this._config.entity];
    const rawText = entityState ? entityState.state : "";
    
    // แยกบรรทัดประวัติมาสร้างเป็น List
    const records = rawText.split('\\n').filter(r => r.trim() !== '');

    const rows = records.length > 0
      ? records.map(rec => `<div class="history-item">📌 ${rec.trim()}</div>`).join('')
      : '<div class="empty">ยังไม่มีข้อมูลสถิติที่บันทึกไว้</div>';

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 16px; }
        .title { font-weight: bold; font-size: 1.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .history-item {
          background: var(--secondary-background-color, #f7f7f7);
          border-left: 4px solid var(--primary-color, #03a9f4);
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 0.9em;
        }
        .empty {
          color: var(--secondary-text-color);
          font-size: 0.9em;
          font-style: italic;
        }
      </style>
      <ha-card>
        <div class="title">📊 สถิติค่าไฟฟ้าประจําเดือน (ตัดรอบวันที่ 24)</div>
        <div class="history-list">${rows}</div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("mea-electric-bill-history-card", MeaElectricBillHistoryCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mea-electric-bill-history-card",
  name: "MEA Electric Bill History Card",
  description: "Display monthly electric bill history recorded from sensors.",
});
