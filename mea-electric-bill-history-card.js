/* MEA Electric Bill History Card
 * Custom Lovelace Card to display monthly recorded stats
 */

class MeaElectricBillHistoryCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define 'entity' (input_text.monthly_bill_history)");
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
    const historyText = entityState ? entityState.state : "ไม่มีข้อมูลสถิติ";

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 16px; }
        .title { font-weight: bold; font-size: 1.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .history-box {
          background: var(--secondary-background-color, #f7f7f7);
          border-radius: 8px;
          padding: 12px;
          font-family: monospace;
          font-size: 0.9em;
          white-space: pre-wrap;
          line-height: 1.6;
        }
      </style>
      <ha-card>
        <div class="title">📊 สถิติค่าไฟฟ้าประจําเดือน (ตัดรอบวันที่ 24)</div>
        <div class="history-box">${historyText}</div>
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
  description: "Display monthly recorded electricity consumption and total bill.",
});