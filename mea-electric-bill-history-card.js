/* MEA Electric Bill History Card
 * Version: 2.1.0
 * Custom Lovelace Card to display current month live summary and historical recorded bills in a table.
 */

class MeaElectricBillHistoryCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("mea-electric-bill-history-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:mea-electric-bill-history-card",
      title: "สถิติค่าไฟฟ้าประจําเดือน",
      entity_history: "input_text.monthly_bill_history",
      entity_current_energy: "sensor.current_energy",
      entity_solar_energy: "",
      entity_total_cost: "sensor.total_month_cost",
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = {
      title: config.title || "สถิติค่าไฟฟ้าประจําเดือน",
      entity_history: config.entity_history || "input_text.monthly_bill_history",
      entity_current_energy: config.entity_current_energy || "",
      entity_solar_energy: config.entity_solar_energy || "",
      entity_total_cost: config.entity_total_cost || "",
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 4;
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    const cfg = this._config;

    // 1. ดึงค่าจาก Live Sensors สำหรับรอบเดือนปัจจุบัน
    const currEnergyState = cfg.entity_current_energy && this._hass.states[cfg.entity_current_energy] ? this._hass.states[cfg.entity_current_energy] : null;
    const solarEnergyState = cfg.entity_solar_energy && this._hass.states[cfg.entity_solar_energy] ? this._hass.states[cfg.entity_solar_energy] : null;
    const totalCostState = cfg.entity_total_cost && this._hass.states[cfg.entity_total_cost] ? this._hass.states[cfg.entity_total_cost] : null;

    const currEnergy = currEnergyState && !isNaN(parseFloat(currEnergyState.state)) ? parseFloat(currEnergyState.state).toFixed(2) : "0.00";
    const solarEnergy = solarEnergyState && !isNaN(parseFloat(solarEnergyState.state)) ? parseFloat(solarEnergyState.state).toFixed(2) : "0.00";
    const totalCost = totalCostState && !isNaN(parseFloat(totalCostState.state)) ? parseFloat(totalCostState.state).toFixed(2) : "0.00";

    const now = new Date();
    const currentMonthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 2. ดึงประวัติย้อนหลังสะสมจาก input_text
    const historyState = cfg.entity_history && this._hass.states[cfg.entity_history] ? this._hass.states[cfg.entity_history] : null;
    const rawText = historyState ? historyState.state : "";
    const records = rawText.split('\\n').filter(r => r.trim() !== '' && r !== 'unknown' && r !== 'unavailable');

    // แปลงข้อมูลย้อนหลังเป็นแถวตาราง
    const pastRows = records.map(rec => {
      const parts = rec.split('|').map(p => p.trim());
      const month = parts[0] || '-';
      const grid = parts[1] ? parts[1].replace(/[^0-9.]/g, '') : '-';
      const solar = parts[2] ? parts[2].replace(/[^0-9.]/g, '') : '-';
      const cost = parts[3] ? parts[3].replace(/[^0-9.]/g, '') : '-';

      return `
        <tr>
          <td><b>${month}</b></td>
          <td class="num">${grid} <small>kWh</small></td>
          <td class="num solar-txt">-${solar} <small>kWh</small></td>
          <td class="num cost-txt">${cost} <small>฿</small></td>
        </tr>
      `;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 16px; }
        .title { font-weight: bold; font-size: 1.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .title ha-icon { color: var(--primary-color, #03a9f4); }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9em;
        }
        th, td {
          padding: 8px 4px;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }
        th {
          color: var(--secondary-text-color);
          font-weight: 500;
          text-align: left;
        }
        th.num, td.num {
          text-align: right;
        }
        .th-icon {
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .th-icon ha-icon {
          --mdc-icon-size: 16px;
        }
        tr.current-row {
          background-color: var(--secondary-background-color, #f0f4f8);
          font-weight: 500;
        }
        .badge-live {
          font-size: 0.7em;
          background: var(--primary-color, #03a9f4);
          color: #fff;
          padding: 1px 4px;
          border-radius: 3px;
          margin-left: 4px;
        }
        .solar-txt { color: var(--success-color, #4caf50); }
        .cost-txt { font-weight: bold; }
        ha-icon.icon-grid { color: var(--warning-color, #ff9800); }
        ha-icon.icon-solar { color: var(--success-color, #4caf50); }
        ha-icon.icon-cash { color: var(--primary-color, #03a9f4); }
      </style>
      <ha-card>
        <div class="title">
          <ha-icon icon="mdi:chart-box-outline"></ha-icon>
          <span>${cfg.title}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th><div class="th-icon"><ha-icon icon="mdi:calendar-month"></ha-icon> เดือน</div></th>
              <th class="num"><div class="th-icon"><ha-icon icon="mdi:transmission-tower" class="icon-grid"></ha-icon> ใช้ไฟ</div></th>
              <th class="num"><div class="th-icon"><ha-icon icon="mdi:solar-power" class="icon-solar"></ha-icon> Solar</div></th>
              <th class="num"><div class="th-icon"><ha-icon icon="mdi:cash-multiple" class="icon-cash"></ha-icon> ค่าไฟ</div></th>
            </tr>
          </thead>
          <tbody>
            <tr class="current-row">
              <td><b>${currentMonthLabel}</b><span class="badge-live">สด</span></td>
              <td class="num">${currEnergy} <small>kWh</small></td>
              <td class="num solar-txt">-${solarEnergy} <small>kWh</small></td>
              <td class="num cost-txt">${totalCost} <small>฿</small></td>
            </tr>
            ${pastRows}
          </tbody>
        </table>
      </ha-card>
    `;
  }
}

class MeaElectricBillHistoryCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...MeaElectricBillHistoryCard.getStubConfig(), ...config };
    this._render();
  }

  set hass(hass) {
    const firstHass = !this._hass;
    this._hass = hass;
    if (this._config && firstHass) this._render();
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _valueChanged(field, value) {
    if (!this._config) return;
    this._config = { ...this._config, [field]: value };
    this._emit();
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const cfg = this._config;

    this.shadowRoot.innerHTML = `
      <style>
        .row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        label { font-size: 0.85em; color: var(--secondary-text-color); }
        input { padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
      </style>
      <div class="row">
        <label>Title</label>
        <input id="title" type="text" value="${cfg.title || ''}" />
      </div>
      <div class="row">
        <label>History Entity (input_text ไว้เก็บประวัติถาวร)</label>
        <input id="entity_history" type="text" list="sensor-options" value="${cfg.entity_history || ''}" placeholder="input_text.monthly_bill_history" />
      </div>
      <div class="row">
        <label>Current Month Energy Sensor (sensor.current_energy)</label>
        <input id="entity_current_energy" type="text" list="sensor-options" value="${cfg.entity_current_energy || ''}" placeholder="sensor.current_energy" />
      </div>
      <div class="row">
        <label>Solar Energy Sensor (ถ้ามี)</label>
        <input id="entity_solar_energy" type="text" list="sensor-options" value="${cfg.entity_solar_energy || ''}" placeholder="sensor.solar_energy_month" />
      </div>
      <div class="row">
        <label>Total Month Cost Sensor (sensor.total_month_cost)</label>
        <input id="entity_total_cost" type="text" list="sensor-options" value="${cfg.entity_total_cost || ''}" placeholder="sensor.total_month_cost" />
      </div>

      <datalist id="sensor-options">
        ${this._sensorOptions()}
      </datalist>
    `;

    const $ = (id) => this.shadowRoot.getElementById(id);
    if ($("title")) $("title").addEventListener("input", (e) => this._valueChanged("title", e.target.value));
    if ($("entity_history")) $("entity_history").addEventListener("input", (e) => this._valueChanged("entity_history", e.target.value));
    if ($("entity_current_energy")) $("entity_current_energy").addEventListener("input", (e) => this._valueChanged("entity_current_energy", e.target.value));
    if ($("entity_solar_energy")) $("entity_solar_energy").addEventListener("input", (e) => this._valueChanged("entity_solar_energy", e.target.value));
    if ($("entity_total_cost")) $("entity_total_cost").addEventListener("input", (e) => this._valueChanged("entity_total_cost", e.target.value));
  }

  _sensorOptions() {
    if (!this._hass) return "";
    return Object.keys(this._hass.states)
      .sort()
      .map((id) => `<option value="${id}"></option>`)
      .join("");
  }
}

customElements.define("mea-electric-bill-history-card", MeaElectricBillHistoryCard);
customElements.define("mea-electric-bill-history-card-editor", MeaElectricBillHistoryCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mea-electric-bill-history-card",
  name: "MEA Electric Bill History Card",
  description: "Display current month and recorded history of electric bill in a table.",
});
