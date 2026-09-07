-- Migrate 3 remaining live-HubDB-fetch tables into Supabase, so
-- privileges-events.html and why-us.html no longer hit api.hubapi.com directly.
-- Safe to run once; re-running will error on duplicate primary keys (expected).

create table privileges_benefits (
  id bigint primary key,
  "order" integer,
  feature text,
  is_category boolean,
  is_main_header boolean,
  tier_1 text,
  tier_2 text,
  tier_3 text
);
alter table privileges_benefits enable row level security;
create policy "public read" on privileges_benefits for select to anon using (true);

create table privileges_products (
  id bigint primary key,
  "order" integer,
  product text,
  rc_rate text
);
alter table privileges_products enable row level security;
create policy "public read" on privileges_products for select to anon using (true);

create table awards (
  id bigint primary key,
  "order" integer,
  title text,
  description text,
  date_label text,
  thumbnail jsonb
);
alter table awards enable row level security;
create policy "public read" on awards for select to anon using (true);

insert into privileges_benefits (id, "order", feature, is_category, is_main_header, tier_1, tier_2, tier_3) values
  (345967743678, 0, 'สิทธิพิเศษตามสถานะ', true, true, NULL, NULL, NULL),
  (335206444779, 1, 'Yuanta Point', true, false, NULL, NULL, NULL),
  (335206444785, 2, 'อัตราส่วน RC :  1 Yuanta Point', false, false, '6', '6', '6'),
  (335226107614, 3, 'Special Privileges', true, false, NULL, NULL, NULL),
  (335206444786, 4, 'Trading Tools', false, false, 'check', 'check', 'check'),
  (335206444787, 5, 'Investment Planning (Portfolio) ', false, false, 'check', 'check', 'check'),
  (335226107615, 6, 'Tax Planning', false, false, 'check', 'check', 'check'),
  (335206444788, 7, 'VIP Trade Room Access', false, false, 'check', 'check', 'check'),
  (335206444789, 8, 'Research & Insights', true, false, NULL, NULL, NULL),
  (335226107616, 9, 'Research Paper / Channel', false, false, 'check', 'check', 'check'),
  (335226107617, 10, 'Private Analyst Talk', false, false, 'check', 'check', 'check'),
  (335206444790, 11, 'Company Visit / Roadshow', false, false, 'check', 'check', 'check'),
  (335206444791, 12, 'Event & Training Access', true, false, NULL, NULL, NULL),
  (335226107618, 13, 'Event', false, false, 'check', 'check', 'check'),
  (335206444792, 14, 'Quarterly Event', false, false, 'check', 'check', 'check'),
  (335206444793, 15, 'Exclusive Event / Workshop', false, false, 'check', 'check', 'check'),
  (335206445754, 16, 'Private Event / Dinner', false, false, 'check', 'check', 'check'),
  (335206445755, 17, 'Special Gift', true, false, NULL, NULL, NULL),
  (335206445756, 18, 'New Year Gift', false, false, 'check', 'check', 'check'),
  (335206445757, 19, 'Birthday Gift', false, false, 'check', 'check', 'check'),
  (335226107619, 20, 'Chinese New Year Gift', false, false, 'check', 'check', 'check'),
  (335206445758, 21, 'Moon Festival', false, false, 'check', 'check', 'check'),
  (335206445759, 22, 'Ultimate Privilege', true, false, NULL, NULL, NULL),
  (335226107620, 23, 'Ultimate Club / Priority Service / Private Event Invitation', false, false, 'check', 'check', 'check'),
  (345967668929, 24, 'เงื่อนไขการรับสถานะ', true, true, NULL, NULL, NULL),
  (345931743991, 25, 'เงื่อนไขการเข้า Tier (6 เดือน)  ', true, false, NULL, NULL, NULL),
  (345931743992, 26, 'RC สะสม', false, false, '24,000', '48,000', '96,000'),
  (345967670979, 27, 'หรือ AUM กองทุนสะสม ', false, false, '240 MB', '480 MB', '960 MB');

insert into privileges_products (id, "order", product, rc_rate) values
  (345967670980, 1, '<span>หุ้นไทย<br>อนุพันธ์<br>หุ้นต่างประเทศ<br>DR<br>กองทุนรวม</span>', 'ทุกค่าธรรมเนียม 25 บาท'),
  (345967670981, 2, '<span>หุ้นกู้ที่มีอนุพันธ์แฝง (Structured Notes) </span>', 'ทุกการลงทุน 2,500 บาท'),
  (345967670982, 3, '<span>หุ้นกู้</span>', 'ทุกการลงทุน 500,000 บาท');

