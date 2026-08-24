# MEA Electric Bill History Card ⚡☀️

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![version](https://img.shields.io/badge/version-3.3.0-blue.svg)](https://github.com/)

**MEA Electric Bill History Card** คือ Custom Lovelace Card สำหรับ **Home Assistant** ที่ออกแบบมาเพื่อสรุปการใช้ไฟฟ้าและค่าไฟฟ้าประจำรอบเดือน ทั้งแบบ Live Real-time ในรอบบิลปัจจุบัน และแสดงตารางประวัติย้อนหลัง (3, 6, 9, 12 เดือน) รองรับการแสดงผลทั้ง **หน่วยไฟหลวง (Grid)**, **หน่วยผลิตโซลาร์เซลล์ (Solar PV)** และ **ยอดค่าไฟ (บาท)**

---

## ✨ คุณสมบัติเด่น (Features)
- 📊 **Live Real-time Dashboard:** แสดงผลสรุปหน่วยไฟฟ้าที่ใช้, หน่วยผลิตโซลาร์เซลล์ และประมาณการค่าไฟฟ้าของรอบบิลปัจจุบันแบบสดๆ
- 📜 **Smart Historical Record:** อ่านประวัติย้อนหลังจาก `input_text` อัตโนมัติ พร้อมระบบ Smart Parser (รองรับทั้งประวัติแบบมีและไม่มีข้อมูล Solar โดยไม่สลับคอลัมน์)
- ⚙️ **Visual UI Editor:** ตั้งค่าและเลือก Entity เซนเซอร์ต่าง ๆ ผ่าน UI ของ Home Assistant ได้ง่าย ไม่จำเป็นต้องเขียนโค้ด YAML
- 🎨 **Clean & Responsive Design:** ตารางออกแบบให้กระชับ มีไอคอนระบุสถานะ อ่านค่าง่ายทั้งบนมือถือและแท็บเล็ต

---

## 📦 การติดตั้ง (Installation)

### วิธีที่ 1: ติดตั้งผ่าน HACS (Custom Repository)
1. ไปที่ **HACS** > **Frontend**
2. คลิกจุด 3 จุดมุมขวาบน > **Custom repositories**
3. ใส่ URL ของ GitHub Repository นี้ และเลือก Category เป็น **Dashboard** หรือ **Lovelace**
4. ค้นหา `MEA Electric Bill History Card` และกด **Download**
5. รีโหลดหน้า Dashboard

---

### วิธีที่ 2: ติดตั้งแบบ Manual
1. ดาวน์โหลดไฟล์ `mea-electric-bill-history-card.js`
2. นำไฟล์ไปวางในโฟลเดอร์ `/config/www/` (หรือ `/local/`) ของ Home Assistant
3. ไปที่ **Settings** > **Dashboards** > จุด 3 จุดมุมขวาบน > **Resources**
4. กด **Add Resource** แล้วกรอก:
   - **URL:** `/local/mea-electric-bill-history-card.js`
   - **Resource Type:** `JavaScript Module`
5. รีเฟรชเบราว์เซอร์ (Ctrl + F5 หรือ Clear Cache)

---

## 🛠️ การเตรียม Helper (Prerequisites)

ก่อนใช้งานการ์ด ให้สร้าง **Helper** ชนิด `Text` สำหรับบันทึกประวัติย้อนหลัง:
1. ไปที่ **Settings** > **Devices & Services** > **Helpers**
2. คลิก **Create Helper** > เลือก **Text** (ข้อความ)
3. ตั้งชื่อ Entity เช่น: `input_text.monthly_bill_history`
4. กำหนดความยาวสูงสุด (Max Length) เป็น **255** หรือ **500** ตัวอักษร

---

## 🤖 ตัวอย่าง Automation ตัดรอบบิล (Example Automation)

ตัวอย่าง Automation สำหรับ **บันทึกประวัติลง `input_text` ทุกวันที่ 24 เวลา 07:00 น.** (ก่อนสั่ง Reset มิเตอร์):

```yaml
alias: "Save Monthly Electric Bill History from Helpers"
description: "บันทึกสรุปค่าไฟและหน่วยผลิตโซลาร์ลงประวัติทุกวันที่ 24 เวลา 07:00 น."
triggers:
  - trigger: time
    at: "07:00:00"
conditions:
  - condition: template
    value_template: "{{ now().day == 24 }}"
actions:
  - action: input_text.set_value
    target:
      entity_id: input_text.monthly_bill_history
    data:
      value: >-
        {% set old_history = states('input_text.monthly_bill_history') %}
        {% set energy = states('sensor.current_energy') | float(0) %}
        {% set solar = states('sensor.monthly_pv') | float(0) %}
        {% set cost = states('sensor.total_month_cost') | float(0) %}
        {% set new_entry = now().strftime('%Y-%m') ~ " | " ~ (energy | round(2)) ~ " | " ~ (solar | round(2)) ~ " | " ~ (cost | round(2)) %}

        {% if old_history in ['unknown', 'unavailable', ''] %}
          {{ new_entry }}
        {% else %}
          {{ new_entry }}\n{{ old_history }}
        {% endif %}
mode: single
```
รูปแบบข้อมูลที่บันทึก: YYYY-MM | หน่วยไฟ | หน่วยโซลาร์ | ค่าไฟ

เช่น 2026-08 | 314.43 | 153.85 | 621.37

⚙️ ตัวอย่างการใช้งานใน Dashboard (Lovelace YAML)
สามารถเพิ่มผ่าน UI Dashboard ได้เลย หรือใช้ YAML Configuration:

YAML
```yaml
type: custom:mea-electric-bill-history-card
title: สถิติค่าไฟฟ้าประจําเดือน
entity_history: input_text.monthly_bill_history
entity_current_energy: sensor.current_energy
entity_solar_energy: sensor.monthly_pv
entity_total_cost: sensor.total_month_cost
max_rows: 3
```

📋 คำอธิบายพารามิเตอร์ (Configuration Options)
| ชื่อฟิลด์ (Field) | ชนิด (Type) | ค่าเริ่มต้น | รายละเอียด |
| :--- | :---: | :---: | :--- |
| `type` | string | **จำเป็น** | `custom:mea-electric-bill-history-card` |
| `title` | string | `สถิติค่าไฟฟ้าประจําเดือน` | ชื่อหัวข้อที่จะแสดงด้านบนของการ์ด |
| `entity_history` | string | `input_text.monthly_bill_history` | Helper `input_text` ที่เก็บประวัติย้อนหลัง |
| `entity_current_energy` | string | - | เซนเซอร์หน่วยไฟฟ้าที่ใช้ในรอบปัจจุบัน (kWh) |
| `entity_solar_energy` | string | - | เซนเซอร์หน่วยไฟฟ้าจากโซลาร์เซลล์ในรอบปัจจุบัน (kWh) *(เว้นว่างได้)* |
| `entity_total_cost` | string | - | เซนเซอร์ยอดเงินค่าไฟฟ้าในรอบปัจจุบัน (บาท) |
| `max_rows` | number | `3` | จำนวนรายการประวัติย้อนหลังที่ต้องการแสดง (3, 6, 9, 12 เดือน) |


📝 License
This project is open-source under the MIT License.
