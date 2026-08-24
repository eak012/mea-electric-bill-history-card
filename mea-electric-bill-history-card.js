/* MEA Electric Bill History Card
 * Version: 1.2.0
 * Custom Lovelace Card to display current cycle live summary and historical bills.
 * Features: Direct meter reading display, smart 3/4-part history parser, and visual cutoff schedule.
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
      entity_current_energy: "sensor.monthly_energy",
      entity_solar_energy: "sensor.monthly_pv",
      entity_total_cost: "sensor.total_month_cost",
      billing_day: 24,
      billing_time: "08:30",
      max_rows: 3,
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
      billing_day: config.billing_day ? Number(config.billing_day) : 24,
      billing_time: config.billing_time || "08:30",
      max_rows: config.max_rows ? Number(config.max_rows) : 3,
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

  // คำนวณช่วงรอบบิลตามวันและเวลาตัดรอบ
  _getCurrentCycleLabel(cutoffDay, cutoffTime) {
    const now = new Date();
    const timeParts = (cutoffTime || "08:30").split(":");
    const cutHour = parseInt(timeParts[0], 10) || 0;
    const cutMinute = parseInt(timeParts[1], 10) || 0;
    
    const cutOffThisMonth = new Date(now.getFullYear(), now.getMonth(), cutoffDay, cutHour, cutMinute, 0);
    let cycleStart, cycleEnd;

    if (now >= cutOffThisMonth) {
      cycleStart = new Date(now.getFullYear(), now.getMonth(), cutoffDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, cutoffDay - 1);
    } else {
      cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, cutoffDay);
      cycleEnd = new Date(now.getFullYear(), now.getMonth(), cutoffDay - 1);
    }

    const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `${fmt(cycleStart)} - ${fmt(cycleEnd)}`;
  }

  // ดึงเฉพาะตัวเลขและจุดทศนิยม
  _extractNumber(str) {
    if (!str) return "-";
    const matches = str.match(/[0-9]+(?:\.[0-9]+)?/);
    return matches ? matches[0] : "-";
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    const cfg = this._config;

    // 1. ดึงข้อมูล Live Sensors ประจำรอบปัจจุบัน
    const currEnergyState = cfg.entity_current_energy && this._hass.states[cfg.entity_current_energy] ? this._hass.states[cfg.entity_current_energy] : null;
    const solarEnergyState = cfg.entity_solar_energy && this._hass.states[cfg.entity_solar_energy] ? this._hass.states[cfg.entity_solar_energy] : null;
    const totalCostState = cfg.entity_total_cost && this._hass.states[cfg.entity_total_cost] ? this._hass.states[cfg.entity_total_cost] : null;

    const currEnergyDisplay = currEnergyState && !isNaN(parseFloat(currEnergyState.state)) ? parseFloat(currEnergyState.state).toFixed(2) : "0.00";
    const rawSolar = solarEnergyState && !isNaN(parseFloat(solarEnergyState.state)) ? Math.abs(parseFloat(solarEnergyState.state)) : 0;
    const solarEnergyDisplay = rawSolar.toFixed(2);
    const totalCostDisplay = totalCostState && !isNaN(parseFloat(totalCostState.state)) ? parseFloat(totalCostState.state).toFixed(2) : "0.00";

    const currentMonthLabel = this._getCurrentCycleLabel(cfg.billing_day, cfg.billing_time);

    // 2. ดึงประวัติย้อนหลังสะสมจาก input_text
    const historyState = cfg.entity_history && this._hass.states[cfg.entity_history] ? this._hass.states[cfg.entity_history] : null;
    const rawText = historyState ? historyState.state : "";
    
    // รองรับทั้ง \n จริง และข้อความ literal "\n"
    const lines = rawText
      .split(/\r?\n|\\n/)
      .map(r => r.trim())
      .filter(r => r !== '' && r !== 'unknown' && r !== 'unavailable')
      .slice(0, cfg.max_rows);

    // Smart Parser: แยกแยะระหว่างรูปแบบ 3 ส่วน (ไม่มี Solar) กับ 4 ส่วน (มี Solar)
    const pastRows = lines.map(rec => {
      const parts = rec.split('|').map(p => p.trim());
      let month = parts[0] || '-';
      let grid = '-';
      let solar = '-';
      let cost = '-';

      if (parts.length >= 4) {
        // รูปแบบ 4 ส่วน: เดือน | ใช้ไฟ | Solar | ค่าไฟ
        grid = this._extractNumber(parts[1]);
        solar = this._extractNumber(parts[2]);
        cost = this._extractNumber(parts[3]);
      } else if (parts.length === 3) {
        // รูปแบบ 3 ส่วน: เดือน | พลังงาน: 160.15 kWh | ค่าไฟ: 621.37 บาท
        grid = this._extractNumber(parts[1]);
        solar = "-"; 
        cost = this._extractNumber(parts[2]);
      } else if (parts.length === 2) {
        grid = this._extractNumber(parts[1]);
      }

      const solarCell = (solar !== '-' && solar !== '') 
        ? `<span class="solar-txt">-${solar}</span> <small>kWh</small>` 
        : `<span style="color: var(--secondary-text-color);">-</span>`;

      return `
        <tr>
          <td><b>${month}</b></td>
          <td class="num">${grid} <small>kWh</small></td>
          <td class="num">${solarCell}</td>
          <td class="num cost-txt">${cost} <small>฿</small></td>
        </tr>
      `;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 16px; font-family: var(--paper-font-body1_-_font-family, inherit); }
        .title { font-weight: bold; font-size: 1.1em; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        .title-left { display: flex; align-items: center; gap: 8px; }
        .title ha-icon { color: var(--primary-color, #03a9f4); }
        .reset-info { font-size: 0.75em; color: var(--secondary-text-color); font-weight: normal; }
        
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
          <div class="title-left">
            <ha-icon icon="mdi:chart-box-outline"></ha-icon>
            <span>${cfg.title}</span>
          </div>
          <div class="reset-info">ตัดรอบ: ทุกวันที่ ${cfg.billing_day} (${cfg.billing_time} น.)</div>
        </div>

        <table>
          <thead>
            <tr>
              <th><div class="th-icon"><ha-icon icon="mdi:calendar-month"></ha-icon> รอบบิล</div></th>
              <th class="num"><div class="th-icon"><ha-icon icon="mdi:transmission-tower" class="icon-grid"></ha-icon> ใช้ไฟ</div></th>
              <th class="num"><div class="th-icon"><ha-icon icon="mdi:solar-power" class="icon-solar"></ha-icon> Solar</div></th>
              <th class="num"><div class="th-icon"><ha-icon icon="mdi:cash-multiple" class="icon-cash"></ha-icon> ค่าไฟ</div></th>
            </tr>
          </thead>
          <tbody>
            <tr class="current-row">
              <td><b>${currentMonthLabel}</b><span class="badge-live">สด</span></td>
              <td class="num">${currEnergyDisplay} <small>kWh</small></td>
              <td class="num"><span class="solar-txt">-${solarEnergyDisplay}</span> <small>kWh</small></td>
              <td class="num cost-txt">${totalCostDisplay} <small>฿</small></td>
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
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        label { font-size: 0.85em; font-weight: 500; color: var(--primary-text-color); }
        .desc { font-size: 0.75em; color: var(--secondary-text-color); margin-top: -2px; margin-bottom: 4px; }
        input, select { padding: 8px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color); }
      </style>

      <div class="row">
        <label>ชื่อหัวข้อการ์ด (Title)</label>
        <input id="title" type="text" value="${cfg.title || ''}" placeholder="สถิติค่าไฟฟ้าประจําเดือน" />
      </div>

      <div class="grid-2">
        <div class="row">
          <label>วันตัดรอบบิล</label>
          <div class="desc">วันที่เริ่มรอบบิลใหม่ (1 - 31)</div>
          <input id="billing_day" type="number" min="1" max="31" value="${cfg.billing_day || 24}" />
        </div>
        <div class="row">
          <label>เวลาตัดรอบบิล</label>
          <div class="desc">เวลาที่ระบบสั่งรีเซ็ตมิเตอร์</div>
          <input id="billing_time" type="time" value="${cfg.billing_time || '08:30'}" />
        </div>
      </div>

      <div class="row">
        <label>จำนวนเดือนที่แสดงในประวัติย้อนหลัง</label>
        <select id="max_rows">
          <option value="3" ${cfg.max_rows == 3 ? 'selected' : ''}>ย้อนหลัง 3 เดือน</option>
          <option value="6" ${cfg.max_rows == 6 ? 'selected' : ''}>ย้อนหลัง 6 เดือน</option>
          <option value="9" ${cfg.max_rows == 9 ? 'selected' : ''}>ย้อนหลัง 9 เดือน</option>
          <option value="12" ${cfg.max_rows == 12 ? 'selected' : ''}>ย้อนหลัง 12 เดือน (1 ปี)</option>
        </select>
      </div>

      <div class="row">
        <label>Entity บันทึกประวัติรอบบิลย้อนหลัง (History Storage)</label>
        <div class="desc">ตัวแปร <code>input_text</code> ที่ Automation ใช้เก็บข้อมูลสรุปยอดแต่ละเดือน</div>
        <input id="entity_history" type="text" list="sensor-options" value="${cfg.entity_history || ''}" placeholder="input_text.monthly_bill_history" />
      </div>

      <div class="row">
        <label>เซนเซอร์ดึงไฟจากการไฟฟ้าในรอบปัจจุบัน (Grid Import Energy)</label>
        <div class="desc">เซนเซอร์หน่วยไฟรวม (kWh) ที่ซื้อจากการไฟฟ้า ประจำรอบบิลปัจจุบัน (เช่น sensor.monthly_energy)</div>
        <input id="entity_current_energy" type="text" list="sensor-options" value="${cfg.entity_current_energy || ''}" placeholder="sensor.monthly_energy" />
      </div>

      <div class="row">
        <label>เซนเซอร์ผลิตไฟโซลาร์เซลล์ในรอบปัจจุบัน (Solar PV Generation)</label>
        <div class="desc">เซนเซอร์หน่วยไฟ (kWh) ที่ผลิตได้จากแผงโซลาร์ ประจำรอบบิลปัจจุบัน (เช่น sensor.monthly_pv)</div>
        <input id="entity_solar_energy" type="text" list="sensor-options" value="${cfg.entity_solar_energy || ''}" placeholder="sensor.monthly_pv" />
      </div>

      <div class="row">
        <label>เซนเซอร์คำนวณยอดค่าไฟในรอบปัจจุบัน (Total Estimated Cost)</label>
        <div class="desc">เซนเซอร์ประมาณการยอดเงินค่าไฟ (บาท) ประจำรอบบิลปัจจุบัน (เช่น sensor.total_month_cost)</div>
        <input id="entity_total_cost" type="text" list="sensor-options" value="${cfg.entity_total_cost || ''}" placeholder="sensor.total_month_cost" />
      </div>

      <datalist id="sensor-options">
        ${this._sensorOptions()}
      </datalist>
    `;

    const $ = (id) => this.shadowRoot.getElementById(id);
    if ($("title")) $("title").addEventListener("input", (e) => this._valueChanged("title", e.target.value));
    if ($("billing_day")) $("billing_day").addEventListener("change", (e) => this._valueChanged("billing_day", Number(e.target.value)));
    if ($("billing_time")) $("billing_time").addEventListener("change", (e) => this._valueChanged("billing_time", e.target.value));
    if ($("max_rows")) $("max_rows").addEventListener("change", (e) => this._valueChanged("max_rows", Number(e.target.value)));
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
  description: "Display current cycle live summary and recorded bills with customizable cut-off schedule.",
});