insert into awards (id, "order", title, description, date_label, thumbnail) values
  (345966130904, 1, 'บล.หยวนต้า คว้า 4 รางวัล IAA Best Analyst Awards 2025 สะท้อนศักยภาพทีมวิเคราะห์ชั้นนำของไทย', 'บริษัทหลักทรัพย์ หยวนต้า (ประเทศไทย) จำกัด สร้างผลงานโดดเด่นบนเวทีนักวิเคราะห์ระดับประเทศ ด้วยการคว้า 4 รางวัล จากงาน IAA Best Analyst Awards 2025 จัดโดยสมาคมนักวิเคราะห์การลงทุน (IAA) จากทั้งหมด 16 สาขารางวัล ซึ่งตอกย้ำความแข็งแกร่งของทีมวิเคราะห์ที่ได้รับการยอมรับในวงกว้าง เมื่อวันที่ 20 เมษายน 69 ณ หอประชุมศุกรีย์ แก้วเจริญ อาคารตลาดหลักทรัพย์แห่งประเทศไทย', '20 เมษายน 2569', '{"url": "https://43844850.fs1.hubspotusercontent-na2.net/hubfs/43844850/S_6512662_dfde99e2d1.webp", "width": 1569, "height": 1044, "altText": "S_6512662_dfde99e2d1", "fileId": 345968182007, "type": "image"}'::jsonb),
  (345966130905, 2, 'บริษัทหลักทรัพย์ หยวนต้า (ประเทศไทย) จำกัด ได้รับรางวัล “การสร้างองค์ความรู้อย่างยั่งยืน” (Sustainability Award) จากโครงการ “ตลาดทุนไทยร่วมใจ ส่งพลังความรู้ สู่ประชาชน เฟส 2 ปี 2568”', 'จัดโดยสำนักงานคณะกรรมการกำกับหลักทรัพย์และตลาดหลักทรัพย์ (ก.ล.ต.) หนึ่งในมาตรการสำคัญภายใต้แผนปฏิบัติการด้านการพัฒนาทักษะทางการเงิน พ.ศ. 2565–2570 ของกระทรวงการคลัง ที่มุ่งเสริมสร้างความรู้และภูมิคุ้มกันทางการเงินและการลงทุนแก่ประชาชนในวงกว้าง ทั้งนี้ บล.หยวนต้า ให้ความสำคัญกับการพัฒนาเนื้อหาและรูปแบบการสื่อสารที่กระชับ ชัดเจน และทันสมัย ผ่านช่องทางออนไลน์ภายใต้ Yuanta WOW Channel ซึ่งมีรายการให้ความรู้ด้านการลงทุนมากถึง 8 รายการ ครอบคลุมความสนใจที่หลากหลายของนักลงทุน ปัจจุบันมีผู้ติดตามผ่านเฟซบุ๊กมากกว่า 100,000 คน และผ่านยูทูบมากกว่า 40,000 คน”', '17 ธันวาคม 2568', '{"url": "https://43844850.fs1.hubspotusercontent-na2.net/hubfs/43844850/_bb7f2f27d5.webp", "width": 1788, "height": 1435, "altText": "_bb7f2f27d5", "fileId": 345968199383, "type": "image"}'::jsonb),
  (346005111543, 3, 'Yuanta คว้ารางวัล "Active Agent 2024 จากงาน TFEX Best Award 2024 ตอกย้ำความเป็นผู้นำในตลาดอนุพันธ์ไทย', 'บริษัทหลักทรัพย์ หยวนต้า (ประเทศไทย)  จำกัด คว้ารางวัล "Active Agent" สำหรับบริษัทสมาชิกที่มีปริมาณการซื้อขายอนุพันธ์รวมสูงในส่วนลูกค้าบุคคล จากงานประกาศผลรางวัล TFEX Best Award 2024 จัดขึ้นโดยบริษัท ตลาดสัญญาซื้อขายล่วงหน้า (ประเทศไทย) จำกัด (มหาชน) (TFEX) ซึ่งจัดเป็นประจำทุกปีเพื่อประกาศเกียรติคุณแก่บริษัทสมาชิกที่มีการดำเนินงานโดดเด่นในด้านต่าง ๆ ของตลาดอนุพันธ์ในประเทศไทย', '18 กุมภาพันธ์ 2568', '{"url": "https://43844850.fs1.hubspotusercontent-na2.net/hubfs/43844850/TFEX_Best_Award_2024_3bd145ac2a.webp", "width": 1800, "height": 1200, "altText": "TFEX_Best_Award_2024_3bd145ac2a", "fileId": 345968200424, "type": "image"}'::jsonb);